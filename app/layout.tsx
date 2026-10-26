import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { APP_DESCRIPTION, APP_NAME, SITE_URL } from "@/lib/constants";
import "./globals.css";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow", display: "swap" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: { title: APP_NAME, description: APP_DESCRIPTION, siteName: APP_NAME, locale: "fr_FR", type: "website" },
  twitter: { card: "summary", title: APP_NAME, description: APP_DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#172554" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>{children}</body>
    </html>
  );
}
