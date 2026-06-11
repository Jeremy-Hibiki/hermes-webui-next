import type { Metadata, Viewport } from 'next';
import { Provider } from 'jotai';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { Toaster } from '@/components/ui/toast';
import { ServiceWorkerRegister } from '@/components/shared/service-worker-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hermes',
  description: 'Hermes Agent Web UI',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F0' },
    { media: '(prefers-color-scheme: dark)', color: '#141425' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Provider>
          <ThemeProvider>
            {children}
            <Toaster />
            <ServiceWorkerRegister />
          </ThemeProvider>
        </Provider>
      </body>
    </html>
  );
}
