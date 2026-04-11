import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// KaTeX stylesheet — required by react-markdown's rehype-katex plugin so
// math formulas in Markdown content render with proper typesetting. Must
// live in the root layout per Next.js 16's global-CSS-import rule.
import "katex/dist/katex.min.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "528 AI — MCAT Study Engine",
  description: "AI-powered MCAT prep by Neuromart",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
