import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/lib/accounts/session-context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme/theme-context";
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
  // Per-scheme so the mobile browser chrome matches the theme on screen.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
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
      suppressHydrationWarning
    >
      <head>
        {/* Stamps data-theme before first paint so a stored light/dark choice
            never flashes the other theme on load. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
