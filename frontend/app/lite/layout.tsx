import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { EDITIONS } from "@/config/editions";
import { EditionProvider } from "@/lib/edition";

// PitchIQ Lite (Africa, the default region). middleware.ts serves it at the normal URLs; the Global edition has its
// own tree, design and components in app/main/.
export const metadata: Metadata = {
  title: `${EDITIONS.lite.name}: AI football skill analysis`,
  description: "Film a juggling session on your phone and get your touch count, rhythm and control measured by computer vision, with coaching tips.",
};

export default function LiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <EditionProvider edition="lite">
      {/* data-edition switches the theme (app/globals.css); the wrapper paints the whole page in it */}
      <div data-edition="lite" className="flex min-h-screen flex-col bg-ink-950 text-chalk">
        <SiteHeader edition="lite" />
        <main className="flex-1">{children}</main>
        <SiteFooter edition="lite" />
      </div>
    </EditionProvider>
  );
}
