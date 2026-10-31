import type { Viewport } from "next";
import { Barlow_Condensed, Inter, Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

// Display fonts per edition (app/globals.css picks one): Lite's condensed sporty Barlow, Main's geometric Sora.
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-barlow" });
const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-sora" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const viewport: Viewport = { themeColor: "#050a14" };

// The edition (Africa = Lite, Global = Main) is chosen in app/[edition]/layout.tsx; see middleware.ts.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${barlow.variable} ${sora.variable} ${body.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
