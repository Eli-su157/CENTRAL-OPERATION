import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'Central de Operações',
  description: 'Gestão de operações de infoproduto',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${GeistSans.className} ${GeistMono.variable} bg-[#09090B] text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
