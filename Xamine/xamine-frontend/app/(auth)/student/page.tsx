"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export default function StudentLoginPage() {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (number.trim().length < 6) { setError("Enter your exam number."); return; }
    setError(""); setLoading(true);
    try {
      await api.studentLogin(number);
      router.push("/student/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-center text-[28px] font-extrabold">Enter your exam number</h1>
      <p className="mb-6 text-center text-muted">Your school gave you this number. Type it exactly as written.</p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex flex-col gap-2">
          <label htmlFor="exam-number" className="text-[15px] font-semibold">Exam number</label>
          <input
            id="exam-number" value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())}
            placeholder="ABC-0000-0000" autoComplete="off" autoCapitalize="characters" spellCheck={false}
            aria-invalid={!!error}
            className="rounded-xl border border-line bg-white px-4 py-4 text-center text-xl font-extrabold tracking-[0.15em] placeholder:text-muted/50"
          />
        </div>
        <Button type="submit" loading={loading}>Continue</Button>
      </form>
        <p className="mt-6 text-center text-[15px] text-muted">
        Just looking?{" "}
        <button type="button" onClick={() => setNumber("DEMO-1234")} className="font-bold text-brand">Try the demo</button>
      </p>
    </>
  );
}