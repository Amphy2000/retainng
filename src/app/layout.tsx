import type { Metadata } from 'next';
import './globals.css';
import { ClientAppShell } from '@/components/ClientAppShell';

export const metadata: Metadata = {
  title: 'RetainNG | WhatsApp AI Retention & Refill Autopilot for Nigerian Pharmacies',
  description:
    'WhatsApp AI concierge, automated 28-day chronic refill countdowns, native dialect voice notes (Hausa/Yoruba/Igbo), and 1-tap dispatch for community pharmacies.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/brand/retainng-logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
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
