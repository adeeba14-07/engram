"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FieldError from "@/components/FieldError";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { api, getToken } from "@/lib/api";
import type { OnboardingPayload } from "@/lib/types";

const BRANDS = ["Dell", "HP", "Lenovo", "Apple", "Asus", "Acer", "MSI", "Microsoft Surface"];
const OSES = ["Windows", "macOS", "Linux", "Ubuntu", "Chrome OS"];
const bullets = ["We'll remember your laptop details", "Give better, personalized support", "You won't have to repeat yourself"];

export default function Onboarding() {
  const router = useRouter();
  const [f, setF] = useState({ brand: "", model: "", os_name: "", os_version: "", age: "18" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => { if (!getToken()) router.replace("/login"); }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const body: OnboardingPayload = {
        brand: f.brand.trim(), model: f.model.trim(),
        os_name: f.os_name.trim(), os_version: f.os_version.trim(),
        age_months: Number(f.age),
      };
      await api.onboarding(body);
      router.push("/chat");
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center gap-12 bg-gradient-to-br from-page to-page-2 px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="hidden w-72 lg:block">
        <ul className="space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 rounded-xl bg-surface/80 p-3 text-sm shadow-card">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint-soft text-mint-fg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              </span>{b}
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full max-w-[440px] rounded-2xl bg-surface p-8 shadow-card sm:p-10">
        <div className="mb-4 flex justify-center"><Logo size={36} /></div>
        <p className="mx-auto mb-4 w-fit rounded-full bg-mint-soft px-3 py-1 text-xs font-medium text-mint-fg">1 of 1</p>
        <h1 className="text-center text-2xl font-bold">Tell us about your laptop</h1>
        <p className="mt-2 text-center text-sm text-ink-muted">This becomes Engram's first memory of you.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label className="label" htmlFor="brand">Brand</label>
            <input id="brand" className="input" required list="brand-list" value={f.brand} onChange={set("brand")} placeholder="Type your laptop brand (e.g. Dell)" autoComplete="off" />
            <datalist id="brand-list">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist></div>
          <div><label className="label" htmlFor="model">Model</label>
            <input id="model" className="input" required value={f.model} onChange={set("model")} placeholder="Latitude 7400" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="os_name">Operating system</label>
              <input id="os_name" className="input" required list="os-list" value={f.os_name} onChange={set("os_name")} placeholder="Windows" autoComplete="off" />
              <datalist id="os-list">{OSES.map((o) => <option key={o} value={o} />)}</datalist></div>
            <div><label className="label" htmlFor="os_version">OS version</label>
              <input id="os_version" className="input" required value={f.os_version} onChange={set("os_version")} placeholder="11" /></div>
          </div>
          <div><label className="label" htmlFor="age">Laptop age</label>
            <div className="flex overflow-hidden rounded-lg border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <input id="age" type="number" min={0} max={240} required value={f.age} onChange={set("age")} className="w-full bg-surface px-3.5 py-2.5 text-sm outline-none" />
              <span className="border-l border-line bg-subtle px-4 py-2.5 text-sm text-ink-muted">months</span>
            </div></div>

          <FieldError message={error} />
          <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? "Saving..." : "Continue"}</button>
        </form>
      </div>
    </main>
  );
}
