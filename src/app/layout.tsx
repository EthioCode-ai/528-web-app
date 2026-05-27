import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
// KaTeX stylesheet — required by react-markdown's rehype-katex plugin so
// math formulas in Markdown content render with proper typesetting. Must
// live in the root layout per Next.js 16's global-CSS-import rule.
import "katex/dist/katex.min.css";
import PostHogProvider from "@/components/PostHogProvider";

// Google Ads conversion tag (AW-18172788332). Loaded in the root layout
// so every page on 528web.neuromart.ai sends pageview + attribution data
// — required for Google Ads to track campaign-to-signup conversion paths.
// strategy="afterInteractive" loads the script after hydration so it
// does not block first paint.
const GOOGLE_ADS_ID = "AW-18172788332";

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
      <body className="min-h-full flex flex-col font-sans">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-ads-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ADS_ID}');
          `}
        </Script>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
