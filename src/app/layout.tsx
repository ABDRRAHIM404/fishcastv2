import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import { siteConfig } from '@/config/site';
import '@/app/globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fontDisplay = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: '#06121d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable} dark`}>
      <body>{children}</body>
    </html>
  );
}
