import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface AnamRegularizacionParsed {
  data_available: boolean;
  regularization_found: boolean;
  niv?: string;
  regularization_folio?: string;
  regularization_date?: string;
  decree?: string;
  notes?: string;
  raw_text?: string;
}

const ANAM_REG_URL =
  'https://www.anam.gob.mx/importaciones-definitivas-de-automoviles-usados-regularizacion/';

export const anamRegularizacionWorker: ScrapeWorker<AnamRegularizacionParsed> = {
  key: 'mx_aduana_anam_regularizacion',
  async run(input): Promise<ScrapeResult<AnamRegularizacionParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const query = parsed.data;
    const vin = query.vin;
    if (!vin) {
      return {
        status: 'not_applicable',
        errorCode: 'vin_required',
        errorMessage: 'ANAM regularización consulta requires the VIN (NIV)',
      };
    }

    try {
      return await withPage<ScrapeResult<AnamRegularizacionParsed>>(
        async (page) => {
          await page.goto(ANAM_REG_URL, { waitUntil: 'commit', timeout: 45_000 });
          await page.waitForTimeout(4000);

          // The regularización widget is typically an embedded iframe.
          const frame =
            page.frames().find((f) => /soia|anam|regulariz/i.test(f.url())) ?? page.mainFrame();

          const nivInput = frame
            .locator(
              'input[name*="niv" i], input[id*="niv" i], input[name*="serie" i], input[placeholder*="NIV" i], input[placeholder*="serie" i]',
            )
            .first();
          await nivInput.waitFor({ state: 'visible', timeout: 15_000 });
          await nivInput.fill(vin);

          const submit = frame
            .locator(
              'button:has-text("Consultar"), button:has-text("Buscar"), input[type="submit"]',
            )
            .first();
          await Promise.all([
            frame.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined),
            submit.click({ timeout: 10_000 }).catch(() => undefined),
          ]);
          await page.waitForTimeout(2500);

          const bodyText = await frame.locator('body').innerText({ timeout: 10_000 });
          const lower = bodyText.toLowerCase();

          const notFound =
            lower.includes('no se encontr') ||
            lower.includes('sin información') ||
            lower.includes('sin resultados') ||
            lower.includes('no existe');

          if (notFound) {
            return {
              status: 'success',
              parsedData: {
                data_available: true,
                regularization_found: false,
                niv: vin,
                notes: 'No se encontró folio de regularización para este VIN',
                raw_text: bodyText.slice(0, 4000),
              },
              normalizedFacts: [
                { key: 'regularization_found', value: false, confidence: 90 },
                { key: 'anam_regularizacion_searched', value: true, confidence: 100 },
              ],
              costUsd: 0,
            };
          }

          const regularization_folio =
            /folio[^\n]*?:\s*([A-Z0-9-]+)/i.exec(bodyText)?.[1] ??
            /regulariz[^\n]*?:\s*([A-Z0-9-]+)/i.exec(bodyText)?.[1];
          const regularization_date = /fecha[^\n]*?:\s*(\d{2}\/\d{2}\/\d{4})/i.exec(bodyText)?.[1];
          const decree = /(?:decreto)[^\n]*?:?\s*([^\n\r]+)/i.exec(bodyText)?.[1]?.trim();

          const found = Boolean(regularization_folio);

          return {
            status: 'success',
            parsedData: {
              data_available: true,
              regularization_found: found,
              niv: vin,
              regularization_folio,
              regularization_date,
              decree,
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'regularization_found', value: found, confidence: 90 },
              { key: 'regularization_folio', value: regularization_folio, confidence: 85 },
            ],
            costUsd: 0,
          };
        },
        { proxy: 'off' },
      );
    } catch (err) {
      logger.error({ err }, 'anam-regularizacion: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
