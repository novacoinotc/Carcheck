import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface TheftParsed {
  data_available: boolean;
  theft_report_found: boolean;
  theft_status: 'reported_stolen' | 'no_report' | 'unknown';
  search_method: 'vin' | 'plate';
  matched_text?: string;
  raw_text?: string;
}

const FGJEM_URL = 'http://fgjem.edomex.gob.mx/reporte-robo';

const STOLEN_TOKENS = [
  'robado',
  'reportado como robo',
  'con reporte de robo',
  'vehículo robado',
];
const CLEAN_TOKENS = [
  'no se encontr',
  'sin reporte',
  'no cuenta con reporte',
  'no existe registro',
  'sin resultados',
];

export const fgjemWorker: ScrapeWorker<TheftParsed> = {
  key: 'mx_judicial_fgjem',
  async run(input): Promise<ScrapeResult<TheftParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const query = parsed.data;
    const term = query.plate ?? query.vin;
    if (!term) {
      return {
        status: 'not_applicable',
        errorCode: 'plate_or_vin_required',
        errorMessage: 'FGJEM theft search requires plate or VIN',
      };
    }
    const method: 'vin' | 'plate' = query.plate ? 'plate' : 'vin';

    try {
      return await withPage<ScrapeResult<TheftParsed>>(
        async (page) => {
          await page.goto(FGJEM_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

          const searchInput = page
            .locator(
              'input[name*="placa" i], input[id*="placa" i], input[name*="serie" i], input[name*="busqueda" i], input[type="text"]',
            )
            .first();
          await searchInput.waitFor({ state: 'visible', timeout: 12_000 });
          await searchInput.fill(term);

          const submit = page
            .locator(
              'button:has-text("Buscar"), button:has-text("Consultar"), input[type="submit"], a:has-text("Buscar")',
            )
            .first();
          await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined),
            submit.click({ timeout: 10_000 }).catch(() => undefined),
          ]);
          await page.waitForTimeout(2000);

          const bodyText = await page.locator('body').innerText({ timeout: 10_000 });
          const lower = bodyText.toLowerCase();

          const stolenHit = STOLEN_TOKENS.find((t) => lower.includes(t));
          const cleanHit = CLEAN_TOKENS.find((t) => lower.includes(t));

          let theftStatus: TheftParsed['theft_status'] = 'unknown';
          if (stolenHit) theftStatus = 'reported_stolen';
          else if (cleanHit) theftStatus = 'no_report';

          const found = theftStatus === 'reported_stolen';

          return {
            status: theftStatus === 'unknown' ? 'partial' : 'success',
            parsedData: {
              data_available: true,
              theft_report_found: found,
              theft_status: theftStatus,
              search_method: method,
              matched_text: stolenHit ?? cleanHit,
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'theft_report_state', value: found, confidence: theftStatus === 'unknown' ? 40 : 90 },
              { key: 'theft_status', value: theftStatus, confidence: theftStatus === 'unknown' ? 40 : 90 },
            ],
            costUsd: 0,
          };
        },
        { proxy: 'always' },
      );
    } catch (err) {
      logger.error({ err }, 'fgjem: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
