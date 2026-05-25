import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface AmdaParsed {
  data_available: boolean;
  invoice_authentic: boolean;
  folio?: string;
  dealer?: string;
  invoice_date?: string;
  vehicle_description?: string;
  notes?: string;
  raw_text?: string;
}

const AMDA_URL = 'https://www.amda.mx/factura-amda/';

export const amdaWorker: ScrapeWorker<AmdaParsed> = {
  key: 'mx_fed_amda',
  async run(input): Promise<ScrapeResult<AmdaParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    // AMDA papel seguridad is verified by the security folio / QR code printed on
    // the dealer invoice, not by VIN/plate. The orchestrator passes it via extras.
    const extras = parsed.data as { folio?: string; qr?: string };
    const folio = extras.folio ?? extras.qr;
    if (!folio) {
      return {
        status: 'not_applicable',
        errorCode: 'folio_required',
        errorMessage: 'AMDA invoice verification needs the security folio / QR code',
      };
    }

    try {
      return await withPage<ScrapeResult<AmdaParsed>>(
        async (page) => {
          await page.goto(AMDA_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

          const frame =
            page.frames().find((f) => /amda|factura|verifica/i.test(f.url())) ?? page.mainFrame();

          const folioInput = frame
            .locator(
              'input[name*="folio" i], input[id*="folio" i], input[name*="qr" i], input[type="search"], input[type="text"]',
            )
            .first();
          await folioInput.waitFor({ state: 'visible', timeout: 15_000 });
          await folioInput.fill(folio);

          const submit = frame
            .locator(
              'button:has-text("Verificar"), button:has-text("Consultar"), button:has-text("Buscar"), input[type="submit"]',
            )
            .first();
          await Promise.all([
            frame.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined),
            submit.click({ timeout: 10_000 }).catch(() => undefined),
          ]);
          await page.waitForTimeout(2500);

          const bodyText = await frame.locator('body').innerText({ timeout: 10_000 });
          const lower = bodyText.toLowerCase();

          const invalid =
            lower.includes('no se encontr') ||
            lower.includes('no válid') ||
            lower.includes('no valid') ||
            lower.includes('inválid') ||
            lower.includes('sin resultados') ||
            lower.includes('no existe');
          const valid =
            lower.includes('válid') ||
            lower.includes('auténtic') ||
            lower.includes('vigente') ||
            lower.includes('correcto');

          const authentic = valid && !invalid;

          const dealer = /distribuidor[^\n]*?:\s*([^\n\r]+)/i.exec(bodyText)?.[1]?.trim();
          const invoice_date = /fecha[^\n]*?:\s*(\d{2}\/\d{2}\/\d{4})/i.exec(bodyText)?.[1];
          const vehicle_description = /(?:veh[íi]culo|descripci[óo]n)[^\n]*?:\s*([^\n\r]+)/i
            .exec(bodyText)?.[1]
            ?.trim();

          return {
            status: invalid || valid ? 'success' : 'partial',
            parsedData: {
              data_available: true,
              invoice_authentic: authentic,
              folio,
              dealer,
              invoice_date,
              vehicle_description,
              notes: invalid ? 'Folio no encontrado o inválido' : undefined,
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'amda_invoice_authentic', value: authentic, confidence: valid || invalid ? 85 : 40 },
              { key: 'amda_folio', value: folio, confidence: 100 },
            ],
            costUsd: 0,
          };
        },
        { proxy: 'always' },
      );
    } catch (err) {
      logger.error({ err }, 'amda: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
