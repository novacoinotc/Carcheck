import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';
import { fillVinAndSubmit, parseOemRecalls, type OemRecallParsed } from './_shared';

const NISSAN_URL = 'https://owners.nissanusa.com/nowners/vinlookup/vinlookupresults';

export const nissanRecallWorker: ScrapeWorker<OemRecallParsed> = {
  key: 'oem_nissan',
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
        errorMessage: 'Nissan recall lookup requires the VIN',
      };
    }

    try {
      return await withPage<ScrapeResult<OemRecallParsed>>(async (page) => {
        // The results endpoint often accepts the VIN as a query param; also try the form.
        const url = `${NISSAN_URL}?vin=${encodeURIComponent(vin)}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => undefined);
        await fillVinAndSubmit(page, vin).catch(() => undefined);
        return parseOemRecalls(page, vin);
      });
    } catch (err) {
      logger.error({ err }, 'oem_nissan: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
