import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/context/AppProviders";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ display: "swap", subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "800"] });
const geist = Geist({ display: "swap", subsets: ["latin"], variable: "--font-body", weight: ["300", "400", "500"] });
const geistMono = Geist_Mono({ display: "swap", subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "VidChain",
  description: "Proof-of-origin for Indonesian short-form creators.",
  icons: {
    apple: "/apple-icon.svg",
    icon: "/icon.svg",
    shortcut: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${bricolage.variable} ${geist.variable} ${geistMono.variable}`}>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}

