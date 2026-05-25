import { Suspense } from 'react';
import { NewReportForm } from './new-report-form';

export const metadata = {
  title: 'Nuevo reporte',
};

export default function NewReportPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Nuevo reporte vehicular</h1>
        <p className="text-muted-foreground">
          Captura el VIN del auto. Consultamos hasta 96 fuentes y nuestra IA genera tu reporte
          completo en menos de 1 minuto.
        </p>
      </div>
      <Suspense>
        <NewReportForm />
      </Suspense>
    </div>
  );
}
