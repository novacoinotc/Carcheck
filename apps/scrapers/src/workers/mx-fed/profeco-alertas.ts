import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { decodeVin } from '../../lib/vin';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface ProfecoAlert {
  marca: string;
  modelo?: string;
  ano_o_rango?: string;
  descripcion?: string;
  url?: string;
  fecha?: string;
  vins_afectados?: string;
}

interface ProfecoParsed {
  data_available: boolean;
  alert_count: number;
  matched_count: number;
  alerts: ProfecoAlert[];
  searched_for: { make?: string; model?: string; year?: number };
}

const PROFECO_URL = 'https://alertas.gob.mx/';

export const profecoAlertasWorker: ScrapeWorker<ProfecoParsed> = {
  key: 'mx_fed_profeco_alertas',
  async run(input): Promise<ScrapeResult<ProfecoParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const extras = parsed.data as { make?: string; model?: string; year?: number };
    // PROFECO Alertas is indexed by make/model/year, not by VIN. Use orchestrator-
    // supplied metadata if present, else decode the VIN here (self-sufficient).
    let make = extras.make;
    let model = extras.model;
    let year = extras.year;
    if (!make && parsed.data.vin) {
      const d = await decodeVin(parsed.data.vin);
      if (d) {
        make = d.make;
        model = model ?? d.model;
        year = year ?? (d.year ? Number(d.year) : undefined);
      }
    }
    if (!make) {
      return {
        status: 'not_applicable',
        errorCode: 'make_required',
        errorMessage: 'PROFECO Alertas needs a make (VIN decode failed)',
      };
    }
    extras.model = model;
    extras.year = year;

    try {
      return await withPage<ScrapeResult<ProfecoParsed>>(async (page) => {
        await page.goto(PROFECO_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

        // Search box on alertas.gob.mx
        const search = page
          .locator('input[type="search"], input[name*="busqueda" i], input[name*="search" i]')
          .first();
        if (await search.count().catch(() => 0)) {
          await search.fill(make);
          await search.press('Enter').catch(() => undefined);
          await page.waitForTimeout(2500);
        }

        const cards = await page
          .locator(
            'article, .card, [class*="alerta"], [class*="result"], a[href*="/alerta"]',
          )
          .all();

        const alerts: ProfecoAlert[] = [];
        for (const card of cards.slice(0, 50)) {
          const text = (await card.innerText().catch(() => '')).trim();
          if (!text || text.length < 20) continue;
          const lowerText = text.toLowerCase();
          if (!lowerText.includes(make.toLowerCase())) continue;
          const url = await card.locator('a').first().getAttribute('href').catch(() => null);
          alerts.push({
            marca: make,
            modelo: extras.model,
            ano_o_rango: extras.year ? String(extras.year) : undefined,
            descripcion: text.slice(0, 500),
            url: url ?? undefined,
            fecha: /\b(\d{2}\/\d{2}\/\d{4})\b/.exec(text)?.[1],
            vins_afectados: /VIN[^\n]*?:\s*([^\n]+)/i.exec(text)?.[1]?.trim(),
          });
        }

        const matched = alerts.filter((a) => {
          if (extras.model && a.descripcion) {
            return a.descripcion.toLowerCase().includes(extras.model.toLowerCase());
          }
          return true;
        });

        return {
          status: 'success',
          parsedData: {
            data_available: true,
            alert_count: alerts.length,
            matched_count: matched.length,
            alerts: matched.slice(0, 20),
            searched_for: { make: make, model: extras.model, year: extras.year },
          },
          normalizedFacts: [
            { key: 'profeco_alert_count_brand', value: alerts.length, confidence: 80 },
            { key: 'profeco_alert_count_model', value: matched.length, confidence: 75 },
          ],
          costUsd: 0,
        };
      });
    } catch (err) {
      logger.error({ err }, 'profeco-alertas: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
