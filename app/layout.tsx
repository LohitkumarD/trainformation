import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Toaster } from '@/components/ui/toaster';
import { InstallPrompt } from '@/components/layout/InstallPrompt';

export const metadata: Metadata = {
  title: 'Coach Position Manager',
  description: 'Manage and view train coach position information for railway staff',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Coach Manager',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="bg-background text-foreground antialiased">
        <main className="min-h-screen pb-20">{children}</main>
        <BottomNav />
        <InstallPrompt />
        <Toaster />
      </body>
    </html>
  );
}
