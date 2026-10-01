import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NoIssue AI — Agentic Customer Resolution Platform',
  description:
    'Understand the Customer. Investigate the Problem. Resolve It. An enterprise agentic customer support platform with transparent multi-agent verification and human escalation.',
  keywords: ['AI customer support', 'agentic AI', 'RAG resolution', 'NoIssue AI', 'customer service automation'],
  authors: [{ name: 'NoIssue AI Team' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF8F5] text-[#323232] antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
