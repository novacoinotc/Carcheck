import { withPage } from '../../lib/browser-pool';
import { solveImageCaptcha } from '../../lib/captcha';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface CdmxParsed {
  state_code: 'CDMX';
  found: boolean;
  plate: string;
  total_debt_mxn: number | null;
  tenencia_status?: string;
  refrendo_status?: string;
  has_fotocivicas?: boolean;
  raw_text?: string;
}

const CDMX_URL = 'https://data.finanzas.cdmx.gob.mx/consulta_adeudos/';

function parseMoney(text: string): number | null {
  const m = /\$\s*([\d,]+(?:\.\d{2})?)/.exec(text);
  if (!m) return null;
  const n = parseFloat(m[1]!.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * CDMX control vehicular (adeudos / tenencia / refrendo / fotocívicas).
 * Custom worker (not the generic factory) because CDMX uses an image CAPTCHA.
 * Structure verified live via /inspect (2026-05-25): #inputPlaca + #captcha_code + "Buscar".
 * Loads through a proxy (direct connection is refused for datacenter IPs).
 */
export const cdmxWorker: ScrapeWorker<CdmxParsed> = {
  key: 'mx_st_cdmx_control_vehicular',
  async run(input): Promise<ScrapeResult<CdmxParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const plate = parsed.data.plate;
    if (!plate) {
      return {
        status: 'not_applicable',
        errorCode: 'plate_required',
        errorMessage: 'CDMX consulta is by plate',
      };
    }
    if (!process.env.TWOCAPTCHA_API_KEY) {
      return {
        status: 'skipped',
        errorCode: 'captcha_unconfigured',
        errorMessage: 'needs TWOCAPTCHA_API_KEY',
      };
    }

    try {
      return await withPage<ScrapeResult<CdmxParsed>>(
        async (page) => {
          await page.goto(CDMX_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
          await page.waitForTimeout(1500);

          await page.locator('#inputPlaca').fill(plate);

          // Locate the captcha image (robust: id/src/near input), screenshot, solve.
          const img = page
            .locator('img[src*="captcha" i], img[id*="captcha" i], #captcha_code ~ img, form img')
            .first();
          await img.waitFor({ state: 'visible', timeout: 8000 });
          const shot = await img.screenshot();
          const base64 = shot.toString('base64');

          const captchaText = await solveImageCaptcha({
            base64,
            hint: 'Read the text in the image',
          });
          await page.locator('#captcha_code').fill(captchaText);

          await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined),
            page.getByRole('button', { name: /buscar/i }).first().click({ timeout: 10_000 }),
          ]);
          await page.waitForTimeout(2000);

          const bodyText = await page.locator('body').innerText({ timeout: 10_000 });
          const lower = bodyText.toLowerCase();

          const notFound =
            lower.includes('no se encontr') ||
            (lower.includes('captcha') && lower.includes('incorrecto')) ||
            lower.includes('placa no');
          const hasDebt =
            lower.includes('adeudo') || lower.includes('tenencia') || lower.includes('refrendo');

          const parsedOut: CdmxParsed = {
            state_code: 'CDMX',
            found: hasDebt && !notFound,
            plate,
            total_debt_mxn: parseMoney(bodyText),
            tenencia_status: /tenencia[^\n]*/i.exec(bodyText)?.[0]?.slice(0, 80),
            refrendo_status: /refrendo[^\n]*/i.exec(bodyText)?.[0]?.slice(0, 80),
            has_fotocivicas: lower.includes('cívica') || lower.includes('civica'),
            raw_text: bodyText.slice(0, 3000),
          };

          return {
            status: 'success',
            parsedData: parsedOut,
            normalizedFacts: [
              { key: 'cdmx_found', value: parsedOut.found, confidence: 90 },
              { key: 'state_debt_mxn', value: parsedOut.total_debt_mxn, confidence: 85 },
              { key: 'has_fotocivicas', value: parsedOut.has_fotocivicas, confidence: 80 },
            ],
            costUsd: 0.05,
          };
        },
        { proxy: 'always' },
      );
    } catch (err) {
      logger.error({ err }, 'cdmx: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
