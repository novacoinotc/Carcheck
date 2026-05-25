import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';
import { fillVinAndSubmit, parseOemRecalls, type OemRecallParsed } from './_shared';

const BMW_URL = 'https://www.bmwusa.com/vehicles/bmwvalue/recall-information.html';

export const bmwRecallWorker: ScrapeWorker<OemRecallParsed> = {
  key: 'oem_bmw',
  async run(input): Promise<ScrapeResult<OemRecallParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const vin = parsed.data.vin;
    if (!vin) {
      return {
        status: 'not_applicable',
        errorCode: 'vin_required',
        errorMessage: 'BMW recall lookup requires the VIN',
      };
    }

    try {
      return await withPage<ScrapeResult<OemRecallParsed>>(async (page) => {
        await page.goto(BMW_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });
        await fillVinAndSubmit(page, vin);
        return parseOemRecalls(page, vin);
      });
    } catch (err) {
      logger.error({ err }, 'oem_bmw: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
