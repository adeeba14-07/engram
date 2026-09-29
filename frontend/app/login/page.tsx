"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard from "@/components/AuthCard";
import FieldError from "@/components/FieldError";
import PasswordInput from "@/components/PasswordInput";
import { api, setToken } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      router.push("/chat");
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <AuthCard title="Log in to your account" subtitle="Continue to your laptop support assistant."
      footer={<>New here? <Link href="/signup" className="text-brand underline">Create account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@example.com" className="input" /></div>
        <div><label className="label">Password</label><PasswordInput value={password} onChange={setPassword} error={!!error} />
          <FieldError message={error} /></div>
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? "Logging in..." : "Log in"}</button>
      </form>
    </AuthCard>
  );
}
