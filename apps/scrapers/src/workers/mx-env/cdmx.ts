import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface VerificationRecord {
  fecha?: string;
  holograma?: string;
  resultado?: string;
  odometro?: number;
  verificentro?: string;
  semestre?: string;
}

interface CdmxVerifParsed {
  data_available: boolean;
  verificacion_count: number;
  last_holograma?: string;
  last_verif_date?: string;
  odometer_readings: number[];
  records: VerificationRecord[];
  search_method: 'plate';
  raw_text?: string;
}

const CDMX_VERIF_URL = 'http://smahologramas.dsinet.com.mx/ConsultaVerificaciones/';

function parseOdometer(text: string): number | undefined {
  const m = /(\d[\d,\.]{2,})\s*(?:km|kms|kilómetros)?/i.exec(text.replace(/\s+/g, ' '));
  if (!m || !m[1]) return undefined;
  const n = Number(m[1].replace(/[,\.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const cdmxVerificentrosWorker: ScrapeWorker<CdmxVerifParsed> = {
  key: 'mx_env_cdmx_verificentros',
  async run(input): Promise<ScrapeResult<CdmxVerifParsed>> {
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
        errorMessage: 'CDMX verificentros consulta is by plate',
      };
    }

    try {
      return await withPage<ScrapeResult<CdmxVerifParsed>>(
        async (page) => {
          await page.goto(CDMX_VERIF_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

          const plateInput = page
            .locator(
              'input[name*="placa" i], input[id*="placa" i], input[name*="Placa"], input[type="text"]',
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

          if (
            lower.includes('no se encontr') ||
            lower.includes('sin resultados') ||
            lower.includes('no existe')
          ) {
            return {
              status: 'success',
              parsedData: {
                data_available: true,
                verificacion_count: 0,
                odometer_readings: [],
                records: [],
                search_method: 'plate',
              },
              normalizedFacts: [
                { key: 'verificacion_count', value: 0, confidence: 90 },
                { key: 'odometer_readings', value: [], confidence: 90 },
              ],
              costUsd: 0,
            };
          }

          const rows = await page.locator('table tbody tr, table tr').all();
          const records: VerificationRecord[] = [];
          for (const row of rows.slice(0, 60)) {
            const cells = await row.locator('td').all();
            if (cells.length === 0) continue;
            const cellTexts = await Promise.all(cells.map((c) => c.innerText().catch(() => '')));
            const trimmed = cellTexts.map((t) => t.trim());
            if (trimmed.every((t) => !t)) continue;

            const fecha = trimmed.find((t) => /\d{2}\/\d{2}\/\d{4}/.test(t));
            const holograma = trimmed.find((t) => /^(00|0|1|2|exent|rechaz)/i.test(t));
            const odoCell = trimmed.find((t) => /\d{4,}/.test(t.replace(/[,\.]/g, '')));
            const odometro = odoCell ? parseOdometer(odoCell) : undefined;

            records.push({
              fecha,
              holograma,
              resultado: trimmed.find((t) => /aprob|rechaz|exent|no presentad/i.test(t)),
              odometro,
              verificentro: trimmed.find((t) => /verificentro|centro/i.test(t)),
              semestre: trimmed.find((t) => /semestre|\d{4}-[12]/i.test(t)),
            });
          }

          const odometer_readings = records
            .map((r) => r.odometro)
            .filter((n): n is number => typeof n === 'number');

          const last = records[records.length - 1];

          return {
            status: 'success',
            parsedData: {
              data_available: true,
              verificacion_count: records.length,
              last_holograma: last?.holograma,
              last_verif_date: last?.fecha,
              odometer_readings,
              records,
              search_method: 'plate',
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'verificacion_count', value: records.length, confidence: 90 },
              { key: 'last_holograma', value: last?.holograma, confidence: 80 },
              { key: 'last_verif_date', value: last?.fecha, confidence: 80 },
              { key: 'odometer_readings', value: odometer_readings, confidence: 75 },
            ],
            costUsd: 0,
          };
        },
        { proxy: 'always' },
      );
    } catch (err) {
      logger.error({ err }, 'cdmx-verificentros: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
