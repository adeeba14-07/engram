import Link from "next/link";

/** Brain (left) + wrench (right): the assistant that remembers and fixes. Theme-aware colors. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <g stroke="rgb(var(--brand))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="rgb(var(--brand-soft))">
        <path d="M19.2 6.6C16.8 5.6 14.4 6 12.9 7.6 10.4 7.1 8.3 9.1 8.7 11.6 6.4 12.6 5.9 15.6 7.5 17.4 5.7 19.1 6 22.1 8 23.4 7.8 26 9.5 28.2 12 28.5c.8 2.5 3.5 3.7 5.5 2.7.8 1 1.7 1.3 1.7 1.3z" />
        <path d="M21.2 6.6C23.6 5.6 26 6 27.4 7.6c1.9-.1 3.3 1.1 3.3 2.9L28.4 13.4l4.3-1.4c2.4 1.4 3.2 4.8 1.2 7.2-.8.9-1.9 1.5-3 1.6L25.8 30.8c-1 1.6-2.8 2-4.6 1.7z" />
        <path d="M26.2 18.5 22.8 28" fill="none" />
      </g>
      <g fill="rgb(var(--brand))">
        <circle cx="12.4" cy="13" r="1.2" /><circle cx="12.4" cy="18" r="1.2" /><circle cx="12.4" cy="23" r="1.2" />
      </g>
      <path d="M13.4 13h2.4M13.4 18h3M13.4 23h2.4" stroke="rgb(var(--brand))" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ size = 32, href = "/" }: { size?: number; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
      <LogoMark size={size} />
      <span>Engr<span className="text-brand">am</span></span>
    </Link>
  );
}
