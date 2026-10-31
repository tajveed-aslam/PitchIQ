import type { Metadata } from "next";
import { EditionProvider } from "@/lib/edition";

// PitchIQ Global (the Main edition): its own pages, components (components/main) and design. middleware.ts serves
// it at the normal URLs when the visitor picks the Global region. (site) = public pages, (app) = signed in.
export const metadata: Metadata = {
  title: { default: "PitchIQ: measured football skills, AI coaching, team tools", template: "%s · PitchIQ" },
  description: "Computer vision counts every juggling touch; a full player card, AI training plans, comparisons and coach rooms turn the numbers into progress.",
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <EditionProvider edition="main">
      <div data-edition="main" className="min-h-screen bg-ink-950 text-chalk">{children}</div>
    </EditionProvider>
  );
}
