import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/lib/accounts/session-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Your AI running and strength coach — adaptive training plans, recovery, nutrition, and an activity feed that actually pushes you.";

export const metadata: Metadata = {
  metadataBase: new URL("https://fitness.trollrunner.net"),
  title: {
    default: "TrollRunner Fitness",
    template: "%s · TrollRunner Fitness",
  },
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrollRunner Fitness",
  },
  openGraph: {
    title: "TrollRunner Fitness",
    description: DESCRIPTION,
    url: "https://fitness.trollrunner.net",
    siteName: "TrollRunner Fitness",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrollRunner Fitness",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
