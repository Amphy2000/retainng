import type { Metadata } from 'next';
import './globals.css';
import { ClientAppShell } from '@/components/ClientAppShell';

export const metadata: Metadata = {
  title: 'RetainNG | Customer Retention for Nigerian SMEs',
  description:
    'Mobile-first customer retention engine for Nigerian barbers, salons, laundries, car washes, and boutiques. Honest records, consent-first follow-ups.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        <ClientAppShell>{children}</ClientAppShell>
      </body>
    </html>
  );
}
