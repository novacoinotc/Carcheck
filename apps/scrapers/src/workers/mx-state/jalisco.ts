import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { solveReCaptchaV2 } from '../../lib/captcha';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';
import { parseStateBody, type MxStateParsed, type MxStateConfig } from './_shared';

/**
 * Jalisco — Servicios Vehiculares / Adeudos. The real consultation form (not the
 * SFP landing) is at gobiernoenlinea1. Fields: placa + numeroSerie (≥ last 5 of
 * VIN), optional nombrePropietario/numeroMotor. Protected by an INVISIBLE
 * reCAPTCHA v2 — solved via 2captcha and injected + callback-invoked.
 */
const JAL_URL = 'https://gobiernoenlinea1.jalisco.gob.mx/serviciosVehiculares/adeudos';
const JAL_SITEKEY = '6LehxCgfAAAAAE_6lvOTiXBtQNZCyc37CLZssnzC';
const CFG: MxStateConfig = { key: 'mx_st_jal_control_vehicular', stateCode: 'JAL', url: JAL_URL };

export const jaliscoWorker: ScrapeWorker<MxStateParsed> = {
  key: 'mx_st_jal_control_vehicular',
  async run(input): Promise<ScrapeResult<MxStateParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const plate = parsed.data.plate?.trim();
    const vin = parsed.data.vin?.trim();
    if (!plate) {
      return { status: 'not_applicable', errorCode: 'plate_required', errorMessage: 'Jalisco requires a plate' };
    }
    if (!vin) {
      return { status: 'not_applicable', errorCode: 'vin_required', errorMessage: 'Jalisco requires the last 5 of the VIN' };
    }
    if (!process.env.TWOCAPTCHA_API_KEY) {
      return { status: 'skipped', errorCode: 'captcha_unconfigured', errorMessage: 'Jalisco needs reCAPTCHA; TWOCAPTCHA_API_KEY not set' };
    }
    // Jalisco cross-checks the tarjeta de circulación: besides placa + serie it
    // validates engine number and/or owner name. Accept them as optional inputs
    // (used only as query params, never persisted/exposed) — full serie if given.
    const extra = (input ?? {}) as { ownerName?: string; engineNumber?: string };
    const serie = vin; // full serie is accepted ("al menos los últimos 5") and most specific

    try {
      return await withPage<ScrapeResult<MxStateParsed>>(
        async (page) => {
          await page.goto(JAL_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
          await page.locator('input[name="placa"]').fill(plate, { timeout: 15_000 });
          await page.locator('input[name="numeroSerie"]').fill(serie).catch(() => undefined);
          if (extra.ownerName) await page.locator('input[name="nombrePropietario"]').fill(extra.ownerName).catch(() => undefined);
          if (extra.engineNumber) await page.locator('input[name="numeroMotor"]').fill(extra.engineNumber).catch(() => undefined);

          const token = await solveReCaptchaV2({ siteKey: JAL_SITEKEY, pageUrl: JAL_URL, invisible: true });

          // Inject token + fire the invisible-reCAPTCHA callback so the SPA's own
          // submit handler runs with a valid response.
          await page.evaluate((t) => {
            document
              .querySelectorAll<HTMLTextAreaElement>('textarea[name="g-recaptcha-response"], #g-recaptcha-response')
              .forEach((el) => {
                el.value = t;
                el.style.display = 'block';
              });
            try {
              // Bounded 3-level walk (NO recursion) — grecaptcha's cfg has circular
              // refs, so an unbounded traversal would hang the page.
              const cfg = (window as unknown as { ___grecaptcha_cfg?: { clients?: Record<string, unknown> } }).___grecaptcha_cfg;
              const clients = cfg?.clients ?? {};
              for (const client of Object.values(clients)) {
                if (!client || typeof client !== 'object') continue;
                for (const val of Object.values(client as Record<string, unknown>)) {
                  if (!val || typeof val !== 'object') continue;
                  for (const maybe of Object.values(val as Record<string, unknown>)) {
                    const cb = (maybe as { callback?: unknown })?.callback;
                    if (typeof cb === 'function') (cb as (tok: string) => void)(t);
                  }
                }
              }
            } catch {
              /* ignore */
            }
          }, token);

          // Also click Consultar in case the callback didn't auto-submit. No
          // networkidle wait — this SPA long-polls and never goes idle (ate 30s).
          await page
            .locator('button:has-text("Consultar"), input[type="submit"]')
            .first()
            .click({ timeout: 8_000 })
            .catch(() => undefined);

          // Result renders async (modal/panel). Poll for a genuine result marker —
          // NOT the ever-present "reCAPTCHA" branding text.
          await page
            .waitForFunction(
              () => {
                const t = document.body.innerText || '';
                return /\$\s?[\d.,]+|al corriente|sin adeudo|no se encontr|no existe|adeudo total|debe ingresar|captcha no|requerido|obligatorio/i.test(t);
              },
              undefined,
              { timeout: 25_000, polling: 1000 },
            )
            .catch(() => undefined);
          await page.waitForTimeout(2000);

          const bodyText = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
          const hasResult = /\$\s?[\d.,]+|al corriente|sin adeudo|no se encontr|no existe|adeudo total/i.test(bodyText);
          if (!hasResult) {
            return {
              status: 'partial',
              errorCode: 'no_result_rendered',
              errorMessage: 'Jalisco did not render a result (captcha rejected or required field missing)',
              parsedData: { state_code: 'JAL', data_available: false, found: false, query_plate: plate, query_vin_digits: serie, raw_text: bodyText.slice(0, 2500) },
              costUsd: 0.003,
            };
          }
          return parseStateBody(bodyText, CFG, plate, serie);
        },
        // gobiernoenlinea1 times out through datacenter proxies; the DO box reaches
        // it fine on a direct connection (verified via /inspect). Force direct.
        { proxy: 'off' },
      );
    } catch (err) {
      logger.error({ err }, 'mx_st_jal: scrape failed');
      return { status: 'failed', errorCode: 'scrape_error', errorMessage: err instanceof Error ? err.message : String(err) };
    }
  },
};
