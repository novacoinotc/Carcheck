import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface DobleCeroParsed {
  data_available: boolean;
  doble_cero_found: boolean;
  last_holograma?: string;
  last_verif_date?: string;
  search_method: 'plate';
  matched_text?: string;
  raw_text?: string;
}

const DOBLE_CERO_URL = 'https://verificacionvehicular.sedema.cdmx.gob.mx/Listado/';

export const dobleCeroWorker: ScrapeWorker<DobleCeroParsed> = {
  key: 'mx_env_cdmx_doble_cero',
  async run(input): Promise<ScrapeResult<DobleCeroParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const query = parsed.data;
    const plate = query.plate;
    if (!plate) {
      return {
        status: 'not_applicable',
        errorCode: 'plate_required',
        errorMessage: 'CDMX holograma doble cero listado is by plate',
      };
    }

    try {
      return await withPage<ScrapeResult<DobleCeroParsed>>(
        async (page) => {
          await page.goto(DOBLE_CERO_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

          const plateInput = page
            .locator(
              'input[name*="placa" i], input[id*="placa" i], input[name*="Placa"], input[type="search"], input[type="text"]',
            )
            .first();
          await plateInput.waitFor({ state: 'visible', timeout: 12_000 });
          await plateInput.fill(plate);

          const submit = page
            .locator(
              'button:has-text("Consultar"), button:has-text("Buscar"), input[type="submit"], a:has-text("Consultar")',
            )
            .first();
          await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined),
            submit.click({ timeout: 10_000 }).catch(() => undefined),
          ]);
          await page.waitForTimeout(2000);

          const bodyText = await page.locator('body').innerText({ timeout: 10_000 });
          const lower = bodyText.toLowerCase();

          const notFound =
            lower.includes('no se encontr') ||
            lower.includes('sin resultados') ||
            lower.includes('no existe') ||
            lower.includes('no aparece');

          // The listado only contains vehicles that earned the holograma 00.
          // Presence of the plate (and not a "not found" message) implies doble cero.
          const plateMatch = bodyText.includes(plate.toUpperCase()) || bodyText.includes(plate);
          const found = plateMatch && !notFound;

          return {
            status: 'success',
            parsedData: {
              data_available: true,
              doble_cero_found: found,
              last_holograma: found ? '00' : undefined,
              last_verif_date: /\b(\d{2}\/\d{2}\/\d{4})\b/.exec(bodyText)?.[1],
              search_method: 'plate',
              matched_text: found ? plate : undefined,
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'doble_cero_found', value: found, confidence: found ? 85 : 70 },
              { key: 'last_holograma', value: found ? '00' : undefined, confidence: found ? 85 : 0 },
            ],
            costUsd: 0,
          };
        },
        { proxy: 'always' },
      );
    } catch (err) {
      logger.error({ err }, 'doble-cero: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
