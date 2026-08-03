import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import { LocaleProvider } from '@/i18n/provider';
import { directionForLocale } from '@/i18n/config';
import { getRequestLocale } from '@/i18n/server';
import { createTranslator } from '@/i18n/dictionaries';
import { siteConfig } from '@/config/site';
import '@/app/globals.css';

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  return {
    title: {
      default: `${siteConfig.name} — ${t('site.tagline')}`,
      template: `%s · ${siteConfig.name}`,
    },
    description: t('site.description'),
  };
}

export const viewport: Viewport = {
  themeColor: '#06121d',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  return (
    <html
      lang={locale}
      dir={directionForLocale(locale)}
      className={`${fontSans.variable} ${fontDisplay.variable} dark`}
    >
      <body>
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
