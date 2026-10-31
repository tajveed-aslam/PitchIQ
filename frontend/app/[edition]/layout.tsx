import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { MainComingSoon } from "@/components/MainComingSoon";
import { SiteHeader } from "@/components/SiteHeader";
import { EDITION_IDS, EDITIONS, isEdition } from "@/config/editions";
import { EditionProvider } from "@/lib/edition";

// Both editions are prerendered; middleware.ts picks which one a visitor sees at the normal URLs.
export const dynamicParams = false;

export function generateStaticParams() {
  return EDITION_IDS.map((edition) => ({ edition }));
}

export function generateMetadata({ params }: { params: { edition: string } }): Metadata {
  const e = isEdition(params.edition) ? EDITIONS[params.edition] : EDITIONS.lite;
  return {
    title: `${e.name}: AI football skill analysis`,
    description: "Film a juggling session on your phone and get your touch count, rhythm and control measured by computer vision, with coaching tips.",
  };
}

export default function EditionLayout({ children, params }: { children: React.ReactNode; params: { edition: string } }) {
  if (!isEdition(params.edition)) notFound();
  return (
    <EditionProvider edition={params.edition}>
      {/* data-edition switches the theme (app/globals.css); the wrapper paints the whole page in it */}
      <div data-edition={params.edition} className="flex min-h-screen flex-col bg-ink-950 text-chalk">
        <SiteHeader edition={params.edition} minimal={params.edition === "main"} />
        {/* Global (Main) is the next phase: every Global URL shows its coming-soon page for now */}
        <main className="flex-1">{params.edition === "main" ? <MainComingSoon /> : children}</main>
        <SiteFooter edition={params.edition} />
      </div>
    </EditionProvider>
  );
}
