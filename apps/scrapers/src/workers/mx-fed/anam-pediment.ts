import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface AnamPedimentParsed {
  data_available: boolean;
  pediment_found: boolean;
  niv?: string;
  pediment_folio?: string;
  pediment_date?: string;
  pediment_customs?: string;
  pediment_clave?: string;
  importer?: string;
  regularization_decree?: string;
  notes?: string;
  raw_text?: string;
}

const ANAM_URL =
  'https://www.anam.gob.mx/consulta-rapida-de-pedimentos-de-vehiculos-y-contenedores/';

export const anamPedimentWorker: ScrapeWorker<AnamPedimentParsed> = {
  key: 'mx_aduana_anam_quick',
  async run(input): Promise<ScrapeResult<AnamPedimentParsed>> {
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
        errorMessage: 'ANAM consulta requires the VIN (NIV)',
      };
    }

    try {
      return await withPage<ScrapeResult<AnamPedimentParsed>>(async (page) => {
        await page.goto(ANAM_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

        // ANAM widget is an iframe; navigate inside if present.
        const frame = page.frames().find((f) => /soia|anam/i.test(f.url())) ?? page.mainFrame();

        const nivInput = frame
          .locator('input[name*="niv" i], input[id*="niv" i], input[placeholder*="NIV" i]')
          .first();
        await nivInput.waitFor({ state: 'visible', timeout: 15_000 });
        await nivInput.fill(vin);

        // Some flows require the year of the operation; default to current year if asked.
        const yearInput = frame.locator('input[name*="anio" i], input[id*="anio" i]').first();
        if (await yearInput.count().catch(() => 0)) {
          await yearInput.fill(String(new Date().getFullYear()));
        }

        const submit = frame
          .locator('button:has-text("Consultar"), input[type="submit"], button:has-text("Buscar")')
          .first();
        await Promise.all([
          frame.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined),
          submit.click({ timeout: 10_000 }),
        ]);
        await page.waitForTimeout(2500);

        const bodyText = await frame.locator('body').innerText({ timeout: 10_000 });
        const lower = bodyText.toLowerCase();

        const notFound =
          lower.includes('no se encontr') ||
          lower.includes('sin información') ||
          lower.includes('sin resultados');

        if (notFound) {
          return {
            status: 'success',
            parsedData: {
              data_available: true,
              pediment_found: false,
              niv: vin,
              notes: 'No se encontró pediment de importación para este VIN',
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'pediment_present', value: false, confidence: 95 },
              { key: 'anam_searched', value: true, confidence: 100 },
            ],
            costUsd: 0,
          };
        }

        const pediment_folio =
          /pedimento[^\n]*?:\s*([A-Z0-9-]+)/i.exec(bodyText)?.[1] ??
          /folio[^\n]*?:\s*([A-Z0-9-]+)/i.exec(bodyText)?.[1];
        const pediment_date = /fecha[^\n]*?:\s*(\d{2}\/\d{2}\/\d{4})/i.exec(bodyText)?.[1];
        const pediment_customs = /aduana[^\n]*?:\s*([^\n\r]+)/i.exec(bodyText)?.[1]?.trim();
        const pediment_clave = /clave[^\n]*?:\s*([A-Z0-9-]+)/i.exec(bodyText)?.[1];
        const importer = /importador[^\n]*?:\s*([^\n\r]+)/i.exec(bodyText)?.[1]?.trim();
        const regularization_decree = /(?:decreto|regulariz)[^\n]*?:?\s*([^\n\r]+)/i
          .exec(bodyText)?.[1]
          ?.trim();

        return {
          status: 'success',
          parsedData: {
            data_available: true,
            pediment_found: Boolean(pediment_folio),
            niv: query.vin,
            pediment_folio,
            pediment_date,
            pediment_customs,
            pediment_clave,
            importer,
            regularization_decree,
            raw_text: bodyText.slice(0, 4000),
          },
          normalizedFacts: [
            { key: 'pediment_present', value: Boolean(pediment_folio), confidence: 100 },
            { key: 'pediment_folio', value: pediment_folio, confidence: 95 },
            { key: 'pediment_customs', value: pediment_customs, confidence: 90 },
            { key: 'regularization_decree', value: regularization_decree, confidence: 80 },
          ],
          costUsd: 0,
        };
      }, { proxy: 'residential' });
    } catch (err) {
      logger.error({ err }, 'anam-pediment: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
