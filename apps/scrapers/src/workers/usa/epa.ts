import { decodeVin } from '../../lib/vin';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface EpaParsed {
  data_available: boolean;
  cert_found: boolean; // configuration exists in EPA's US-certified database
  searched_for: { make?: string; model?: string; year?: string };
  matched_model?: string;
  fuel_economy?: { cityMpg?: number; highwayMpg?: number; combinedMpg?: number; co2GramsPerMile?: number; fuelType?: string };
  raw?: unknown;
}

const FE = 'https://www.fueleconomy.gov/ws/rest';

async function feJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  return res.json();
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * EPA certification + emissions via fueleconomy.gov (free, no key). A vehicle
 * config appearing in EPA's database means it was certified for US sale — useful
 * for imported/chocolate vehicles — and yields real MPG/CO2 figures. Indexed by
 * make/model/year, so we decode the VIN here (NHTSA vPIC) to drive the lookup.
 */
export const epaCertificationWorker: ScrapeWorker<EpaParsed> = {
  key: 'usa_fed_epa_certification',
  async run(input): Promise<ScrapeResult<EpaParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const extras = (input ?? {}) as { make?: string; model?: string; year?: number };
    const vin = parsed.data.vin;

    let make = extras.make;
    let model = extras.model;
    let year = extras.year ? String(extras.year) : undefined;
    if (vin && (!make || !model || !year)) {
      const d = await decodeVin(vin);
      if (d) {
        make = make ?? d.make;
        model = model ?? d.model;
        year = year ?? d.year;
      }
    }
    if (!make || !year) {
      return {
        status: 'not_applicable',
        errorCode: 'make_required',
        errorMessage: 'EPA certification lookup needs make + year (VIN decode failed)',
      };
    }

    try {
      // fueleconomy uses title-case makes ("Ford"); vPIC gives upper ("FORD").
      const makeTc = make.charAt(0) + make.slice(1).toLowerCase();
      const modelsResp = (await feJson(`${FE}/vehicle/menu/model?year=${year}&make=${encodeURIComponent(makeTc)}`)) as
        | { menuItem?: Array<{ value: string }> | { value: string } }
        | null;
      const models = asArray(modelsResp?.menuItem).map((m) => m.value);

      const wantNorm = model ? norm(model) : '';
      // Prefer the shortest matching name (base trim) over longer sub-variants,
      // e.g. "F150 Pickup" before "F150 Lightning 4WD" for a decoded "F-150".
      const candidates = wantNorm
        ? models.filter((m) => norm(m).includes(wantNorm) || wantNorm.includes(norm(m)))
        : [];
      const matched = candidates.sort((a, b) => norm(a).length - norm(b).length)[0];

      if (!matched) {
        return {
          status: 'success',
          parsedData: { data_available: true, cert_found: false, searched_for: { make, model, year } },
          normalizedFacts: [{ key: 'epa_us_certified', value: false, confidence: 70 }],
          costUsd: 0,
        };
      }

      const optsResp = (await feJson(
        `${FE}/vehicle/menu/options?year=${year}&make=${encodeURIComponent(makeTc)}&model=${encodeURIComponent(matched)}`,
      )) as { menuItem?: Array<{ value: string }> | { value: string } } | null;
      const firstId = asArray(optsResp?.menuItem)[0]?.value;

      let fuel: EpaParsed['fuel_economy'];
      let raw: unknown;
      if (firstId) {
        const v = (await feJson(`${FE}/vehicle/${firstId}`)) as Record<string, string> | null;
        if (v) {
          raw = v;
          fuel = {
            cityMpg: Number(v.city08) || undefined,
            highwayMpg: Number(v.highway08) || undefined,
            combinedMpg: Number(v.comb08) || undefined,
            co2GramsPerMile: Number(v.co2TailpipeGpm) || undefined,
            fuelType: v.fuelType,
          };
        }
      }

      return {
        status: 'success',
        parsedData: { data_available: true, cert_found: true, searched_for: { make, model, year }, matched_model: matched, fuel_economy: fuel, raw },
        normalizedFacts: [
          { key: 'epa_us_certified', value: true, confidence: 88 },
          ...(fuel?.combinedMpg ? [{ key: 'epa_combined_mpg', value: fuel.combinedMpg, confidence: 85 }] : []),
          ...(fuel?.co2GramsPerMile ? [{ key: 'epa_co2_gpm', value: fuel.co2GramsPerMile, confidence: 85 }] : []),
        ],
        costUsd: 0,
      };
    } catch (err) {
      logger.error({ err }, 'usa_fed_epa_certification: lookup failed');
      return { status: 'failed', errorCode: 'lookup_error', errorMessage: err instanceof Error ? err.message : String(err) };
    }
  },
};
