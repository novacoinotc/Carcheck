import { Suspense } from 'react';
import { DecodeForm } from './decode-form';

export const metadata = {
  title: 'Decodificador VIN gratis',
  description:
    'Decodifica cualquier VIN y obtén marca, modelo, año, planta de origen y especificaciones técnicas en segundos. Gratis y sin registro.',
};

export default function DecodePage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Decodificador VIN <span className="text-primary">gratis</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Ingresa los 17 caracteres del VIN para obtener marca, modelo, año, planta de origen y
          especificaciones técnicas oficiales de NHTSA.
        </p>
      </div>
      <Suspense>
        <DecodeForm />
      </Suspense>
    </div>
  );
}
