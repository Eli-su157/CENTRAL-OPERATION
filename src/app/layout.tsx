import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Central de Operações',
  description: 'Gestão de operações de infoproduto',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[#111111] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
