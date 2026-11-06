"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type AttemptResult } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";

const backLink = (
  <Link href="/student/dashboard" className="mt-7 block w-full rounded-xl bg-brand px-6 py-3.5 text-center text-base font-bold text-white hover:bg-brand-dark">
    Back to dashboard
  </Link>
);

export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [r, setR] = useState<AttemptResult | null>(null);
  const [pending, setPending] = useState(false); // submitted, but the school has not released results yet
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAttemptResult(attemptId)
      .then(setR)
      .catch((e) => {
        if (e instanceof ApiError && e.code === "FORBIDDEN") router.replace("/student");
        else if (e instanceof ApiError && e.code === "RESULT_NOT_RELEASED") setPending(true);
        else setError(e instanceof Error ? e.message : "Could not load your result.");
      });
  }, [attemptId, router]);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (pending) {
    return (
      <div className="text-center">
        <span className="inline-block rounded-full bg-success-soft px-4 py-1.5 text-sm font-bold text-success">Exam submitted</span>
        <h1 className="mt-4 text-[28px] font-extrabold">Your answers are saved</h1>
        <p className="mt-2 text-muted">Your result will appear on your dashboard when your school releases it.</p>
        {backLink}
      </div>
    );
  }
  if (!r) return <p className="text-center text-muted">Loading your result...</p>;

  const tone = r.percent >= 50 ? "text-success" : "text-danger"; // 50% is a placeholder pass mark
  const tiles = [
    { n: r.correct, label: "Correct", bg: "bg-success-soft" },
    { n: r.wrong, label: "Wrong", bg: "bg-danger-soft" },
    { n: r.skipped, label: "Skipped", bg: "bg-surface" },
  ];

  return (
    <div className="text-center">
      <span className="inline-block rounded-full bg-success-soft px-4 py-1.5 text-sm font-bold text-success">Exam submitted</span>
      <h1 className="mt-4 text-[28px] font-extrabold">{r.examTitle}</h1>
      <p className="mt-1 text-muted">Your score</p>
      <p className="mt-2 text-7xl font-extrabold">
        {r.correct}<span className="text-4xl text-muted">/{r.total}</span>
      </p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{r.percent}%</p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-xl py-4 ${t.bg}`}>
            <p className="text-2xl font-extrabold">{t.n}</p>
            <p className="text-sm text-muted">{t.label}</p>
          </div>
        ))}
      </div>
      {backLink}
    </div>
  );
}