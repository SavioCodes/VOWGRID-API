import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { CsrfProvider } from '@/components/security/csrf-provider';
import { getInitialCsrfToken } from '@/lib/vowgrid/csrf';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'VowGrid',
    template: '%s | VowGrid',
  },
  description: 'Every AI action needs context, permission, and proof.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const csrfToken = await getInitialCsrfToken();

  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <CsrfProvider initialToken={csrfToken}>{children}</CsrfProvider>
      </body>
    </html>
  );
}
