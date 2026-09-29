import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function AuthCard({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-page to-page-2 px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-[440px] rounded-2xl bg-surface p-8 shadow-card sm:p-10">
        <div className="mb-6 flex justify-center"><Logo size={36} /></div>
        <h1 className="text-center text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-center text-sm text-ink-muted">{subtitle}</p>
        <div className="mt-7">{children}</div>
        <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>
      </div>
    </main>
  );
}
