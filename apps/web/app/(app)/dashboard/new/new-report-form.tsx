'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export function NewReportForm() {
  const router = useRouter();
  const [vin, setVin] = useState('');
  const [tier, setTier] = useState<'tier1' | 'full'>('full');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (vin.length !== 17) {
      toast.error('El VIN debe tener 17 caracteres');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin,
          tier1Only: tier === 'tier1',
          preferFastModel: tier === 'tier1',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? 'Error al generar reporte');
        return;
      }
      if (data.reportId) {
        toast.success('Reporte generado');
        router.push(`/dashboard/reports/${data.reportId}` as never);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <label htmlFor="vin" className="block text-sm font-medium mb-2">
          VIN del vehículo (17 caracteres)
        </label>
        <input
          id="vin"
          type="text"
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase().replace(/\s/g, ''))}
          maxLength={17}
          placeholder="1HGCM82633A123456"
          className="w-full h-12 rounded-md border bg-background px-4 font-mono text-base uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground mt-2">
          El VIN está en la tarjeta de circulación, en el parabrisas (lado del conductor) o en el
          marco de la puerta del conductor.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <p className="font-medium mb-3">Tipo de reporte</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTier('tier1')}
            className={`text-left rounded-xl border-2 p-4 transition-colors ${
              tier === 'tier1' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
            }`}
            disabled={loading}
          >
            <div className="flex items-start justify-between mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold">~30s</span>
            </div>
            <p className="font-semibold">Esencial</p>
            <p className="text-sm text-muted-foreground mt-1">
              Fuentes tier 1 + IA Sonnet. Más rápido y barato.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setTier('full')}
            className={`text-left rounded-xl border-2 p-4 transition-colors ${
              tier === 'full' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
            }`}
            disabled={loading}
          >
            <div className="flex items-start justify-between mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold">~60s</span>
            </div>
            <p className="font-semibold">Completo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Las 96 fuentes + IA Opus 4.7 premium. Análisis profundo.
            </p>
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || vin.length !== 17}
        className="w-full h-12 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:opacity-90 inline-flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generando reporte… (puede tomar hasta 60 segundos)
          </>
        ) : (
          <>
            <ShieldCheck className="h-5 w-5" />
            Generar reporte completo
          </>
        )}
      </button>
      {loading ? (
        <p className="text-center text-sm text-muted-foreground">
          Consultando fuentes en paralelo + Claude AI está analizando los datos…
        </p>
      ) : null}
    </form>
  );
}
