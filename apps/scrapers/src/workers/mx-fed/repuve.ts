import { withPage } from '../../lib/browser-pool';
import { solveReCaptchaV2 } from '../../lib/captcha';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface RepuveParsed {
  query_kind: 'vin' | 'plate';
  found: boolean;
  robo_status: 'sin_reporte' | 'vigente' | 'recuperado' | 'desconocido';
  brand?: string;
  submark?: string;
  model?: string;
  year?: number;
  color?: string;
  type?: string;
  plate?: string;
  niv?: string;
  origin?: 'nacional' | 'importado' | 'desconocido';
  pediment_folio?: string;
  pediment_customs?: string;
  pediment_date?: string;
  emplacamiento_institucion?: string;
  emplacamiento_fecha?: string;
  has_chip_holograma?: boolean;
  raw_text?: string;
}

const REPUVE_URL = 'https://www2.repuve.gob.mx:8443/ciudadania/';
const RECAPTCHA_SITE_KEY = '6LeMnv0SAAAAANqDsXdEYpswzg7HRZN3prgflMfx';

function pickField(text: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}\\s*:?\\s*([^\\n\\r]+)`, 'i');
  return re.exec(text)?.[1]?.trim();
}

function parseRoboStatus(text: string): RepuveParsed['robo_status'] {
  const lower = text.toLowerCase();
  if (lower.includes('sin reporte de robo')) return 'sin_reporte';
  if (lower.includes('reporte de robo vigente') || lower.includes('robo vigente'))
    return 'vigente';
  if (lower.includes('recuperado')) return 'recuperado';
  if (lower.includes('no se encontr')) return 'desconocido';
  return 'desconocido';
}

export const repuveWorker: ScrapeWorker<RepuveParsed> = {
  key: 'mx_fed_repuve',
  async run(input): Promise<ScrapeResult<RepuveParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }

    const query = parsed.data;
    const vinValue = query.vin;
    const plateValue = query.plate;
    if (!vinValue && !plateValue) {
      return { status: 'failed', errorCode: 'missing_query', errorMessage: 'vin or plate required' };
    }
    const queryKind: 'vin' | 'plate' = vinValue ? 'vin' : 'plate';
    const captchaConfigured = Boolean(process.env.TWOCAPTCHA_API_KEY);

    try {
      const result = await withPage<ScrapeResult<RepuveParsed>>(async (page) => {
        await page.goto(REPUVE_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

        // The site uses tabs for "Por NIV" vs "Por Placa".
        const tabSelector = queryKind === 'vin' ? 'a[href="#niv"]' : 'a[href="#placa"]';
        await page.locator(tabSelector).first().click({ timeout: 10_000 }).catch(() => undefined);
        await page.waitForTimeout(300);

        const inputSelector = queryKind === 'vin' ? '#niv' : '#placa';
        await page.locator(inputSelector).fill(queryKind === 'vin' ? vinValue! : plateValue!);

        if (!captchaConfigured) {
          return {
            status: 'skipped' as const,
            errorCode: 'captcha_unconfigured',
            errorMessage: 'REPUVE requires TWOCAPTCHA_API_KEY for production runs',
          };
        }

        logger.info({ queryKind }, 'repuve: solving recaptcha');
        const token = await solveReCaptchaV2({
          siteKey: RECAPTCHA_SITE_KEY,
          pageUrl: REPUVE_URL,
        });

        await page.evaluate((t) => {
          const el = document.getElementById('g-recaptcha-response');
          if (el) {
            (el as HTMLTextAreaElement).value = t;
            (el as HTMLTextAreaElement).style.display = 'block';
          }
        }, token);

        const submitSelector =
          queryKind === 'vin' ? 'button[onclick*="consultaNiv"]' : 'button[onclick*="consultaPlaca"]';
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined),
          page.locator(submitSelector).first().click({ timeout: 10_000 }),
        ]);
        await page.waitForTimeout(2000);

        const bodyText = await page.locator('body').innerText({ timeout: 10_000 });

        if (
          bodyText.toLowerCase().includes('no se encontr') ||
          bodyText.toLowerCase().includes('sin información')
        ) {
          return {
            status: 'success' as const,
            parsedData: {
              query_kind: queryKind,
              found: false,
              robo_status: 'desconocido' as const,
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [{ key: 'repuve_found', value: false, confidence: 100 }],
            costUsd: 0.05,
          };
        }

        const parsedOut: RepuveParsed = {
          query_kind: queryKind,
          found: true,
          robo_status: parseRoboStatus(bodyText),
          brand: pickField(bodyText, 'Marca'),
          submark: pickField(bodyText, 'Submarca') ?? pickField(bodyText, 'Sub-Marca'),
          model: pickField(bodyText, 'Modelo'),
          year: (() => {
            const y = pickField(bodyText, 'Año');
            const n = y ? parseInt(y, 10) : NaN;
            return Number.isFinite(n) ? n : undefined;
          })(),
          color: pickField(bodyText, 'Color'),
          type: pickField(bodyText, 'Tipo'),
          plate: pickField(bodyText, 'Placa'),
          niv: pickField(bodyText, 'NIV'),
          pediment_folio: pickField(bodyText, 'Folio Pedimento') ?? pickField(bodyText, 'Pedimento'),
          pediment_customs: pickField(bodyText, 'Aduana de entrada') ?? pickField(bodyText, 'Aduana'),
          pediment_date: pickField(bodyText, 'Fecha de pedimento'),
          emplacamiento_institucion: pickField(bodyText, 'Institución emplacadora'),
          emplacamiento_fecha: pickField(bodyText, 'Fecha de emplacamiento'),
          has_chip_holograma:
            bodyText.toLowerCase().includes('chip') || bodyText.toLowerCase().includes('holograma'),
          raw_text: bodyText.slice(0, 4000),
        };
        parsedOut.origin = parsedOut.pediment_folio ? 'importado' : 'nacional';

        return {
          status: 'success' as const,
          parsedData: parsedOut,
          normalizedFacts: [
            { key: 'repuve_found', value: true, confidence: 100 },
            { key: 'robo_status', value: parsedOut.robo_status, confidence: 100 },
            { key: 'brand', value: parsedOut.brand, confidence: 100 },
            { key: 'submark', value: parsedOut.submark, confidence: 100 },
            { key: 'year', value: parsedOut.year, confidence: 100 },
            { key: 'origin', value: parsedOut.origin, confidence: 90 },
            { key: 'pediment_present', value: Boolean(parsedOut.pediment_folio), confidence: 100 },
            {
              key: 'emplacamiento_estado',
              value: parsedOut.emplacamiento_institucion,
              confidence: 90,
            },
          ],
          costUsd: 0.06,
        };
      });

      return result;
    } catch (err) {
      logger.error({ err }, 'repuve: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
