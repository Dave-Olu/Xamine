"use client";
import { useEffect, useState } from "react";
import { api, ApiError, type Exam, type ExamResultRow } from "@/lib/api";
import { downloadText } from "@/lib/csv";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";

const label = (e: Exam) => `${e.title} (${e.className})`;
const STATUS_TEXT = { submitted: "Submitted", in_progress: "In progress", not_taken: "Not taken" } as const;
const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export default function ResultsPage() {
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [examId, setExamId] = useState("");
  const [rows, setRows] = useState<ExamResultRow[] | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Only exams that have been opened can have results.
  useEffect(() => {
    api.listExams().then((all) => {
      const usable = all.filter((e) => e.status === "open" || e.status === "closed");
      setExams(usable);
      if (usable[0]) setExamId(usable[0].id);
    });
  }, []);

  useEffect(() => {
    if (!examId) return;
    setRows(null);
    api.listExamResults(examId).then(setRows);
  }, [examId]);

  const exam = exams?.find((e) => e.id === examId);
  const submitted = rows?.filter((r) => r.status === "submitted") ?? [];
  const inProgress = rows?.filter((r) => r.status === "in_progress").length ?? 0;
  const notTaken = rows?.filter((r) => r.status === "not_taken").length ?? 0;
  const average = submitted.length
    ? Math.round(submitted.reduce((sum, r) => sum + (r.percent ?? 0), 0) / submitted.length)
    : null;

  async function toggleRelease() {
    if (!exam) return;
    const next = !exam.resultsReleased;
    if (next && !window.confirm("Release these results? Students will be able to see their scores.")) return;
    setBusy(true); setMessage(null);
    try {
      const updated = await api.setResultsReleased(exam.id, next);
      setExams((all) => (all ? all.map((e) => (e.id === updated.id ? updated : e)) : all));
      setMessage({
        kind: "success",
        text: updated.resultsReleased ? "Results released. Students can now see their scores." : "Results hidden from students.",
      });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "Something went wrong. Try again." });
    } finally { setBusy(false); }
  }

  function exportCsv() {
    if (!rows || !exam) return;
    const head = "Name,Class,Exam number,Status,Score,Percent";
    const lines = rows.map((r) =>
      [
        r.name, r.className, r.examNumber ?? "", STATUS_TEXT[r.status],
        r.status === "submitted" ? `${r.correct}/${r.total}` : "",
        r.status === "submitted" ? `${r.percent}%` : "",
      ].map(cell).join(","),
    );
    downloadText(`${exam.title} results.csv`, [head, ...lines].join("\n"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <h1 className="text-[32px] font-extrabold">Results</h1>
        <p className="text-muted">See who has taken each exam, and release scores to students.</p>
      </div>
      {message && <div className="print:hidden"><Alert kind={message.kind}>{message.text}</Alert></div>}

      {exams === null ? <p className="text-muted">Loading...</p> : exams.length === 0 ? (
        <Card><p className="text-muted">No open or closed exams yet. Results appear here once an exam has been opened.</p></Card>
      ) : (
        <>
          <Card className="print:hidden">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <Select
                  id="exam" label="Exam" options={exams.map(label)} value={exam ? label(exam) : ""}
                  onChange={(e) => { const found = exams.find((x) => label(x) === e.target.value); if (found) setExamId(found.id); }}
                />
              </div>
              {exam && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${exam.resultsReleased ? "bg-success-soft text-success" : "bg-surface text-muted"}`}>
                    {exam.resultsReleased ? "Results released" : "Results hidden"}
                  </span>
                  <div className="w-full sm:w-44">
                    <Button variant={exam.resultsReleased ? "outline" : "primary"} loading={busy} onClick={toggleRelease}>
                      {exam.resultsReleased ? "Hide results" : "Release results"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {exam && (
            <Card className="p-5">
              <div className="mb-4 hidden print:block">
                <h2 className="text-2xl font-extrabold">{exam.title}</h2>
                <p>{exam.className} · {exam.subject} · {new Date().toLocaleDateString()}</p>
              </div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-muted">
                  {submitted.length} submitted · {inProgress} in progress · {notTaken} not taken
                  {average !== null && ` · Class average ${average}%`}
                </p>
                <div className="flex gap-2 print:hidden">
                  <button onClick={exportCsv} className="rounded-xl border border-brand px-4 py-2 text-[15px] font-bold text-brand hover:bg-brand-soft">Download CSV</button>
                  <button onClick={() => window.print()} className="rounded-xl bg-brand px-4 py-2 text-[15px] font-bold text-white hover:bg-brand-dark">Print</button>
                </div>
              </div>
              {rows === null ? <p className="py-3 text-muted">Loading...</p> : rows.length === 0 ? (
                <p className="py-3 text-muted">No students in {exam.className} yet.</p>
              ) : (
                <Table heads={["Name", "Exam number", "Status", "Score", "Percent"]}>
                  {rows.map((r) => (
                    <tr key={r.studentId}>
                      <td className="font-semibold">{r.name}</td>
                      <td className="font-mono font-bold tracking-wide">{r.examNumber ?? "-"}</td>
                      <td>{STATUS_TEXT[r.status]}</td>
                      <td>{r.status === "submitted" ? `${r.correct}/${r.total}` : "-"}</td>
                      <td>{r.status === "submitted" ? `${r.percent}%` : "-"}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}