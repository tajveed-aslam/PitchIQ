"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { AuthLayout, Field, FormError, inputCls } from "@/components/AuthLayout";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const { login } = useSession();
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy("form");
    setError(null);
    try {
      const { access_token } = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        json: { email: form.get("email"), password: form.get("password") },
      });
      await login(access_token);
      router.push(next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  async function demo() {
    setBusy("demo");
    setError(null);
    try {
      const { access_token } = await api<{ access_token: string }>("/auth/demo", { method: "POST" });
      await login(access_token);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={demo} disabled={busy !== null} className="btn-primary w-full" data-testid="demo-login">
        {busy === "demo" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <PlayCircle className="h-5 w-5" aria-hidden="true" />}
        Try the demo player
      </button>
      <p className="text-center text-sm text-chalk/60">Eight weeks of sessions already in it. No sign-up.</p>
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-chalk/60">
        <span className="h-px flex-1 bg-white/10" /> or log in <span className="h-px flex-1 bg-white/10" />
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate={false}>
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" className={inputCls} data-testid="login-email" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required autoComplete="current-password" className={inputCls} data-testid="login-password" />
        </Field>
        <FormError message={error} />
        <button type="submit" disabled={busy !== null} className="btn-secondary w-full" data-testid="login-submit">
          {busy === "form" && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />} Log in
        </button>
      </form>
      <p className="text-center text-sm text-chalk/70">
        New here? <Link href="/signup" className="font-semibold text-pitch-300 hover:underline">Start your free trial</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Log in to see your reports and upload new sessions." image="/images/head-height.webp" imageAlt="A player watches the ball drop from head height under floodlights">
      {/* fixed-height placeholder while the form loads: no layout shift (Lighthouse CLS) */}
      <Suspense fallback={<div className="min-h-[460px]" />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
