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

// Pages both editions have: switching region on one of these stays on it; anywhere else goes to the home page
// (e.g. Global's /rooms has no Lite equivalent).
const SHARED_PATHS = ["/", "/samples", "/login", "/signup", "/support", "/dashboard", "/upload", "/reports"];

/** Remember the visitor's region for a year and reload so every page renders in that edition. */
export function chooseRegion(region: Region) {
  document.cookie = `${REGION_COOKIE}=${region}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  const path = window.location.pathname;
  const shared = SHARED_PATHS.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")));
  if (shared) window.location.reload();
  else window.location.assign("/");
}
