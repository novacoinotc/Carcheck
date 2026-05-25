import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface RugLien {
  folio?: string;
  garantia_tipo?: string;
  fecha_inscripcion?: string;
  acreedor?: string;
  bien_descripcion?: string;
  vigencia?: string;
}

interface RugParsed {
  data_available: boolean;
  active_liens: number;
  liens: RugLien[];
  search_method: 'vin' | 'plate' | 'multiple';
  raw_html_length?: number;
}

const RUG_URL = 'https://rug.economia.gob.mx/ConsultaPublica/Buscador';

export const rugWorker: ScrapeWorker<RugParsed> = {
  key: 'mx_fed_rug',
  async run(input): Promise<ScrapeResult<RugParsed>> {
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
        errorMessage: 'RUG search is by VIN (numero de serie del bien)',
      };
    }

    try {
      return await withPage<ScrapeResult<RugParsed>>(async (page) => {
        await page.goto(RUG_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

        // RUG public search: select "Bien" tab, fill series number with VIN.
        const seriesInput = page
          .locator('input[name*="erieBien"], input[id*="erieBien"], input[name*="Serie"]')
          .first();
        await seriesInput.waitFor({ state: 'visible', timeout: 10_000 });
        await seriesInput.fill(vin);

        const searchButton = page
          .locator(
            'button:has-text("Buscar"), input[type="submit"][value*="Buscar"], a:has-text("Buscar")',
          )
          .first();
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined),
          searchButton.click({ timeout: 10_000 }),
        ]);
        await page.waitForTimeout(1500);

        const bodyText = await page.locator('body').innerText({ timeout: 10_000 });

        if (
          bodyText.toLowerCase().includes('sin resultados') ||
          bodyText.toLowerCase().includes('no se encontraron')
        ) {
          return {
            status: 'success',
            parsedData: {
              data_available: true,
              active_liens: 0,
              liens: [],
              search_method: 'vin',
            },
            normalizedFacts: [
              { key: 'active_liens', value: 0, confidence: 100 },
              { key: 'rug_searched', value: true, confidence: 100 },
            ],
            costUsd: 0.02,
          };
        }

        const rows = await page.locator('table tbody tr, .resultado-fila').all();
        const liens: RugLien[] = [];
        for (const row of rows.slice(0, 30)) {
          const cells = await row.locator('td').all();
          if (cells.length === 0) continue;
          const cellTexts = await Promise.all(cells.map((c) => c.innerText().catch(() => '')));
          if (cellTexts.every((t) => !t.trim())) continue;
          liens.push({
            folio: cellTexts[0]?.trim(),
            garantia_tipo: cellTexts[1]?.trim(),
            fecha_inscripcion: cellTexts[2]?.trim(),
            acreedor: cellTexts[3]?.trim(),
            bien_descripcion: cellTexts[4]?.trim(),
            vigencia: cellTexts[5]?.trim(),
          });
        }

        return {
          status: 'success',
          parsedData: {
            data_available: true,
            active_liens: liens.length,
            liens,
            search_method: 'vin',
            raw_html_length: bodyText.length,
          },
          normalizedFacts: [
            { key: 'active_liens', value: liens.length, confidence: 95 },
            { key: 'rug_searched', value: true, confidence: 100 },
          ],
          costUsd: 0.02,
        };
      });
    } catch (err) {
      logger.error({ err }, 'rug: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
