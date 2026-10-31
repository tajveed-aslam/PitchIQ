"use client";

// Main (Global) sign-in screens: a split layout with a photo, the two demo accounts up front.
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, PlayCircle, Users } from "lucide-react";
import { EDITIONS } from "@/config/editions";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { ErrorNote } from "./ui";

function Frame({ title, sub, children, image, alt }: { title: string; sub: string; children: React.ReactNode; image: string; alt: string }) {
  return (
    <section className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src={image} alt={alt} fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/30 via-ink-950/40 to-ink-950" />
        <div className="absolute inset-x-10 bottom-12 max-w-md">
          <p className="hud text-accent-200">PitchIQ Global</p>
          <p className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.03em] text-white">Every touch counted. Every number on your card measured.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 pb-16 pt-28 sm:px-10">
        <div className="w-full max-w-md animate-rise">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-white">{title}</h1>
          <p className="mt-2 text-chalk/70">{sub}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-chalk/85">{text}</span>
      {children}
    </label>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const { login } = useSession();
  const [busy, setBusy] = useState<"form" | "player" | "coach" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const auto = useRef(false);

  async function demo(kind: "player" | "coach") {
    setBusy(kind);
    setError(null);
    try {
      const { access_token } = await api<{ access_token: string }>(kind === "coach" ? "/auth/demo-coach" : "/auth/demo", { method: "POST" });
      await login(access_token);
      router.push(kind === "coach" ? "/rooms" : "/dashboard");
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  useEffect(() => {
    const d = params.get("demo");
    if (!auto.current && (d === "player" || d === "coach")) {
      auto.current = true;
      demo(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy("form");
    setError(null);
    try {
      const { access_token } = await api<{ access_token: string }>("/auth/login", {
        method: "POST", json: { email: form.get("email"), password: form.get("password") },
      });
      await login(access_token);
      router.push(next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <Frame title="Welcome back" sub="Log in, or look around with a demo account first." image="/images/main/night-kick.webp" alt="A player volleys a ball under stadium floodlights at night">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => demo("player")} disabled={busy !== null} className="glass glass-hover flex items-center gap-3 p-4 text-left" data-testid="demo-login">
          {busy === "player" ? <Loader2 className="h-5 w-5 animate-spin text-accent-300" aria-hidden="true" /> : <PlayCircle className="h-5 w-5 text-accent-300" aria-hidden="true" />}
          <span><span className="block text-sm font-semibold text-white">Demo player</span><span className="text-xs text-chalk/60">8 weeks of sessions</span></span>
        </button>
        <button type="button" onClick={() => demo("coach")} disabled={busy !== null} className="glass glass-hover flex items-center gap-3 p-4 text-left" data-testid="demo-coach-login">
          {busy === "coach" ? <Loader2 className="h-5 w-5 animate-spin text-accent-300" aria-hidden="true" /> : <Users className="h-5 w-5 text-accent-300" aria-hidden="true" />}
          <span><span className="block text-sm font-semibold text-white">Demo coach</span><span className="text-xs text-chalk/60">A squad and a trial</span></span>
        </button>
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-chalk/50"><span className="h-px flex-1 bg-white/10" /> or with your account <span className="h-px flex-1 bg-white/10" /></div>
      <form onSubmit={submit} className="space-y-4">
        <Label text="Email"><input name="email" type="email" required autoComplete="email" className="m-input" data-testid="login-email" /></Label>
        <Label text="Password"><input name="password" type="password" required autoComplete="current-password" className="m-input" data-testid="login-password" /></Label>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy !== null} className="btn-primary w-full !py-3.5" data-testid="login-submit">
          {busy === "form" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Log in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-chalk/60">New here? <Link href="/signup" className="text-white underline-offset-4 hover:underline">Create an account</Link></p>
    </Frame>
  );
}

export function SignupScreen() {
  const router = useRouter();
  const planParam = useSearchParams().get("plan");
  const plans = EDITIONS.main.plans.filter((p) => !p.comingSoon);
  const [plan, setPlan] = useState(plans.some((p) => p.id === planParam) ? planParam! : "trial");
  const { login } = useSession();
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
        json: { name: form.get("name"), email: form.get("email"), password: form.get("password"), plan, edition: "main" },
      });
      await login(access_token);
      router.push(plan === "team" ? "/rooms" : "/card?welcome=1");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Frame title="Create your account" sub="Start with three free analyses, or pick a plan (test mode: nothing is charged)." image="/images/main/thigh-control.webp" alt="Close-up of a player controlling a ball on her thigh on an artificial pitch">
      <form onSubmit={submit} className="space-y-4">
        <Label text="Name"><input name="name" required maxLength={80} autoComplete="name" className="m-input" data-testid="signup-name" /></Label>
        <Label text="Email"><input name="email" type="email" required autoComplete="email" className="m-input" data-testid="signup-email" /></Label>
        <Label text="Password"><input name="password" type="password" required minLength={8} autoComplete="new-password" className="m-input" data-testid="signup-password" /></Label>
        <fieldset>
          <legend className="text-sm font-medium text-chalk/85">Plan</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {plans.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm transition ${plan === p.id ? "border-accent-400/60 bg-accent-400/10 text-white" : "border-white/10 text-chalk/80 hover:border-white/20"}`}>
                <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} className="sr-only" data-testid={`signup-plan-${p.id}`} />
                <span><span className="block font-medium">{p.name}</span><span className="text-xs text-chalk/60">{p.price} {p.period}</span></span>
                {plan === p.id && <Check className="h-4 w-4 text-accent-300" aria-hidden="true" />}
              </label>
            ))}
          </div>
        </fieldset>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className="btn-primary w-full !py-3.5" data-testid="signup-submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-chalk/60">Already have an account? <Link href="/login" className="text-white underline-offset-4 hover:underline">Log in</Link></p>
    </Frame>
  );
}
