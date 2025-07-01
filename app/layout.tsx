import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TelegramScript } from '../components/telegram-script';
import { BottomNavigation } from '../components/ui/bottom-navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Telegram Mini App - CRM',
  description: 'CRM система для сотрудников компании',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#0088cc',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <TelegramScript />
      </head>
      <body className={inter.className}>
        <div className="telegram-webapp flex flex-col min-h-screen">
          {/* Добавлен отступ снизу, чтобы контент не перекрывался BottomNavigation */}
          <main className="flex-1 pb-16">
            {children}
          </main>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
