"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { isEmail, MIN_PASSWORD } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isEmail(email)) next.email = "Enter a valid email address.";
    if (password.length < MIN_PASSWORD) next.password = `Password must be at least ${MIN_PASSWORD} characters.`;
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await api.login({ email: email.trim(), password });
      router.push("/dashboard");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally { setLoading(false); }
  }

  return (
    <>
      <h1 className="mb-2 text-[28px] font-extrabold">Welcome back</h1>
      <p className="mb-6 text-muted">Log in to manage your school&apos;s exams.</p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        {formError && <Alert kind="error">{formError}</Alert>}
        <Field id="email" label="School email" type="email" autoComplete="email" placeholder="info@school.edu.ng"
          value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" placeholder="Your password"
          value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="text-right text-[15px]"><Link href="/forgot-password" className="font-bold text-brand">Forgot password?</Link></div>
        <Button type="submit" loading={loading}>Log in</Button>
      </form>
      <p className="mt-6 text-center text-[15px] text-muted">
        Taking an exam? <Link href="/student" className="font-bold text-brand">Enter your exam number</Link>
      </p>
    </>
  );
}
