/**
 * Lightweight VIN decode via NHTSA vPIC (no browser, free, no key). Used by
 * workers that must decide applicability by make/model/year before scraping —
 * e.g. an OEM recall portal should only run for VINs of its own marque.
 * Results are cached in-process for the lifetime of the worker container.
 */
export interface DecodedVin {
  make: string; // NHTSA canonical, upper-cased (e.g. "FORD", "HONDA")
  model: string;
  year: string;
}

const cache = new Map<string, DecodedVin | null>();

export async function decodeVin(vin: string): Promise<DecodedVin | null> {
  const key = vin.trim().toUpperCase();
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(key)}?format=json`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const json = (await res.json()) as { Results?: Array<Record<string, string>> };
    const r = json.Results?.[0];
    if (!r) {
      cache.set(key, null);
      return null;
    }
    const decoded: DecodedVin = {
      make: (r.Make ?? '').trim().toUpperCase(),
      model: (r.Model ?? '').trim(),
      year: (r.ModelYear ?? '').trim(),
    };
    cache.set(key, decoded.make ? decoded : null);
    return decoded.make ? decoded : null;
  } catch {
    cache.set(key, null);
    return null;
  }
}

export interface NhtsaRecall {
  campaign: string;
  component: string;
  summary: string;
  remedy?: string;
  consequence?: string;
  reportReceivedDate?: string;
}

/**
 * Authoritative free recall data by make/model/year (NHTSA SaferCar). Covers all
 * US-market makes — used as the reliable backbone for OEM recall workers when the
 * manufacturer's own portal blocks datacenter/bot traffic.
 */
export async function getNhtsaRecalls(
  make: string,
  model: string,
  year: string,
): Promise<NhtsaRecall[] | null> {
  if (!make || !model || !year) return null;
  try {
    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(
      make,
    )}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(year)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: Array<Record<string, string>> };
    return (json.results ?? []).map((r) => ({
      campaign: r.NHTSACampaignNumber ?? '',
      component: r.Component ?? '',
      summary: r.Summary ?? '',
      remedy: r.Remedy,
      consequence: r.Consequence,
      reportReceivedDate: r.ReportReceivedDate,
    }));
  } catch {
    return null;
  }
}
