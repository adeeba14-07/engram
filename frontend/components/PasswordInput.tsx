"use client";
import { useState } from "react";

export default function PasswordInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"} value={value} required minLength={8} autoComplete="current-password"
        onChange={(e) => onChange(e.target.value)} placeholder="At least 8 characters"
        className={`input pr-10 ${error ? "input-error" : ""}`}
      />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
          {show && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
