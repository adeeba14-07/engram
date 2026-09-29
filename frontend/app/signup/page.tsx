"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard from "@/components/AuthCard";
import FieldError from "@/components/FieldError";
import PasswordInput from "@/components/PasswordInput";
import { api, setToken } from "@/lib/api";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const { token } = await api.signup(email, password, name);
      setToken(token);
      router.push("/onboarding");
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <AuthCard title="Create your account" subtitle="Start chatting with your personal laptop support agent."
      footer={<>Already have one? <Link href="/login" className="text-brand underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="name">Name</label>
          <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" autoComplete="name" /></div>
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="priya@example.com" className={`input ${error ? "input-error" : ""}`} />
          <FieldError message={error} /></div>
        <div><label className="label">Password</label><PasswordInput value={password} onChange={setPassword} /></div>
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
      </form>
    </AuthCard>
  );
}
