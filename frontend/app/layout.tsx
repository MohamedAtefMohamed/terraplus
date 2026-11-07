import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/app/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: {
    default: "TerraPulse — Earth Surface Intelligence",
    template: "%s · TerraPulse",
  },
  description:
    "Understand Earth's changes before they become disasters. An interactive SAR surface-intelligence platform built for the NASA Space Apps Challenge, using clearly labelled synthetic demo data and NISAR-ready architecture.",
  keywords: ["NASA", "NISAR", "SAR", "remote sensing", "flood", "wetland", "Earth observation"],
  applicationName: "TerraPulse",
  authors: [{ name: "TerraPulse team" }],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "TerraPulse — Earth Surface Intelligence",
    description:
      "Understand Earth's changes before they become disasters. Interactive SAR change analysis inspired by NASA-ISRO NISAR.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}