import { anthropic } from '@ai-sdk/anthropic';
import { generateText, Output } from 'ai';
import { aiAnalysisSchema, type AiAnalysisOutput, type SourceResult } from '@carcheck/shared-types';
import { SYSTEM_PROMPT, PROMPT_VERSION } from './system-prompt';

// Model IDs use hyphens because we call @ai-sdk/anthropic direct provider,
// which uses Anthropic's native API IDs (curl-verified). Dots are only for AI Gateway slugs.
const DEFAULT_MODEL = 'claude-opus-4-7';
const FALLBACK_MODEL = 'claude-sonnet-4-6';

const INPUT_TOKEN_PRICE_USD: Record<string, number> = {
  'claude-opus-4-7': 15 / 1_000_000,
  'claude-sonnet-4-6': 3 / 1_000_000,
  'claude-haiku-4-5': 0.8 / 1_000_000,
};

const OUTPUT_TOKEN_PRICE_USD: Record<string, number> = {
  'claude-opus-4-7': 75 / 1_000_000,
  'claude-sonnet-4-6': 15 / 1_000_000,
  'claude-haiku-4-5': 4 / 1_000_000,
};

const CACHE_WRITE_PRICE_USD: Record<string, number> = {
  'claude-opus-4-7': 18.75 / 1_000_000,
  'claude-sonnet-4-6': 3.75 / 1_000_000,
  'claude-haiku-4-5': 1 / 1_000_000,
};

const CACHE_READ_PRICE_USD: Record<string, number> = {
  'claude-opus-4-7': 1.5 / 1_000_000,
  'claude-sonnet-4-6': 0.3 / 1_000_000,
  'claude-haiku-4-5': 0.08 / 1_000_000,
};

export interface AnalyzeInput {
  vehicle: {
    vin?: string | undefined;
    plate?: string | undefined;
    plate_state?: string | undefined;
    make?: string | null;
    model?: string | null;
    year?: number | null;
  };
  sourceResults: SourceResult[];
  preferFastModel?: boolean;
}

export interface AnalyzeOutput {
  analysis: AiAnalysisOutput;
  meta: {
    model: string;
    promptVersion: string;
    inputTokens: number;
    cachedInputTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
    costUsd: number;
    latencyMs: number;
  };
}

function computeCost(
  model: string,
  inputTokens: number,
  cachedReadTokens: number,
  cacheWriteTokens: number,
  outputTokens: number,
): number {
  const inPrice = INPUT_TOKEN_PRICE_USD[model] ?? INPUT_TOKEN_PRICE_USD[FALLBACK_MODEL]!;
  const outPrice = OUTPUT_TOKEN_PRICE_USD[model] ?? OUTPUT_TOKEN_PRICE_USD[FALLBACK_MODEL]!;
  const cacheWritePrice = CACHE_WRITE_PRICE_USD[model] ?? CACHE_WRITE_PRICE_USD[FALLBACK_MODEL]!;
  const cacheReadPrice = CACHE_READ_PRICE_USD[model] ?? CACHE_READ_PRICE_USD[FALLBACK_MODEL]!;
  return (
    inputTokens * inPrice +
    cachedReadTokens * cacheReadPrice +
    cacheWriteTokens * cacheWritePrice +
    outputTokens * outPrice
  );
}

export async function analyzeReport(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const start = Date.now();
  const modelId = input.preferFastModel ? FALLBACK_MODEL : DEFAULT_MODEL;

  const userPayload = JSON.stringify(
    {
      vehicle: input.vehicle,
      source_results: input.sourceResults.map((r) => ({
        source_key: r.sourceKey,
        status: r.status,
        parsed: r.parsedData,
        facts: r.normalizedFacts,
        response_time_ms: r.responseTimeMs,
        cached: r.cached,
        error: r.errorMessage,
      })),
    },
    null,
    0,
  );

  const result = await generateText({
    model: anthropic(modelId),
    // System message in messages array (instead of `system` parameter) is required to attach
    // Anthropic prompt-caching providerOptions. The AI_SDK_ALLOW_SYSTEM_IN_MESSAGES flag
    // silences the security-injection warning since SYSTEM_PROMPT is a trusted constant.
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      },
      { role: 'user', content: userPayload },
    ],
    output: Output.object({ schema: aiAnalysisSchema }),
    maxOutputTokens: 4096,
    allowSystemInMessages: true,
  });

  const usage = result.usage as
    | {
        inputTokens?: number;
        cachedInputTokens?: number;
        cacheCreationInputTokens?: number;
        outputTokens?: number;
      }
    | undefined;
  const inputTokens = usage?.inputTokens ?? 0;
  const cachedRead = usage?.cachedInputTokens ?? 0;
  const cacheWrite = usage?.cacheCreationInputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;

  return {
    analysis: result.output,
    meta: {
      model: modelId,
      promptVersion: PROMPT_VERSION,
      inputTokens,
      cachedInputTokens: cachedRead,
      cacheWriteTokens: cacheWrite,
      outputTokens,
      costUsd: computeCost(modelId, inputTokens, cachedRead, cacheWrite, outputTokens),
      latencyMs: Date.now() - start,
    },
  };
}

export { SYSTEM_PROMPT, PROMPT_VERSION };
