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
  plate?: string;
  niv?: string;
  origin?: 'nacional' | 'importado' | 'desconocido';
  pediment_folio?: string;
  has_chip_holograma?: boolean;
  raw_text?: string;
}

const REPUVE_URL = 'https://www2.repuve.gob.mx:8443/ciudadania/';

function parseRoboStatus(text: string): RepuveParsed['robo_status'] {
  const lower = text.toLowerCase();
  if (lower.includes('sin reporte de robo') || lower.includes('no reportado')) return 'sin_reporte';
  if (lower.includes('robo vigente') || lower.includes('reporte de robo vigente')) return 'vigente';
  if (lower.includes('recuperado')) return 'recuperado';
  return 'desconocido';
}

function pick(text: string, label: string): string | undefined {
  const re = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*([^\\n\\r]+)`, 'i');
  return re.exec(text)?.[1]?.trim();
}

/**
 * REPUVE consulta ciudadana. The site is a JS SPA: inputs have no name/id (select by
 * placeholder), reCAPTCHA v2 has a dynamic textarea id, results render in-page.
 * Selectors verified live via /inspect (2026-05-25).
 */
export const repuveWorker: ScrapeWorker<RepuveParsed> = {
  key: 'mx_fed_repuve',
  async run(input): Promise<ScrapeResult<RepuveParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const vinValue = parsed.data.vin;
    const plateValue = parsed.data.plate;
    if (!vinValue && !plateValue) {
      return { status: 'failed', errorCode: 'missing_query', errorMessage: 'vin or plate required' };
    }
    const queryKind: 'vin' | 'plate' = vinValue ? 'vin' : 'plate';

    if (!process.env.TWOCAPTCHA_API_KEY) {
      return {
        status: 'skipped',
        errorCode: 'captcha_unconfigured',
        errorMessage: 'REPUVE requires TWOCAPTCHA_API_KEY',
      };
    }

    try {
      return await withPage<ScrapeResult<RepuveParsed>>(
        async (page) => {
          await page.goto(REPUVE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
          await page.waitForTimeout(2000);

          // Fill the right field by placeholder (inputs have no name/id).
          const placeholder =
            queryKind === 'vin' ? 'Ingresa tu número de serie' : 'Ingresa tu placa';
          const field = page.locator(`input[placeholder="${placeholder}"]`).first();
          await field.waitFor({ state: 'visible', timeout: 10_000 });
          await field.fill(queryKind === 'vin' ? vinValue! : plateValue!);

          // Wait for the reCAPTCHA iframe to actually render before reading the sitekey
          // (it loads async — reading too early gives an empty/stale key = flaky solves).
          await page
            .locator('iframe[src*="recaptcha"]')
            .first()
            .waitFor({ state: 'attached', timeout: 15_000 })
            .catch(() => undefined);
          const siteKey = await page.evaluate(() => {
            const ifr = document.querySelector('iframe[src*="recaptcha"]') as HTMLIFrameElement | null;
            if (ifr) {
              const m = /[?&]k=([^&]+)/.exec(ifr.src);
              if (m) return m[1];
            }
            const el = document.querySelector('[data-sitekey]');
            return el?.getAttribute('data-sitekey') ?? null;
          });
          if (!siteKey) {
            return {
              status: 'failed' as const,
              errorCode: 'no_sitekey',
              errorMessage: 'Could not extract reCAPTCHA site key',
            };
          }

          // reCAPTCHA solves are flaky (token expiry/timing). Retry up to 3 times:
          // solve → inject token + invoke callback → submit → check for rejection.
          const MAX_ATTEMPTS = 3;
          let bodyText = '';
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            logger.info({ queryKind, attempt }, 'repuve: solving recaptcha');
            const token = await solveReCaptchaV2({ siteKey, pageUrl: REPUVE_URL });
            await page.evaluate((t) => {
              document.querySelectorAll('textarea[name="g-recaptcha-response"]').forEach((el) => {
                const ta = el as HTMLTextAreaElement;
                ta.value = t;
                ta.dispatchEvent(new Event('change', { bubbles: true }));
              });
              try {
                const cfg = (window as unknown as { ___grecaptcha_cfg?: { clients?: Record<string, unknown> } })
                  .___grecaptcha_cfg;
                if (cfg?.clients) {
                  for (const client of Object.values(cfg.clients)) {
                    for (const val of Object.values(client as Record<string, unknown>)) {
                      if (val && typeof val === 'object') {
                        for (const maybe of Object.values(val as Record<string, unknown>)) {
                          const cb = (maybe as { callback?: unknown })?.callback;
                          if (typeof cb === 'function') {
                            (cb as (tok: string) => void)(t);
                          }
                        }
                      }
                    }
                  }
                }
              } catch {
                /* best-effort callback invocation */
              }
            }, token);
            await page.waitForTimeout(500);

            await page
              .getByRole('button', { name: /buscar/i })
              .first()
              .click({ timeout: 10_000 })
              .catch(() => undefined);
            await page.waitForTimeout(4500);

            bodyText = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
            if (!bodyText.toLowerCase().includes('recaptcha no fue superado')) {
              break; // accepted
            }
            logger.warn({ attempt }, 'repuve: recaptcha rejected, retrying');
          }

          const lower = bodyText.toLowerCase();

          // A real hit shows vehicle data ("Marca", "Estatus"...). If the page still
          // shows the search prompt or an explicit not-found, there's no result.
          const hasResult =
            /marca\s*:/i.test(bodyText) ||
            /estatus\s*:/i.test(bodyText) ||
            lower.includes('sin reporte de robo') ||
            lower.includes('robo vigente');
          const notFound =
            !hasResult ||
            lower.includes('no se encontr') ||
            lower.includes('sin información') ||
            lower.includes('no existe');

          if (notFound) {
            return {
              status: 'success' as const,
              parsedData: {
                query_kind: queryKind,
                found: false,
                robo_status: 'desconocido' as const,
                raw_text: bodyText.slice(0, 3000),
              },
              normalizedFacts: [{ key: 'repuve_found', value: false, confidence: 100 }],
              costUsd: 0.06,
            };
          }

          const out: RepuveParsed = {
            query_kind: queryKind,
            found: true,
            robo_status: parseRoboStatus(bodyText),
            brand: pick(bodyText, 'Marca'),
            submark: pick(bodyText, 'Submarca'),
            model: pick(bodyText, 'Modelo'),
            year: (() => {
              const y = pick(bodyText, 'Año');
              const n = y ? parseInt(y, 10) : NaN;
              return Number.isFinite(n) ? n : undefined;
            })(),
            color: pick(bodyText, 'Color'),
            plate: pick(bodyText, 'Placa'),
            niv: pick(bodyText, 'Número de Serie') ?? pick(bodyText, 'NIV'),
            pediment_folio: pick(bodyText, 'Pedimento'),
            has_chip_holograma: lower.includes('constancia') || lower.includes('holograma'),
            raw_text: bodyText.slice(0, 3000),
          };
          out.origin = out.pediment_folio ? 'importado' : 'nacional';

          return {
            status: 'success' as const,
            parsedData: out,
            normalizedFacts: [
              { key: 'repuve_found', value: true, confidence: 100 },
              { key: 'robo_status', value: out.robo_status, confidence: 100 },
              { key: 'brand', value: out.brand, confidence: 90 },
              { key: 'year', value: out.year, confidence: 90 },
              { key: 'origin', value: out.origin, confidence: 85 },
              { key: 'pediment_present', value: Boolean(out.pediment_folio), confidence: 90 },
            ],
            costUsd: 0.06,
          };
        },
        // REPUVE loads fast on a direct connection but times out through datacenter
        // proxies — verified live. Force direct.
        { proxy: 'off' },
      );
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
