import { z } from 'zod';

// ────────────────────────────────────────────────────────────────
// VIN validation (ISO 3779 + check digit per FMVSS 565)
// ────────────────────────────────────────────────────────────────

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function isValidVinFormat(vin: string): boolean {
  return VIN_REGEX.test(vin.toUpperCase());
}

export function isValidVinChecksum(vin: string): boolean {
  const upper = vin.toUpperCase();
  if (!isValidVinFormat(upper)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = upper[i]!;
    const value = TRANSLITERATION[char];
    if (value === undefined) return false;
    sum += value * (WEIGHTS[i] ?? 0);
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? 'X' : String(remainder);
  return upper[8] === expected;
}

export const vinSchema = z
  .string()
  .transform((v) => v.toUpperCase().replace(/\s+/g, ''))
  .refine(isValidVinFormat, { message: 'VIN must be 17 chars [A-HJ-NPR-Z0-9]' });

export const vinStrictSchema = vinSchema.refine(isValidVinChecksum, {
  message: 'VIN checksum does not validate',
});

// ────────────────────────────────────────────────────────────────
// Mexican plate formats (varies per state)
// ────────────────────────────────────────────────────────────────

export const MX_STATES = [
  'AGS', 'BC', 'BCS', 'CAMP', 'CHIS', 'CHIH', 'COAH', 'COL', 'CDMX', 'DGO',
  'MEX', 'GTO', 'GRO', 'HGO', 'JAL', 'MICH', 'MOR', 'NAY', 'NL', 'OAX',
  'PUE', 'QRO', 'QROO', 'SLP', 'SIN', 'SON', 'TAB', 'TAMPS', 'TLAX', 'VER',
  'YUC', 'ZAC',
] as const;

export type MxState = (typeof MX_STATES)[number];

export const mxPlateSchema = z
  .string()
  .transform((v) => v.toUpperCase().replace(/[\s-]/g, ''))
  .refine((v) => v.length >= 5 && v.length <= 8, {
    message: 'Mexican plate must be 5-8 chars',
  });

export const mxStateSchema = z.enum(MX_STATES);

// ────────────────────────────────────────────────────────────────
// Source query input + result types
// ────────────────────────────────────────────────────────────────

export const queryInputSchema = z
  .object({
    vin: vinSchema.optional(),
    plate: mxPlateSchema.optional(),
    state: mxStateSchema.optional(),
  })
  .refine((d) => Boolean(d.vin) || Boolean(d.plate), {
    message: 'At least one of vin or plate is required',
  });

export type QueryInput = z.infer<typeof queryInputSchema>;

export type SourceResultStatus =
  | 'success'
  | 'partial'
  | 'failed'
  | 'timeout'
  | 'not_applicable'
  | 'cached'
  | 'skipped';

export interface SourceResult<TParsed = Record<string, unknown>> {
  sourceKey: string;
  status: SourceResultStatus;
  responseTimeMs: number;
  rawData?: unknown;
  parsedData?: TParsed;
  normalizedFacts?: Array<{ key: string; value: unknown; confidence: number }>;
  costUsd?: number;
  cached?: boolean;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

export interface SourceClient<TParsed = Record<string, unknown>> {
  readonly key: string;
  readonly name: string;
  fetch(input: QueryInput): Promise<SourceResult<TParsed>>;
}

// ────────────────────────────────────────────────────────────────
// AI analyst output schema (used by orchestrator and Claude)
// ────────────────────────────────────────────────────────────────

export const aiSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const aiAnalysisSchema = z.object({
  risk_score: z.number().int().min(0).max(100),
  risk_level: z.enum(['green', 'yellow', 'red']),
  confidence: z.number().min(0).max(100),
  executive_summary: z.string().min(50).max(4000),
  red_flags: z.array(
    z.object({
      severity: aiSeveritySchema,
      finding: z.string(),
      sources: z.array(z.string()),
    }),
  ),
  green_flags: z.array(
    z.object({
      finding: z.string(),
      sources: z.array(z.string()),
    }),
  ),
  cross_source_findings: z.array(
    z.object({
      finding: z.string(),
      sources: z.array(z.string()),
      explanation: z.string(),
    }),
  ),
  recommendations: z.array(
    z.object({
      priority: z.enum(['must_check', 'should_check', 'nice_to_check']),
      action: z.string(),
      reason: z.string(),
    }),
  ),
  questions_for_seller: z.array(z.string()),
  market_context: z
    .object({
      fair_price_mxn: z
        .object({
          low: z.number(),
          mid: z.number(),
          high: z.number(),
        })
        .optional(),
      comparable_listings: z.number().int().optional(),
      market_notes: z.string().optional(),
    })
    .optional(),
});

export type AiAnalysisOutput = z.infer<typeof aiAnalysisSchema>;
