import type { Frame, Page } from 'playwright';
import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

/**
 * Shared scaffolding for the 32 Mexican state "control vehicular" portals.
 *
 * Every state exposes the same conceptual lookup — plate (+ usually the last
 * digits of the VIN) → adeudos / refrendo / tenencia / multas — but each lives
 * behind a slightly different form. Selectors here are intentionally DEFENSIVE
 * (multiple `name*=`/`id*=` patterns, `.first()`, `.catch(() => undefined)` on
 * every optional step) so the workers stay structurally correct and degrade
 * gracefully. Real selectors get tuned per-portal in production.
 */

export interface MxStateParsed {
  state_code: string;
  data_available: boolean;
  found: boolean;
  /** Total outstanding debt in MXN, when a money figure could be parsed. */
  state_debt_mxn?: number;
  refrendo_status?: 'al_corriente' | 'con_adeudo' | 'desconocido';
  tenencia_status?: 'al_corriente' | 'con_adeudo' | 'exento' | 'desconocido';
  multas_count?: number;
  vigencia?: string;
  query_plate?: string;
  query_vin_digits?: string;
  notes?: string;
  raw_text?: string;
}

export interface MxStateConfig {
  /** Must equal `mx_st_<code>_control_vehicular`. */
  key: string;
  /** Upper-case state code, e.g. `CDMX`, `JAL`. */
  stateCode: string;
  /** Portal entry URL from the seed registry. */
  url: string;
  /**
   * Whether the portal needs VIN digits in addition to the plate. Most do; the
   * few plate-only portals set this to false so we don't reject valid requests.
   */
  needsVin?: boolean;
  /** How many trailing VIN characters the form expects (4 or 5). Default 5. */
  vinDigits?: number;
}

/** Field/selector candidates for the plate input, ordered most → least specific. */
const PLATE_SELECTORS = [
  'input[name*="placa" i]',
  'input[id*="placa" i]',
  'input[placeholder*="placa" i]',
  'input[name*="plate" i]',
  'input[aria-label*="placa" i]',
].join(', ');

const VIN_SELECTORS = [
  'input[name*="serie" i]',
  'input[id*="serie" i]',
  'input[name*="niv" i]',
  'input[id*="niv" i]',
  'input[name*="vin" i]',
  'input[id*="vin" i]',
  'input[placeholder*="serie" i]',
  'input[placeholder*="niv" i]',
].join(', ');

const SUBMIT_SELECTORS = [
  'button:has-text("Consultar")',
  'button:has-text("Buscar")',
  'input[type="submit"][value*="Consultar" i]',
  'input[type="submit"][value*="Buscar" i]',
  'input[type="submit"]',
  'button[type="submit"]',
  'a:has-text("Consultar")',
  'a:has-text("Buscar")',
].join(', ');

const NOT_FOUND_MARKERS = [
  'no se encontr',
  'no encontrado',
  'sin información',
  'sin informacion',
  'sin resultados',
  'no existe',
  'no hay registros',
  'no se localiz',
  'datos incorrectos',
];

const NO_DEBT_MARKERS = [
  'sin adeudo',
  'sin adeudos',
  'al corriente',
  'no presenta adeudo',
  'no tiene adeudo',
  'no registra adeudo',
  '$0.00',
  '$ 0.00',
];

/** Parse a Mexican-formatted currency figure (e.g. `$ 1,234.50`) into a number. */
export function parseMxnAmount(text: string): number | undefined {
  // Grab the largest money-looking token; debts are usually the headline figure.
  const matches = text.match(/\$\s?[\d.,]+/g);
  if (!matches || matches.length === 0) return undefined;
  let max: number | undefined;
  for (const raw of matches) {
    const cleaned = raw.replace(/[^\d.,]/g, '').replace(/,/g, '');
    const n = Number.parseFloat(cleaned);
    if (Number.isFinite(n) && (max === undefined || n > max)) max = n;
  }
  return max;
}

/** Count distinct multa/infracción references in the body text (best effort). */
export function countMultas(text: string): number {
  const lower = text.toLowerCase();
  const explicit = /(\d+)\s+(?:multas|infracciones)/i.exec(text)?.[1];
  if (explicit) {
    const n = Number.parseInt(explicit, 10);
    if (Number.isFinite(n)) return n;
  }
  const occurrences = (lower.match(/\b(?:multa|infracci[oó]n)\b/g) ?? []).length;
  return occurrences;
}

function hasAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

