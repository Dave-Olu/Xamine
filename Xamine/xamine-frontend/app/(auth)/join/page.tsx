"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { isEmail, MIN_PASSWORD } from "@/lib/validation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export default function JoinSchoolPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (code.trim().length < 8) next.code = "Enter the access code you were given.";
    if (!name.trim()) next.name = "Enter your name.";
    if (!isEmail(email)) next.email = "Enter a valid email address.";
    if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    setErrors(next); setFormError("");
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await api.joinSchool({ accessCode: code, name, email, password });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-center text-[28px] font-extrabold">Set up your school login</h1>
      <p className="mb-6 text-center text-muted">Enter the access code your school received, then create your own sign-in.</p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        {formError && <Alert kind="error">{formError}</Alert>}
        <Field id="code" label="School access code" placeholder="ABCD-EFGH-JKMN" autoComplete="off" spellCheck={false}
          value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} error={errors.code} />
        <Field id="name" label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <Button type="submit" loading={loading}>Create my login</Button>
      </form>
      <p className="mt-6 text-center text-[15px] text-muted">
        Already have a login? <Link href="/login" className="font-bold text-brand">Sign in</Link>
      </p>
    </>
  );
}