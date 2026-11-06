"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, ApiError, type Exam, type Question, type QuestionType } from "@/lib/api";
import { CLASSES } from "@/lib/constants";
import { downloadText, parseCsv } from "@/lib/csv";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Field } from "./ui/Field";
import { Select } from "./ui/Select";
import { Table } from "./ui/Table";
import { TextArea } from "./ui/TextArea";

const uid = () => Math.random().toString(36).slice(2, 10);
const LETTERS = ["A", "B", "C", "D"];

// A datetime-local input needs the local time as YYYY-MM-DDTHH:mm.
const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function ExamForm({ initial }: { initial?: Exam }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [className, setClassName] = useState<string>(initial?.className ?? CLASSES[0]);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [duration, setDuration] = useState(initial ? String(initial.durationMinutes) : "");
  const [attempts, setAttempts] = useState(initial ? String(initial.attemptLimit) : "1");
  const [shuffle, setShuffle] = useState(initial?.shuffle ?? true);
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt));
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [questions, setQuestions] = useState<Question[]>(initial?.questions ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  // question being written
  const [qType, setQType] = useState<QuestionType>("multiple_choice");
  const [qText, setQText] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [qError, setQError] = useState("");

  function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!qText.trim()) { setQError("Type the question."); return; }
    if (qType === "multiple_choice" && opts.some((o) => !o.trim())) { setQError("Fill in all four options."); return; }
    setQuestions((q) => [...q, {
      id: uid(), type: qType, text: qText.trim(),
      options: qType === "true_false" ? ["True", "False"] : opts.map((o) => o.trim()), correctIndex: correct,
    }]);
    setQText(""); setOpts(["", "", "", ""]); setCorrect(0); setQError("");
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (rows[0]?.[0]?.toLowerCase() === "question") rows.shift();
    const added: Question[] = []; let skipped = 0;
    for (const [text, a, b, c, d, ans] of rows) {
      const idx = LETTERS.indexOf((ans ?? "").toUpperCase());
      if (!text || !a || !b || !c || !d || idx < 0) { skipped++; continue; }
      added.push({ id: uid(), type: "multiple_choice", text, options: [a, b, c, d], correctIndex: idx });
    }
    setQuestions((q) => [...q, ...added]);
    setNotice(`Added ${added.length} questions${skipped ? `, skipped ${skipped} invalid rows` : ""}.`);
  }

  async function save(status: "draft" | "scheduled") {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Enter the exam title.";
    if (!subject.trim()) next.subject = "Enter the subject.";
    const mins = Number(duration);
    if (!Number.isInteger(mins) || mins < 1) next.duration = "Enter the duration in minutes.";
    const att = Number(attempts);
    if (!Number.isInteger(att) || att < 1) next.attempts = "Enter 1 or more.";
    if (status === "scheduled" && questions.length === 0) next.questions = "Add at least one question before saving the exam.";
    if (status === "scheduled" && !startsAt) next.startsAt = "Pick the date and time for the timetable.";
    setErrors(next); setFormError("");
    if (Object.keys(next).length) return;
    setSaving(true);
    const input = {
      title: title.trim(), className, subject: subject.trim(), durationMinutes: mins, attemptLimit: att, shuffle, questions, status,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      instructions: instructions.trim() || undefined,
    };
    try {
      if (initial) await api.updateExam(initial.id, input); else await api.createExam(input);
      router.push("/exams");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-[32px] font-extrabold">{initial ? "Edit exam" : "Create exam"}</h1>
      {formError && <Alert kind="error">{formError}</Alert>}
      
      <Card>
        <h2 className="mb-5 text-xl font-extrabold">Exam details</h2>
        <div className="grid gap-[18px] sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="title" label="Exam title" placeholder="e.g. Mathematics first term exam" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
          </div>
          <Select id="class" label="Class" options={CLASSES} value={className} onChange={(e) => setClassName(e.target.value)} />
          <Field id="subject" label="Subject" placeholder="e.g. Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} error={errors.subject} />
          <Field id="duration" label="Duration in minutes" type="number" min={1} placeholder="e.g. 60" value={duration} onChange={(e) => setDuration(e.target.value)} error={errors.duration} />
          <Field id="attempts" label="Attempts allowed" type="number" min={1} value={attempts} onChange={(e) => setAttempts(e.target.value)} error={errors.attempts} />
          <Field id="startsAt" label="Date and time" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} error={errors.startsAt} />
          <div className="sm:col-span-2">
            <TextArea id="instructions" label="Instructions for students" placeholder="e.g. Answer all questions. No calculators. Do not refresh the page." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
          <label className="flex items-center gap-2.5 font-semibold sm:col-span-2">
            <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="h-5 w-5 accent-brand" />
            Shuffle questions for each student
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-xl font-extrabold">Add questions</h2>
        <p className="mb-5 text-[15px] text-muted">Upload a CSV file, or add questions one at a time.</p>
        <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border-2 border-dashed border-line p-5 sm:flex-row sm:items-center">
          <div>
            <b>Upload a CSV template</b>
            <p className="text-sm text-muted">Columns: question, option A to D, answer (A to D). Excel can save a sheet as CSV.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => downloadText("questions-template.csv", "question,option A,option B,option C,option D,answer\nWhat is 12 x 8?,84,96,108,112,B\n")}
              className="rounded-xl border border-brand px-4 py-2.5 text-[15px] font-bold text-brand hover:bg-brand-soft">Download template</button>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-brand px-4 py-2.5 text-[15px] font-bold text-white hover:bg-brand-dark">Upload file</button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onUpload} aria-label="Upload questions CSV" />
          </div>
        </div>
        {notice && <div className="mb-4"><Alert kind="success">{notice}</Alert></div>}
        <form onSubmit={addQuestion} noValidate className="grid gap-[18px] sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select id="qtype" label="Question type" options={["Multiple choice", "True or false"]}
              value={qType === "multiple_choice" ? "Multiple choice" : "True or false"}
              onChange={(e) => { setQType(e.target.value === "Multiple choice" ? "multiple_choice" : "true_false"); setCorrect(0); }} />
          </div>
          <div className="sm:col-span-2"><TextArea id="qtext" label="Question" placeholder="Type the question" value={qText} onChange={(e) => setQText(e.target.value)} /></div>
          {qType === "multiple_choice" ? (
            <>
              {LETTERS.map((l, i) => (
                <Field key={l} id={`opt${l}`} label={`Option ${l}`} value={opts[i]} onChange={(e) => setOpts(opts.map((o, j) => (j === i ? e.target.value : o)))} />
              ))}
              <Select id="correct" label="Correct answer" options={LETTERS} value={LETTERS[correct]} onChange={(e) => setCorrect(LETTERS.indexOf(e.target.value))} />
            </>
          ) : (
            <Select id="correct" label="Correct answer" options={["True", "False"]} value={correct === 0 ? "True" : "False"} onChange={(e) => setCorrect(e.target.value === "True" ? 0 : 1)} />
          )}
          {qError && <div className="sm:col-span-2"><Alert kind="error">{qError}</Alert></div>}
          <div className="sm:col-span-2 sm:max-w-[240px]"><Button type="submit">Add question</Button></div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-xl font-extrabold">Questions added ({questions.length})</h2>
        {errors.questions && <div className="mb-3"><Alert kind="error">{errors.questions}</Alert></div>}
        {questions.length === 0 ? <p className="py-3 text-muted">No questions yet.</p> : (
          <Table heads={["#", "Question", "Answer", "Action"]}>
            {questions.map((q, i) => (
              <tr key={q.id}>
                <td>{i + 1}</td>
                <td className="font-semibold">{q.text}</td>
                <td>{LETTERS[q.correctIndex] ?? q.options[q.correctIndex]}{q.type === "true_false" ? ` (${q.options[q.correctIndex]})` : ""}</td>
                <td><button onClick={() => setQuestions((all) => all.filter((x) => x.id !== q.id))} className="font-bold text-danger">Remove</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-48"><Button variant="outline" loading={saving} onClick={() => save("draft")}>Save as draft</Button></div>
        <div className="w-full sm:w-48"><Button loading={saving} onClick={() => save("scheduled")}>Save exam</Button></div>
      </div>
    </div>
  );
}