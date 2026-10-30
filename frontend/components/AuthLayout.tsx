import Image from "next/image";

export function AuthLayout({ title, subtitle, image, imageAlt, children }: {
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src={image} alt={imageAlt} fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/20 to-ink-950" />
      </div>
      <div className="flex items-center px-4 pb-16 pt-28 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <h1 className="heading">{title}</h1>
          <p className="mt-3 text-chalk/75">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-white">{label}</span>
      {children}
      {hint && <span className="block text-xs text-chalk/55">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-3 text-white placeholder:text-chalk/40 focus:border-pitch-400 focus:outline-none";

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-flare/40 bg-flare/10 px-4 py-3 text-sm text-chalk" data-testid="form-error">
      {message}
    </p>
  );
}
