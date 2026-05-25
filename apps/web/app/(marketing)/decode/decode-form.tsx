'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface DecodeResult {
  vin: string;
  checksum_valid: boolean;
  decoded: {
    make: string | null;
    model: string | null;
    modelYear: number | null;
    trim: string | null;
    bodyClass: string | null;
    plantCountry: string | null;
    plantState: string | null;
    plantCity: string | null;
    manufacturer: string | null;
    engineCylinders: number | null;
    engineDisplacementL: number | null;
    fuelType: string | null;
    transmissionStyle: string | null;
    driveType: string | null;
  };
  recalls: {
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
  } | null;
  meta: { sources: Array<{ key: string; status: string; ms: number }> };
}

type RecallItem = NonNullable<DecodeResult['recalls']>['recalls'][number];

const EXAMPLE_VINS = [
  { vin: '5YJ3E1EA0KF317432', label: 'Tesla Model 3 (2019)' },
  { vin: '1HGCM82633A123456', label: 'Honda Accord (2003)' },
  { vin: 'WVGEF9BP3GD007203', label: 'VW Tiguan (2016)' },
];

export function DecodeForm() {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecodeResult | null>(null);

  async function decode(vinValue: string) {
    if (vinValue.length !== 17) {
      toast.error('El VIN debe tener exactamente 17 caracteres');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/v1/decode?vin=${encodeURIComponent(vinValue)}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? 'Error al decodificar');
        return;
      }
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void decode(vin);
        }}
        className="flex flex-col sm:flex-row gap-3 mb-3"
      >
        <input
          type="text"
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase().replace(/\s/g, ''))}
          maxLength={17}
          placeholder="1HGCM82633A123456"
          className="flex-1 h-12 rounded-md border bg-background px-4 font-mono text-base uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          aria-label="VIN del vehículo"
        />
        <button
          type="submit"
          disabled={loading || vin.length !== 17}
          className="h-12 rounded-md bg-primary px-8 font-medium text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Decodificar
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-8 text-sm">
        <span className="text-muted-foreground">Prueba con:</span>
        {EXAMPLE_VINS.map((ex) => (
          <button
            key={ex.vin}
            type="button"
            onClick={() => {
              setVin(ex.vin);
              void decode(ex.vin);
            }}
            className="text-primary hover:underline"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {result ? <DecodeResultCard result={result} /> : null}
    </>
  );
}

function DecodeResultCard({ result }: { result: DecodeResult }) {
  const recallsCount = result.recalls?.openRecallCount ?? 0;
  const parkIt = result.recalls?.parkItRecalls ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <p className="text-sm text-muted-foreground">VIN</p>
            <p className="font-mono text-lg font-semibold">{result.vin}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Checksum</p>
            <p
              className={
                result.checksum_valid
                  ? 'text-risk-green font-medium inline-flex items-center gap-1'
                  : 'text-risk-yellow font-medium inline-flex items-center gap-1'
              }
            >
              {result.checksum_valid ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Válido
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" /> No verifica
                </>
              )}
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-1">
          {result.decoded.make ?? 'Marca desconocida'}{' '}
          {result.decoded.model ?? ''}{' '}
          {result.decoded.modelYear ?? ''}
        </h2>
        {result.decoded.bodyClass ? (
          <p className="text-muted-foreground mb-6">{result.decoded.bodyClass}</p>
        ) : null}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Versión" value={result.decoded.trim} />
          <Field label="Tracción" value={result.decoded.driveType} />
          <Field label="Combustible" value={result.decoded.fuelType} />
          <Field label="Transmisión" value={result.decoded.transmissionStyle} />
          <Field
            label="Motor"
            value={
              result.decoded.engineCylinders
                ? `${result.decoded.engineCylinders} cil${
                    result.decoded.engineDisplacementL
                      ? ` · ${result.decoded.engineDisplacementL.toFixed(1)}L`
                      : ''
                  }`
                : null
            }
          />
          <Field label="Fabricante" value={result.decoded.manufacturer} />
          <Field
            label="Planta de origen"
            value={
              [result.decoded.plantCity, result.decoded.plantState, result.decoded.plantCountry]
                .filter(Boolean)
                .join(', ') || null
            }
          />
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6 border-t pt-4">
          Fuentes: NHTSA vPIC ({result.meta.sources[0]?.ms}ms) + NHTSA Recalls (
          {result.meta.sources[1]?.ms}ms)
        </p>
      </div>

      <RecallsSection
        recalls={result.recalls?.recalls ?? []}
        openCount={recallsCount}
        parkItCount={parkIt}
      />

      <div className="rounded-2xl border bg-primary/5 border-primary/20 p-6 text-center">
        <h3 className="text-lg font-bold mb-2">
          Esto es solo lo gratis — el reporte completo trae 90+ fuentes
        </h3>
        <p className="text-muted-foreground mb-4 max-w-xl mx-auto">
          REPUVE, OCRA, RUG, SAT, ANAM, NMVTIS, los 32 estados de México, verificación ambiental,
          subastas y más. Todo analizado por Claude AI en menos de 15 segundos.
        </p>
        <Link
          href="/precios"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-8 font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Ver reporte completo desde $199 MXN
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function RecallsSection({
  recalls,
  openCount,
  parkItCount,
}: {
  recalls: RecallItem[];
  openCount: number;
  parkItCount: number;
}) {
  if (openCount === 0) {
    return (
      <div className="rounded-2xl border border-risk-green/30 bg-risk-green/5 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-risk-green flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">Sin recalls abiertos</h3>
            <p className="text-sm text-muted-foreground">
              NHTSA no reporta llamados a revisión activos para este VIN.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div
        className={
          parkItCount > 0
            ? 'p-6 bg-risk-red/10 border-b border-risk-red/30'
            : 'p-6 bg-risk-yellow/10 border-b border-risk-yellow/30'
        }
      >
        <div className="flex items-center gap-3">
          {parkItCount > 0 ? (
            <AlertOctagon className="h-8 w-8 text-risk-red flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-risk-yellow flex-shrink-0" />
          )}
          <div>
            <h3 className="font-bold text-lg">
              {openCount} recall{openCount > 1 ? 's' : ''} abierto{openCount > 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-muted-foreground">
              {parkItCount > 0 ? (
                <strong className="text-risk-red">
                  ⚠ {parkItCount} con orden de NO usar el auto hasta repararlo.
                </strong>
              ) : (
                'Llevarlo a agencia es GRATIS — las reparaciones de recall no cuestan.'
              )}
            </p>
          </div>
        </div>
      </div>
      <div className="divide-y">
        {recalls.map((recall) => (
          <div key={recall.campaignNumber} className="p-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h4 className="font-semibold">{recall.component}</h4>
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                {recall.campaignNumber}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{recall.summary}</p>
            <div className="text-sm">
              <p className="font-medium text-foreground">Solución:</p>
              <p className="text-muted-foreground">{recall.remedy}</p>
            </div>
            {recall.parkIt || recall.parkOutside ? (
              <p className="text-sm font-medium text-risk-red mt-3">
                ⚠ {recall.parkIt ? 'NO USAR el auto' : 'Estacionar AFUERA'} hasta que se repare.
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium">{value ?? '—'}</p>
    </div>
  );
}
