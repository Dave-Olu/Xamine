"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, type Exam, type ExamStatus, type Role } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table } from "@/components/ui/Table";

// The one status change offered for each state.
const NEXT: Partial<Record<ExamStatus, { to: ExamStatus; label: string; confirm?: string }>> = {
  draft: { to: "scheduled", label: "Schedule" },
  scheduled: { to: "open", label: "Open" },
  open: {
    to: "closed", label: "Close",
    confirm: "Close this exam? Students who have not started cannot start it. Students already writing can finish.",
  },
};

// A datetime-local input needs the local time as YYYY-MM-DDTHH:mm.
const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [timeFor, setTimeFor] = useState<Exam | null>(null);
  const [timeValue, setTimeValue] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const refresh = () => api.listExams().then(setExams);
  useEffect(() => { refresh(); api.getSession().then((s) => setRole(s?.user.role ?? null)); }, []);
  const teacher = role === "teacher"; // teachers prepare exams; the school admin opens and closes them

  // Returns true when the action worked.
  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id); setError("");
    try { await fn(); await refresh(); return true; }
    catch (err) { setError(err instanceof ApiError ? err.message : "Something went wrong. Try again."); return false; }
    finally { setBusyId(null); }
  }

  function openTimeEditor(e: Exam) {
    setTimeFor(e); setTimeValue(toLocalInput(e.startsAt)); setError("");
  }
  async function saveTime() {
    if (!timeFor) return;
    if (!timeValue) { setError("Pick the date and time."); return; }
    const ok = await run(timeFor.id, () => api.setExamStartTime(timeFor.id, new Date(timeValue).toISOString()));
    if (ok) setTimeFor(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-extrabold">Exams</h1>
          <p className="text-muted">
            {teacher ? "Create and schedule your exams. Your school admin opens them when they are ready." : "Create exams and control when students can start them."}
          </p>
        </div>
        <Link href="/exams/new" className="rounded-xl bg-brand px-6 py-3.5 font-bold text-white hover:bg-brand-dark">Create exam</Link>
      </div>
      {error && <Alert kind="error">{error}</Alert>}

      {timeFor && (
        <Card>
          <h2 className="mb-1 text-xl font-extrabold">Change start time</h2>
          <p className="mb-4 text-[15px] text-muted">
            {timeFor.title}. Students already writing are not affected. Students who have not started must wait for the new time.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field id="start-time" label="Date and time" type="datetime-local" value={timeValue} onChange={(ev) => setTimeValue(ev.target.value)} />
            </div>
            <div className="flex gap-2">
              <div className="w-32"><Button loading={busyId === timeFor.id} onClick={saveTime}>Save</Button></div>
              <div className="w-32"><Button variant="outline" onClick={() => setTimeFor(null)}>Cancel</Button></div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        {exams === null ? <p className="py-6 text-muted">Loading...</p> : exams.length === 0 ? (
          <p className="py-6 text-muted">No exams yet. Create your first exam.</p>
        ) : (
          <Table heads={["Exam", "Class", "Starts", "Questions", "Duration", "Status", "Action"]}>
            {exams.map((e) => {
              const step = NEXT[e.status];
              const next = step && (!teacher || step.to === "scheduled") ? step : undefined;
              return (
                <tr key={e.id}>
                  <td className="font-semibold">{e.title}</td>
                  <td>{e.className}</td>
                  <td>{e.startsAt ? new Date(e.startsAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "-"}</td>
                  <td>{e.questions.length}</td>
                  <td>{e.durationMinutes} min</td>
                  <td><StatusChip status={e.status} /></td>
                  <td className="whitespace-nowrap">
                    {next && (
                      <button
                        disabled={busyId === e.id}
                        onClick={() => {
                          if (next.confirm && !window.confirm(next.confirm)) return;
                          run(e.id, () => api.setExamStatus(e.id, next.to));
                        }}
                        className="mr-4 font-bold text-brand disabled:opacity-50"
                      >
                        {next.label}
                      </button>
                    )}
                    {(e.status === "draft" || e.status === "scheduled") && (
                      <Link href={`/exams/${e.id}/edit`} className="mr-4 font-bold text-brand">Edit</Link>
                    )}
                    {e.status === "open" && !teacher && (
                      <button onClick={() => openTimeEditor(e)} className="mr-4 font-bold text-brand">Change time</button>
                    )}
                    {(e.status === "open" || e.status === "closed") && (
                      <Link href="/results" className="mr-4 font-bold text-brand">Results</Link>
                    )}
                    <button disabled={busyId === e.id} onClick={() => run(e.id, () => api.duplicateExam(e.id))} className="font-bold text-brand disabled:opacity-50">Duplicate</button>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}