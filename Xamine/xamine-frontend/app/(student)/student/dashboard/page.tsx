"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type ExamStatus, type StudentExam, type User } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";

const day = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "To be announced";
const time = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "-";

const STATUS: Record<ExamStatus, { label: string; style: string }> = {
  draft: { label: "Not open yet", style: "bg-brand-soft text-brand" },
  scheduled: { label: "Not open yet", style: "bg-brand-soft text-brand" },
  open: { label: "Open now", style: "bg-success-soft text-success" },
  closed: { label: "Closed", style: "bg-surface text-muted" },
};
const WAITING = { label: "Starts soon", style: "bg-brand-soft text-brand" };

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [exams, setExams] = useState<StudentExam[] | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const loadExams = () =>
    api.listMyExams().then(setExams).catch((err) => {
      // The student session ended (logged out, or a staff login in this browser): go back to the student login.
      if (err instanceof ApiError && err.code === "FORBIDDEN") router.replace("/student");
    });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    api.getSession().then((s) => {
      if (cancelled) return; // the page was closed or restarted before the session check finished
      if (!s) { router.replace("/student"); return; }
      if (s.user.role !== "student") { router.replace("/dashboard"); return; }
      setUser(s.user);
      loadExams();
      timer = setInterval(loadExams, 30000); // picks up an exam opening or starting while the page stays open
    });
    return () => { cancelled = true; clearInterval(timer); };
  }, [router]);

  async function start(examId: string) {
    setError(""); setStartingId(examId);
    try {
      const attempt = await api.startAttempt(examId);
      router.push(`/student/exam/${attempt.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the exam. Try again.");
      setStartingId(null);
      loadExams();
    }
  }

  if (!user) return error ? <div className="mx-auto max-w-md p-10"><Alert kind="error">{error}</Alert></div> : null;
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-line bg-white px-5 py-3 md:px-10">
        <Logo />
        <div className="w-28">
          <Button variant="outline" onClick={() => api.logout().then(() => router.replace("/student"))}>Log out</Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 p-5 md:p-10">
        <Card>
          <h1 className="text-[28px] font-extrabold">Welcome, {user.name}</h1>
          <p className="mt-1 text-muted">{user.className}</p>
        </Card>

        {error && <Alert kind="error">{error}</Alert>}

               <Card className="p-5">
          <h2 className="mb-3 text-xl font-extrabold">Your timetable</h2>
          {exams === null ? <p className="py-3 text-muted">Loading...</p> : exams.length === 0 ? (
            <p className="py-3 text-muted">No exams for your class yet.</p>
          ) : (
            <>
              <ul className="divide-y divide-line sm:hidden">
                {exams.map((e) => (
                  <li key={e.id} className="py-3">
                    <p className="font-semibold">{e.subject}</p>
                    <p className="text-muted">{day(e.startsAt)}, {time(e.startsAt)} · {e.durationMinutes} min</p>
                  </li>
                ))}
              </ul>
              <div className="hidden sm:block">
                <Table heads={["Date", "Time", "Subject", "Duration"]} label="Your timetable">
                  {exams.map((e) => (
                    <tr key={e.id}>
                      <td className="font-semibold">{day(e.startsAt)}</td>
                      <td>{time(e.startsAt)}</td>
                      <td>{e.subject}</td>
                      <td>{e.durationMinutes} min</td>
                    </tr>
                  ))}
                </Table>
              </div>
            </>
          )}
        </Card>

        {exams && exams.length > 0 && (
          <section className="flex flex-col gap-4" aria-label="Your exams">
            <h2 className="text-xl font-extrabold">Your exams</h2>
            {exams.map((e) => {
              const waiting = e.status === "open" && !e.canStart && !e.runningAttemptId;
              const chip = waiting ? WAITING : STATUS[e.status];
              return (
                <Card key={e.id} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-extrabold">{e.title}</h3>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${chip.style}`}>{chip.label}</span>
                  </div>
                  <p className="text-muted">{e.subject} · {e.durationMinutes} minutes · {day(e.startsAt)}, {time(e.startsAt)}</p>
                  {e.instructions && (
                    <div className="rounded-xl bg-surface p-4">
                      <p className="mb-1 text-sm font-bold">Instructions</p>
                      <p className="whitespace-pre-line">{e.instructions}</p>
                    </div>
                  )}
                  {e.status === "open" && (
                    e.runningAttemptId ? (
                      <div className="w-full sm:w-48">
                        <Button onClick={() => router.push(`/student/exam/${e.runningAttemptId}`)}>Continue exam</Button>
                      </div>
                    ) : e.attemptsUsed >= e.attemptLimit ? (
                      <p className="font-semibold text-muted">You have used all your attempts for this exam.</p>
                    ) : e.canStart ? (
                      <div className="w-full sm:w-48">
                        <Button loading={startingId === e.id} onClick={() => start(e.id)}>Start exam</Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="w-full sm:w-48"><Button disabled>Start exam</Button></div>
                        <p className="text-sm font-semibold text-muted">Starts {day(e.startsAt)} at {time(e.startsAt)}. This page updates by itself.</p>
                      </div>
                    )
                  )}
                  {e.lastSubmittedAttemptId && (
                    e.resultsReleased ? (
                      <Link href={`/student/result/${e.lastSubmittedAttemptId}`} className="font-bold text-brand">View result</Link>
                    ) : (
                      <p className="font-semibold text-muted">Submitted. Your result will appear here when your school releases it.</p>
                    )
                  )}
                </Card>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}