import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { esMX } from '@clerk/localizations';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://carcheck.mx'),
  title: {
    default: 'CarCheck — Auditoría vehicular completa para México y Estados Unidos',
    template: '%s | CarCheck',
  },
  description:
    'Reporte vehicular más completo de México. Consultamos más de 50 fuentes oficiales en menos de 15 segundos y nuestra IA te interpreta toda la información del auto que estás por comprar.',
  keywords: [
    'reporte vehicular',
    'historial de auto',
    'verificación VIN',
    'auto chocolate',
    'Carfax México',
    'REPUVE',
    'auditoría vehicular',
  ],
  authors: [{ name: 'NOVACORP' }],
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'CarCheck',
    title: 'CarCheck — Auditoría vehicular completa',
    description: 'Conoce todo sobre tu próximo auto antes de comprarlo.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider localization={esMX}>
          {children}
          <Toaster richColors position="top-right" />
          <Analytics />
          <SpeedInsights />
        </ClerkProvider>
      </body>
    </html>
  );
}
