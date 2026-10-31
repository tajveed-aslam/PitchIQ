import { Suspense } from "react";
import { LoginScreen } from "@/components/main/Auth";

export const metadata = { title: "Log in" };

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen" />}><LoginScreen /></Suspense>;
}
