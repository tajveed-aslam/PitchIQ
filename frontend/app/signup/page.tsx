"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthLayout, Field, FormError, inputCls } from "@/components/AuthLayout";
import { EDITION } from "@/config/editions";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

function SignupForm() {
  const router = useRouter();
  const planParam = useSearchParams().get("plan");
  const initialPlan = EDITION.plans.some((p) => p.id === planParam) ? planParam! : "trial";
  const { login } = useSession();
  const [plan, setPlan] = useState(initialPlan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const { access_token } = await api<{ access_token: string }>("/auth/signup", {
        method: "POST",
        json: { name: form.get("name"), email: form.get("email"), password: form.get("password"), plan },
      });
      await login(access_token);
      router.push("/profile?welcome=1");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Your name">
        <input name="name" required maxLength={80} autoComplete="name" className={inputCls} data-testid="signup-name" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={inputCls} data-testid="signup-email" />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} data-testid="signup-password" />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-white">Plan <span className="font-normal text-chalk/55">(test mode, nothing is charged)</span></legend>
        <div className="grid grid-cols-2 gap-2">
          {EDITION.plans.map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-xl border p-3 text-sm transition ${plan === p.id ? "border-pitch-400 bg-pitch-400/10" : "border-white/15 hover:border-white/30"}`}>
              <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} className="sr-only" />
              <span className="block font-semibold text-white">{p.name}</span>
              <span className="text-chalk/60">{p.price} {p.period}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormError message={error} />
      <button type="submit" disabled={busy} className="btn-primary w-full" data-testid="signup-submit">
        {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />} Create account
      </button>
      <p className="text-center text-sm text-chalk/70">
        Already have one? <Link href="/login" className="font-semibold text-pitch-300 hover:underline">Log in</Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <AuthLayout title="Start training smarter" subtitle="Free for 7 days: three analyses with AI coaching. No card needed." image="/images/knee-volley.webp" imageAlt="A player lifts the ball with his knee on a floodlit pitch">
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  );
}
