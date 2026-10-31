"use client";

import { Globe } from "lucide-react";
import type { Region } from "@/config/editions";
import { chooseRegion, useEdition } from "@/lib/edition";

/** Africa = PitchIQ Lite (low data), Global = the full PitchIQ. A native select: accessible and phone-friendly. */
export function RegionSwitch({ className = "" }: { className?: string }) {
  const edition = useEdition();
  return (
    <label className={`flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm text-chalk hover:border-accent-400 ${className}`}>
      <Globe className="h-4 w-4 text-accent-400" aria-hidden="true" />
      <span className="sr-only">Region</span>
      <select
        value={edition.region}
        onChange={(e) => chooseRegion(e.target.value as Region)}
        className="cursor-pointer bg-transparent pr-1 font-medium text-white focus:outline-none"
        data-testid="region-switch"
      >
        <option value="africa" className="bg-ink-900">Africa</option>
        <option value="global" className="bg-ink-900">Global</option>
      </select>
    </label>
  );
}
