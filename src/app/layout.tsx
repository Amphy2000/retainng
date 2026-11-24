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
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon-192.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RetainNG',
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
