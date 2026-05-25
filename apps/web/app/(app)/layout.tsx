import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-primary">Car</span>Check
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              Mis reportes
            </Link>
            <Link href="/dashboard/new" className="hover:text-primary transition-colors">
              Nuevo reporte
            </Link>
            <Link href="/dashboard/account" className="hover:text-primary transition-colors">
              Cuenta
            </Link>
          </nav>
          <UserButton />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
