import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface RecallRaw {
  Manufacturer: string;
  NHTSACampaignNumber: string;
  ReportReceivedDate: string;
  Component: string;
  Summary: string;
  Consequence: string;
  Remedy: string;
  Notes: string;
  ModelYear: string;
  Make: string;
  Model: string;
  ParkIt?: boolean;
  ParkOutSide?: boolean;
}

interface RecallsResponse {
  Count: number;
  Message: string;
  results: RecallRaw[];
}

interface RecallsParsed {
  openRecallCount: number;
  parkItRecalls: number;
  recalls: Array<{
    campaignNumber: string;
    reportDate: string;
    component: string;
    summary: string;
    remedy: string;
    parkIt: boolean;
    parkOutside: boolean;
  }>;
}

export const nhtsaRecallsClient: SourceClient<RecallsParsed> = {
  key: 'usa_fed_nhtsa_recalls',
  name: 'NHTSA Recalls',
  async fetch(input: QueryInput): Promise<SourceResult<RecallsParsed>> {
    const start = Date.now();
    if (!input.vin) {
      return {
        sourceKey: 'usa_fed_nhtsa_recalls',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'NHTSA Recalls requires a VIN',
      };
    }

    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?vin=${encodeURIComponent(input.vin)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'CarCheck/0.1 (+https://carcheck.mx)' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 400) {
        // NHTSA returns 400 when the VIN is not recognized as a valid US vehicle
        // (synthetic/test VINs, foreign-only VINs). Treat as "no recalls found".
        return {
          sourceKey: 'usa_fed_nhtsa_recalls',
          status: 'success',
          responseTimeMs: Date.now() - start,
          httpStatus: 400,
          parsedData: { openRecallCount: 0, parkItRecalls: 0, recalls: [] },
          normalizedFacts: [
            { key: 'open_recall_count', value: 0, confidence: 60 },
            { key: 'vin_not_in_nhtsa', value: true, confidence: 100 },
          ],
          costUsd: 0,
        };
      }

      if (!res.ok) {
        return {
          sourceKey: 'usa_fed_nhtsa_recalls',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `NHTSA Recalls returned ${res.status}`,
        };
      }

      const data = (await res.json()) as RecallsResponse;
      const recalls = (data.results ?? []).map((r) => ({
        campaignNumber: r.NHTSACampaignNumber,
        reportDate: r.ReportReceivedDate,
        component: r.Component,
        summary: r.Summary,
        remedy: r.Remedy,
        parkIt: r.ParkIt === true,
        parkOutside: r.ParkOutSide === true,
      }));

      const parsed: RecallsParsed = {
        openRecallCount: recalls.length,
        parkItRecalls: recalls.filter((r) => r.parkIt || r.parkOutside).length,
        recalls,
      };

      return {
        sourceKey: 'usa_fed_nhtsa_recalls',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: [
          { key: 'open_recall_count', value: parsed.openRecallCount, confidence: 100 },
          { key: 'park_it_recalls', value: parsed.parkItRecalls, confidence: 100 },
        ],
        costUsd: 0,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_fed_nhtsa_recalls',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
