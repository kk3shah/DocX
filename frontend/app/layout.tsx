import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
    title: 'HAP | Healthcare Accountability Project',
    description: 'Tracking the cost of bureaucracy in healthcare.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${mono.variable} font-sans antialiased bg-neutral-950 text-neutral-50 selection:bg-red-500/20`}>
                {children}
            </body>
        </html>
    );
}
