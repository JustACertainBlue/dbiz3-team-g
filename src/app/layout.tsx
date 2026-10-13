import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hanoi Artisan Bridge',
  description: 'Explore Hanoi craft village experiences'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}</body></html>;
}
