import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';
import { fillVinAndSubmit, parseOemRecalls, type OemRecallParsed } from './_shared';

const MERCEDES_URL = 'https://www.mbusa.com/en/owners/recalls';

export const mercedesRecallWorker: ScrapeWorker<OemRecallParsed> = {
  key: 'oem_mercedes',
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
        errorMessage: 'Mercedes-Benz recall lookup requires the VIN',
      };
    }

    try {
      return await withPage<ScrapeResult<OemRecallParsed>>(async (page) => {
        await page.goto(MERCEDES_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });
        await fillVinAndSubmit(page, vin);
        return parseOemRecalls(page, vin);
      });
    } catch (err) {
      logger.error({ err }, 'oem_mercedes: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
