import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";

/*
 * Typography:
 *   - Bricolage Grotesque  →  display (titles, wordmark)
 *   - Geist Mono           →  semi-mono UI labels
 *   - Inter                →  body copy
 *
 * Three Google Fonts, all OFL — no licensing concerns.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--body-font",
  display: "swap",
});

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--display-font",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--mono-font",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Duel Agents",
  description:
    "A framework for your IDE that runs concurrent AI agents on the best model per task, and splits work into sub-agents when it pays off. Cheaper, smarter, faster.",
  metadataBase: new URL("https://duelagents.com"),
  openGraph: {
    title: "Duel Agents",
    description:
      "Concurrent agents on the cheapest model that benchmarks predict will win.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Duel Agents",
    description:
      "Concurrent agents on the cheapest model that benchmarks predict will win.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable} ${geistMono.variable}`}
    >
      <body>
        <a
          href="#04-access"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-paper focus:text-ink focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:tracking-[0.14em] focus:border focus:border-ink"
        >
          SKIP TO APP
        </a>
        {children}
      </body>
    </html>
  );
}
