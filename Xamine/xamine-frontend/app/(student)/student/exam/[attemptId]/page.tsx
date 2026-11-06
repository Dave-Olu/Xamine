"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type Attempt } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const LETTERS = ["A", "B", "C", "D"];
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function TakeExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0); // server clock minus device clock, in ms
  const [left, setLeft] = useState<number | null>(null); // seconds left
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saveWarning, setSaveWarning] = useState(false);
  const done = useRef(false);

  // Load (or resume) the attempt. Already submitted? Go to the result.
  useEffect(() => {
    api.getAttempt(attemptId)
      .then((a) => {
        if (a.submittedAt) { router.replace(`/student/result/${a.id}`); return; }
        setOffset(new Date(a.serverNow).getTime() - Date.now());
        setAnswers(a.answers);
        setAttempt(a);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.code === "FORBIDDEN") router.replace("/student");
        else setError(e instanceof Error ? e.message : "Could not load your exam.");
      });
  }, [attemptId, router]);

  // Countdown based on the server's end time, so a refresh never resets the clock.
  useEffect(() => {
    if (!attempt) return;
    const end = new Date(attempt.endsAt).getTime();
    const tick = () => setLeft(Math.max(0, Math.round((end - (Date.now() + offset)) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [attempt, offset]);

  // Time is up: submit automatically.
  useEffect(() => { if (left === 0) void finish(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Warn before the tab is closed or reloaded by accident. The attempt stays safe either way.
  
  useEffect(() => {
    if (!attempt || submitting) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [attempt, submitting]);

  async function finish() {
    if (done.current || !attempt) return;
    done.current = true; setSubmitting(true); setError("");
    try {
      await api.submitAttempt(attempt.id, answers);
      router.replace(`/student/result/${attempt.id}`);
    } catch (err) {
      done.current = false; setSubmitting(false);
      setError(err instanceof ApiError ? err.message : "Could not submit. Check your connection and try again.");
    }
  }

  function confirmSubmit() {
    if (!attempt) return;
    const unanswered = attempt.questions.length - Object.keys(answers).length;
    const msg = unanswered
      ? `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Submit anyway?`
      : "Submit your exam now? You cannot change your answers after this.";
    if (window.confirm(msg)) void finish();
  }

  function pick(questionId: string, choice: number) {
    setAnswers((a) => ({ ...a, [questionId]: choice }));
    api.saveAnswer(attemptId, questionId, choice)
      .then(() => setSaveWarning(false))
      .catch(() => setSaveWarning(true)); // answers are sent again on submit, so nothing is lost
  }

  if (!attempt) {
    return (
      <div className="mx-auto max-w-md p-10">
        {error ? (
          <>
            <Alert kind="error">{error}</Alert>
            <Link href="/student/dashboard" className="mt-4 inline-block font-bold text-brand">Back to dashboard</Link>
          </>
        ) : <p className="text-muted">Loading your exam...</p>}
      </div>
    );
  }

  const total = attempt.questions.length;
  const q = attempt.questions[index];
  const chosen = answers[q.id];
  const urgent = left !== null && left <= 300;
  const warning = left === 300 ? "5 minutes left." : left === 60 ? "1 minute left." : "";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-3 md:px-10">
        <div className="flex flex-wrap items-center gap-4">
          <Logo />
          <span className="text-lg font-bold">{attempt.examTitle}</span>
        </div>
        <div
          role="timer" aria-label="Time left"
          className={`rounded-xl px-5 py-2 text-2xl font-extrabold tabular-nums text-white ${urgent ? "bg-danger" : "bg-brand-dark"}`}
        >
          {left === null ? "--:--" : mmss(left)}
        </div>
        <p className="sr-only" aria-live="assertive">{warning}</p>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 p-5 md:p-10 lg:grid-cols-[1fr_320px]">
        <Card className="flex flex-col gap-5">
          {error && <Alert kind="error">{error}</Alert>}
          {saveWarning && <Alert kind="error">Your last answer may not have saved. Check your connection. Your answers are sent again when you submit.</Alert>}
          <div>
            <p className="mb-2 font-semibold text-muted">Question {index + 1} of {total}</p>
            <div className="h-2 rounded-full bg-brand-soft">
              <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
            </div>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-4 text-[28px] font-extrabold leading-tight">{q.text}</legend>
            {q.options.map((opt, i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 px-5 py-4 text-lg ${chosen === i ? "border-brand bg-brand-soft" : "border-line bg-white hover:bg-surface"}`}
              >
                <input type="radio" name={q.id} checked={chosen === i} onChange={() => pick(q.id, i)} className="h-5 w-5 accent-brand" />
                <b>{LETTERS[i]}</b>
                <span>{opt}</span>
              </label>
            ))}
          </fieldset>

          <div className="flex justify-between gap-3">
            <div className="w-32"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button></div>
            <div className="w-32"><Button disabled={index === total - 1} onClick={() => setIndex(index + 1)}>Next</Button></div>
          </div>
        </Card>

        <Card className="h-fit">
          <h2 className="mb-4 text-xl font-extrabold">Questions</h2>
          <div className="mb-5 grid grid-cols-5 gap-2">
            {attempt.questions.map((x, i) => {
              const answered = answers[x.id] !== undefined;
              const style = i === index
                ? "border-brand bg-brand text-white"
                : answered ? "border-transparent bg-success-soft text-success" : "border-line bg-white text-muted";
              return (
                <button
                  key={x.id} onClick={() => setIndex(i)}
                  aria-current={i === index ? "step" : undefined}
                  aria-label={`Question ${i + 1}${answered ? ", answered" : ""}`}
                  className={`rounded-lg border py-2.5 font-bold ${style}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <Button variant="success" loading={submitting} onClick={confirmSubmit}>Submit exam</Button>
        </Card>
      </main>
    </div>
  );
}