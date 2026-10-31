import type { Viewport } from "next";
import { Barlow_Condensed, Inter, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

// Display fonts per edition (app/globals.css picks one): Lite's condensed sporty Barlow, Main's geometric Sora.
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-barlow" });
const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-sora" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
// Main's data labels ("scientific data typography" in the brief).
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const viewport: Viewport = { themeColor: "#050a14" };

// The edition (Africa = Lite in app/lite, Global = Main in app/main) is chosen by middleware.ts.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${barlow.variable} ${sora.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