/** Pull a vigencia / vencimiento date when present. */
function parseVigencia(text: string): string | undefined {
  return (
    /(?:vigencia|vence|vencimiento|vigente hasta)[^\n\r]*?(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i.exec(
      text,
    )?.[1] ?? undefined
  );
}

/**
 * Builds the parsedData + normalizedFacts from page body text. Shared so the
 * mapping from raw text → normalized keys is identical across all 32 states.
 */
export function parseStateBody(
  bodyText: string,
  cfg: MxStateConfig,
  plate: string,
  vinDigits: string | undefined,
): ScrapeResult<MxStateParsed> {
  const notFound = hasAny(bodyText, NOT_FOUND_MARKERS);
  const noDebt = hasAny(bodyText, NO_DEBT_MARKERS);

  if (notFound) {
    return {
      status: 'success',
      parsedData: {
        state_code: cfg.stateCode,
        data_available: true,
        found: false,
        query_plate: plate,
        query_vin_digits: vinDigits,
        notes: 'No se encontraron registros para los datos proporcionados',
        raw_text: bodyText.slice(0, 4000),
      },
      normalizedFacts: [
        { key: 'state_searched', value: true, confidence: 100 },
        { key: 'state_record_found', value: false, confidence: 95 },
      ],
      costUsd: 0.05,
    };
  }

  const debt = noDebt ? 0 : parseMxnAmount(bodyText);
  const multas = countMultas(bodyText);
  const vigencia = parseVigencia(bodyText);

  const refrendo_status: MxStateParsed['refrendo_status'] =
    debt === 0 ? 'al_corriente' : debt !== undefined && debt > 0 ? 'con_adeudo' : 'desconocido';

  const lower = bodyText.toLowerCase();
  const tenencia_status: MxStateParsed['tenencia_status'] = lower.includes('exent')
    ? 'exento'
    : debt === 0
      ? 'al_corriente'
      : debt !== undefined && debt > 0
        ? 'con_adeudo'
        : 'desconocido';

  return {
    status: 'success',
    parsedData: {
      state_code: cfg.stateCode,
      data_available: true,
      found: true,
      state_debt_mxn: debt,
      refrendo_status,
      tenencia_status,
      multas_count: multas,
      vigencia,
      query_plate: plate,
      query_vin_digits: vinDigits,
      raw_text: bodyText.slice(0, 4000),
    },
    normalizedFacts: [
      { key: 'state_searched', value: true, confidence: 100 },
      { key: 'state_record_found', value: true, confidence: 90 },
      { key: 'state_debt_mxn', value: debt, confidence: debt === undefined ? 40 : 80 },
      { key: 'refrendo_status', value: refrendo_status, confidence: 75 },
      { key: 'tenencia_status', value: tenencia_status, confidence: 70 },
      { key: 'multas_count', value: multas, confidence: 60 },
      { key: 'vigencia', value: vigencia, confidence: vigencia ? 70 : 30 },
    ],
    costUsd: 0.05,
  };
}

/** Fill plate + (optional) VIN digits across the page and any same-origin frames. */
async function fillForm(
  page: Page,
  plate: string,
  vinDigits: string | undefined,
): Promise<void> {
  // Prefer the main frame; some state portals wrap the form in an iframe.
  const frames: Array<Page | Frame> = [page, ...page.frames()];

  let plateFilled = false;
  for (const ctx of frames) {
    const plateInput = ctx.locator(PLATE_SELECTORS).first();
    const visible = await plateInput
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!visible) continue;
    await plateInput.fill(plate).catch(() => undefined);
    plateFilled = true;

    if (vinDigits) {
      const vinInput = ctx.locator(VIN_SELECTORS).first();
      if (await vinInput.count().catch(() => 0)) {
        await vinInput.fill(vinDigits).catch(() => undefined);
      }
    }
    break;
  }

  if (!plateFilled) {
    throw new Error('plate input not found on portal');
  }
}

async function submitForm(page: Page): Promise<void> {
  const frames: Array<Page | Frame> = [page, ...page.frames()];
  for (const ctx of frames) {
    const submit = ctx.locator(SUBMIT_SELECTORS).first();
    if (await submit.count().catch(() => 0)) {
      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined),
        submit.click({ timeout: 10_000 }).catch(() => undefined),
      ]);
      return;
    }
  }
  // Fallback: submit via Enter on the focused field.
  await page.keyboard.press('Enter').catch(() => undefined);
}

/** Read body text from the frame most likely to hold the result. */
async function readResultText(page: Page): Promise<string> {
  const candidates: Array<Page | Frame> = [page, ...page.frames()];
  let best = '';
  for (const ctx of candidates) {
    const txt = await ctx
      .locator('body')
      .innerText({ timeout: 8_000 })
      .catch(() => '');
    if (txt.length > best.length) best = txt;
  }
  return best;
}

/**
 * Factory: turns a per-state config into a fully-formed `ScrapeWorker`.
 * Handles input validation, navigation, defensive form fill, submit, parse,
 * and try/catch → `failed` on any exception.
 */
export function makeMxStateWorker(cfg: MxStateConfig): ScrapeWorker<MxStateParsed> {
  const needsVin = cfg.needsVin ?? true;
  const vinDigits = cfg.vinDigits ?? 5;

  return {
    key: cfg.key,
    async run(input): Promise<ScrapeResult<MxStateParsed>> {
      const parsed = scrapeRequestSchema.safeParse(input);
      if (!parsed.success) {
        return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
      }

      const query = parsed.data;
      const plate = query.plate?.trim();
      if (!plate) {
        return {
          status: 'not_applicable',
          errorCode: 'plate_required',
          errorMessage: `${cfg.stateCode} control vehicular lookup requires a plate`,
        };
      }

      let vinPart: string | undefined;
      if (needsVin) {
        const vin = query.vin?.trim();
        if (!vin) {
          return {
            status: 'not_applicable',
            errorCode: 'vin_required',
            errorMessage: `${cfg.stateCode} portal requires the last ${vinDigits} of the VIN`,
          };
        }
        vinPart = vin.slice(-vinDigits);
      }

      try {
        return await withPage<ScrapeResult<MxStateParsed>>(
          async (page) => {
            await page.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
            await fillForm(page, plate, vinPart);
            await submitForm(page);
            await page.waitForTimeout(2_000);

            const bodyText = await readResultText(page);
            if (!bodyText.trim()) {
              return {
                status: 'partial',
                errorCode: 'empty_response',
                errorMessage: 'portal returned no readable text',
                parsedData: {
                  state_code: cfg.stateCode,
                  data_available: false,
                  found: false,
                  query_plate: plate,
                  query_vin_digits: vinPart,
                },
                costUsd: 0.05,
              };
            }

            return parseStateBody(bodyText, cfg, plate, vinPart);
          },
          { proxy: 'always' },
        );
      } catch (err) {
        logger.error({ err, key: cfg.key }, 'mx-state: scrape failed');
        return {
          status: 'failed',
          errorCode: 'scrape_error',
          errorMessage: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
