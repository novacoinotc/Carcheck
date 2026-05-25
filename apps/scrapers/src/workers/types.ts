import { z } from 'zod';

export const scrapeRequestSchema = z.object({
  vin: z.string().optional(),
  plate: z.string().optional(),
  state: z.string().optional(),
}).refine((d) => Boolean(d.vin) || Boolean(d.plate), {
  message: 'vin or plate required',
});

export type ScrapeRequest = z.infer<typeof scrapeRequestSchema>;

export interface ScrapeResult<TParsed = Record<string, unknown>> {
  status: 'success' | 'partial' | 'failed' | 'not_applicable' | 'skipped';
  rawData?: unknown;
  parsedData?: TParsed;
  normalizedFacts?: Array<{ key: string; value: unknown; confidence: number }>;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
  costUsd?: number;
}

export interface ScrapeWorker<TParsed = Record<string, unknown>> {
  readonly key: string;
  run(input: unknown): Promise<ScrapeResult<TParsed>>;
}
