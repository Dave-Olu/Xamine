"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { MIN_PASSWORD } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (confirm !== password) next.confirm = "The passwords do not match.";
    setErrors(next); setFormError("");
    if (Object.keys(next).length) return;
    setLoading(true);
    try { await api.resetPassword({ token, password }); router.push("/login"); }
    catch (err) { setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
      {!token && <Alert kind="error">This link is missing its token. Request a new one.</Alert>}
      {formError && <Alert kind="error">{formError}</Alert>}
      <Field id="password" label="New password" type="password" autoComplete="new-password" placeholder="Minimum 8 characters"
        value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      <Field id="confirm" label="Confirm new password" type="password" autoComplete="new-password" placeholder="Repeat the password"
        value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
      <Button type="submit" loading={loading} disabled={!token}>Update password</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="mb-2 text-[28px] font-extrabold">Choose a new password</h1>
      <p className="mb-6 text-muted">Use at least 8 characters. You will use it to log in next time.</p>
      <Suspense><ResetForm /></Suspense>
      <p className="mt-5 text-center text-[15px] text-muted">Link expired? <Link href="/forgot-password" className="font-bold text-brand">Request a new one</Link></p>
    </>
  );
}
