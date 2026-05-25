import { Suspense } from 'react';
import { PreviewReportClient } from './preview-client';

export const metadata = {
  title: 'Reporte de ejemplo — CarCheck',
  description:
    'Mira un reporte CarCheck en vivo. Decodificación VIN + recalls + NMVTIS + valor de mercado + análisis IA en menos de 15 segundos.',
};

export default function EjemploPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="text-center mb-12">
        <p className="text-sm font-bold uppercase tracking-wide text-primary mb-3">
          Reporte de ejemplo en vivo
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Así se ve un <span className="text-primary">CarCheck</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Pega un VIN, corre el reporte completo (decodificación + recalls + NMVTIS + valor de
          mercado + análisis IA) y verás exactamente qué entregamos por $199 MXN.
        </p>
      </div>
      <Suspense>
        <PreviewReportClient />
      </Suspense>
    </div>
  );
}
