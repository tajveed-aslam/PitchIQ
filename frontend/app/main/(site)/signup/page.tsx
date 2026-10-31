import { Suspense } from "react";
import { SignupScreen } from "@/components/main/Auth";

export const metadata = { title: "Create your account" };

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen" />}><SignupScreen /></Suspense>;
}
