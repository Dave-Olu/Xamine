"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { isEmail } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) { setError("Enter a valid email address."); return; }
    setError(""); setLoading(true);
    try { await api.requestPasswordReset({ email: email.trim() }); setSent(true); }
    catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <h1 className="mb-2 text-[28px] font-extrabold">Reset your password</h1>
      <p className="mb-6 text-muted">Enter your school email and we will send you a link to reset your password.</p>
      {sent ? (
        <Alert kind="success">If that email is registered, a reset link is on its way. Check your inbox.</Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
          <Field id="email" label="School email" type="email" autoComplete="email" placeholder="info@school.edu.ng"
            value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" loading={loading}>Send reset link</Button>
        </form>
      )}
      <p className="mt-5 text-center text-[15px] text-muted">Remembered it? <Link href="/login" className="font-bold text-brand">Back to log in</Link></p>
    </>
  );
}
