import Link from 'next/link';
import { Show, UserButton } from '@clerk/nextjs';

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md bg-background/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-primary">Car</span>Check
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/decode" className="hover:text-primary transition-colors">
              Decodificador VIN gratis
            </Link>
            <Link href="/precios" className="hover:text-primary transition-colors">
              Precios
            </Link>
            <Link href="/fuentes" className="hover:text-primary transition-colors">
              Fuentes
            </Link>
            <Link href="/para-empresas" className="hover:text-primary transition-colors">
              Para empresas
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                Crear cuenta
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Mi cuenta
              </Link>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-muted/30 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="font-bold text-lg mb-3">
                <span className="text-primary">Car</span>Check
              </h3>
              <p className="text-sm text-muted-foreground">
                Auditoría vehicular completa para México y Estados Unidos. Más de 90 fuentes
                oficiales analizadas por inteligencia artificial.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Producto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/decode" className="hover:text-foreground">Decodificador VIN</Link></li>
                <li><Link href="/precios" className="hover:text-foreground">Precios</Link></li>
                <li><Link href="/fuentes" className="hover:text-foreground">Fuentes de datos</Link></li>
                <li><Link href="/ejemplo" className="hover:text-foreground">Reporte ejemplo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Para empresas</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/api" className="hover:text-foreground">API white-label</Link></li>
                <li><Link href="/marketplaces" className="hover:text-foreground">Marketplaces</Link></li>
                <li><Link href="/agencias" className="hover:text-foreground">Agencias y lotes</Link></li>
                <li><Link href="/aseguradoras" className="hover:text-foreground">Aseguradoras</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacidad" className="hover:text-foreground">Aviso de privacidad</Link></li>
                <li><Link href="/terminos" className="hover:text-foreground">Términos de uso</Link></li>
                <li><Link href="/cumplimiento" className="hover:text-foreground">Cumplimiento</Link></li>
                <li><Link href="/contacto" className="hover:text-foreground">Contacto</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} CarCheck por NOVACORP. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
