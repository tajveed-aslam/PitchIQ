import { NextResponse, type NextRequest } from "next/server";
import { EDITION_OF, REGION_COOKIE, type Region } from "@/config/editions";

// Serves the visitor's edition at the same URLs: "/" shows /lite (Africa, the default) or /main (Global), chosen by
// the region switch in the header. Later: when there's no cookie yet, default from the visitor's country
// (Vercel sends it as the x-vercel-ip-country header).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (first === "lite" || first === "main") return NextResponse.next(); // already an edition path

  const region = req.cookies.get(REGION_COOKIE)?.value as Region | undefined;
  const edition = EDITION_OF[region === "global" ? "global" : "africa"];
  const url = req.nextUrl.clone();
  url.pathname = `/${edition}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only: not Next.js internals or files (images, sample videos, favicon...).
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
