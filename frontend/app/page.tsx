import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const features = [
  { t: "Remembers your device", d: "Stores your laptop details, symptoms and fixes.", c: "bg-mint-soft text-mint-fg" },
  { t: "Tracks what you tried", d: "Keeps a timeline of problems and solutions.", c: "bg-brand-soft text-brand" },
  { t: "Private to you", d: "Your data is only visible to you.", c: "bg-mint-soft text-mint-fg" },
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-surface via-page to-page-2">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-3 text-sm font-medium sm:gap-6">
          <a href="#features" className="hidden sm:inline">Features</a>
          <a href="#features" className="hidden sm:inline">How it works</a>
          <ThemeToggle />
          <Link href="/login" className="btn-outline !py-2">Log in</Link>
          <Link href="/signup" className="btn-primary !py-2">Get started</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-10 lg:grid-cols-2 lg:pt-20">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            The support agent that <span className="text-brand">remembers your laptop.</span>
          </h1>
          <p className="mt-5 max-w-md text-ink-muted">
            Tell Engram about your laptop once. It remembers every symptom and every fix, so you never explain the same problem twice.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/signup" className="btn-primary !px-7 !py-3">Get started</Link>
            <Link href="/login" className="btn-outline !px-8 !py-3">Log in</Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md" aria-hidden>
          <svg viewBox="0 0 400 300" className="w-full">
            <ellipse cx="200" cy="150" rx="190" ry="130" style={{ fill: "rgb(var(--il-glow))" }} opacity=".6" />
            <rect x="80" y="60" width="240" height="150" rx="14" style={{ fill: "rgb(var(--brand-dark))" }} />
            <rect x="92" y="72" width="216" height="126" rx="8" style={{ fill: "rgb(var(--il-screen))" }} />
            <rect x="150" y="100" width="100" height="70" rx="22" style={{ fill: "rgb(var(--brand-dark))" }} />
            <circle cx="177" cy="132" r="7" fill="#5eead4" /><circle cx="223" cy="132" r="7" fill="#5eead4" />
            <path d="M185 150q15 10 30 0" stroke="#5eead4" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M200 100V88" style={{ stroke: "rgb(var(--brand))" }} strokeWidth="4" /><circle cx="200" cy="84" r="5" style={{ fill: "rgb(var(--brand))" }} />
            <path d="M50 225h300l-24-15H74Z" style={{ fill: "rgb(var(--il-floor))" }} />
          </svg>
          {["Remembers your laptop", "Finds better fixes", "Keeps your history"].map((t, i) => (
            <span key={t} className="absolute rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold shadow-card"
              style={{ right: `${i === 1 ? -4 : 0}%`, top: `${8 + i * 26}%` }}>{t}</span>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.t} className="flex items-start gap-4 rounded-2xl bg-surface/80 p-5 shadow-card">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${f.c}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
            </span>
            <div><h3 className="font-bold">{f.t}</h3><p className="mt-1 text-sm text-ink-muted">{f.d}</p></div>
          </div>
        ))}
      </section>
    </main>
  );
}
