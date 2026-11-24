import { Geist_Mono, Noto_Sans_Georgian, Nunito } from 'next/font/google';
import { type ReactNode } from 'react';

import { APP_DESCRIPTION, APP_LOCALE, APP_NAME } from '@/shared/const/app.const';
import { LocaleProvider } from '@/shared/providers/locale-provider';
import { ThemeProvider } from '@/shared/providers/theme-provider';

import type { Metadata } from 'next';

import './globals.css';

// Rounded, friendly display + body face for the playful learning UI. Variable font (see note below).
const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
});

// Variable font on purpose: fixed weights make Google serve `/l/font?kit=…&skey=…` URLs,
// which Turbopack dev cannot resolve ("next/font/google queries have exactly one entry").
const notoSansGeorgian = Noto_Sans_Georgian({
  variable: '--font-georgian',
  subsets: ['georgian'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang={APP_LOCALE}
      className={`${nunito.variable} ${notoSansGeorgian.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
