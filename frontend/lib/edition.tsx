"use client";

import { createContext, useContext } from "react";
import { EDITIONS, REGION_COOKIE, type Edition, type EditionConfig, type Region } from "@/config/editions";

const EditionContext = createContext<EditionConfig>(EDITIONS.lite);

export function EditionProvider({ edition, children }: { edition: Edition; children: React.ReactNode }) {
  return <EditionContext.Provider value={EDITIONS[edition]}>{children}</EditionContext.Provider>;
}

export function useEdition(): EditionConfig {
  return useContext(EditionContext);
}

/** Remember the visitor's region for a year and reload so every page renders in that edition. */
export function chooseRegion(region: Region) {
  document.cookie = `${REGION_COOKIE}=${region}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.reload();
}
