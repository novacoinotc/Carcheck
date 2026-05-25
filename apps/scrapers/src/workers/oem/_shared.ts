import type { Page } from 'playwright';
import type { ScrapeResult } from '../types';

export interface OemRecallParsed {
  data_available: boolean;
  vin: string;
  open_recalls: number;
  recall_titles: string[];
  recalls: Array<{ title: string; description?: string }>;
  raw_text?: string;
}

/**
 * Fills a VIN into the first plausible text input on an OEM recall page and
 * submits the form. Best-effort: every selector has multiple fallbacks and a
 * `.catch()` so the flow degrades gracefully on layout changes.
 */
export async function fillVinAndSubmit(page: Page, vin: string): Promise<void> {
  const vinInput = page
    .locator(
      'input[name*="vin" i], input[id*="vin" i], input[placeholder*="VIN" i], input[aria-label*="VIN" i], input[type="text"]',
    )
    .first();
  await vinInput.waitFor({ state: 'visible', timeout: 15_000 });
  await vinInput.fill(vin);

  const submit = page
    .locator(
      'button:has-text("Submit"), button:has-text("Search"), button:has-text("Check"), button:has-text("Look up"), button:has-text("Lookup"), button[type="submit"], input[type="submit"]',
    )
    .first();
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined),
    submit.click({ timeout: 10_000 }).catch(() => undefined),
  ]);
  await page.waitForTimeout(2500);
}

/**
 * Best-effort extraction of open recall cards from a rendered OEM page. Returns
 * a normalized ScrapeResult with `oem_open_recalls` + `oem_recall_titles`.
 * No recalls found → success with count 0.
 */
export async function parseOemRecalls(
  page: Page,
  vin: string,
): Promise<ScrapeResult<OemRecallParsed>> {
  const bodyText = await page
    .locator('body')
    .innerText({ timeout: 10_000 })
    .catch(() => '');
  const lower = bodyText.toLowerCase();

  const noRecalls =
    lower.includes('no open recall') ||
    lower.includes('no recalls') ||
    lower.includes('no outstanding') ||
    lower.includes('not subject to') ||
    lower.includes('0 recall') ||
    lower.includes('no safety recall') ||
    lower.includes('no incomplete') ||
    lower.includes('up to date');

  const recalls: Array<{ title: string; description?: string }> = [];
  const cards = await page
    .locator(
      '[class*="recall" i], [data-recall], article, .campaign, [class*="campaign" i], li[class*="result" i], [class*="safety" i] li',
    )
    .all()
    .catch(() => []);

  for (const card of cards.slice(0, 30)) {
    const text = (await card.innerText().catch(() => '')).trim();
    if (!text || text.length < 12) continue;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const title = lines[0]?.slice(0, 200) ?? text.slice(0, 120);
    const description = lines.slice(1).join(' ').slice(0, 800) || undefined;
    recalls.push({ title, description });
  }

  const seen = new Set<string>();
  const unique = recalls.filter((r) => {
    const k = r.title.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (noRecalls && unique.length === 0) {
    return {
      status: 'success',
      parsedData: {
        data_available: true,
        vin,
        open_recalls: 0,
        recall_titles: [],
        recalls: [],
        raw_text: bodyText.slice(0, 4000),
      },
      normalizedFacts: [
        { key: 'oem_open_recalls', value: 0, confidence: 90 },
        { key: 'oem_recall_titles', value: [], confidence: 90 },
      ],
      costUsd: 0,
    };
  }

  const titles = unique.map((r) => r.title);
  return {
    status: unique.length ? 'success' : 'partial',
    parsedData: {
      data_available: true,
      vin,
      open_recalls: unique.length,
      recall_titles: titles,
      recalls: unique.slice(0, 20),
      raw_text: bodyText.slice(0, 4000),
    },
    normalizedFacts: [
      { key: 'oem_open_recalls', value: unique.length, confidence: unique.length ? 85 : 60 },
      { key: 'oem_recall_titles', value: titles, confidence: 80 },
    ],
    costUsd: 0,
  };
}
