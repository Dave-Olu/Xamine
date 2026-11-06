"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type School, type SchoolUser } from "@/lib/api";
import { CLASSES } from "@/lib/constants";
import { getActiveSchoolId } from "@/lib/schoolContext";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";

const ALL = "All classes";

export default function ExamNumberSheetPage() {
  const [users, setUsers] = useState<SchoolUser[] | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [cls, setCls] = useState(ALL);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    Promise.all([api.listUsers(), api.listSchools()]).then(([u, s]) => {
      setUsers(u);
      setSchool(s.find((x) => x.id === getActiveSchoolId()) ?? null);
    });
  }, []);

  const students = (users ?? [])
    .filter((u) => u.role === "student" && (cls === ALL || u.className === cls))
    .sort((a, b) => (a.className ?? "").localeCompare(b.className ?? "") || a.name.localeCompare(b.name));
  const cards = students.filter((u) => u.examNumber);
  const missing = students.length - cards.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <Link href="/users" className="text-[15px] font-bold text-brand">Back to users</Link>
        <h1 className="mt-2 text-[32px] font-extrabold">Exam number sheet</h1>
        <p className="text-muted">Print this page, cut along the dashed lines, and hand each student their own card.</p>
      </div>

      <Card className="print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Select id="class" label="Class" options={[ALL, ...CLASSES]} value={cls} onChange={(e) => setCls(e.target.value)} />
          </div>
          <button onClick={() => window.print()} disabled={cards.length === 0}
            className="rounded-xl bg-brand px-6 py-3.5 font-bold text-white hover:bg-brand-dark disabled:opacity-50">Print cards</button>
        </div>
        {missing > 0 && (
          <p className="mt-4 font-semibold text-danger">
            {missing} student{missing > 1 ? "s have" : " has"} no exam number yet. Select Generate exam numbers on the Users page first.
          </p>
        )}
      </Card>

      {users === null ? <p className="text-muted print:hidden">Loading...</p> : cards.length === 0 ? (
        <p className="text-muted print:hidden">No students with exam numbers in this selection.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
          {cards.map((u) => (
            <div key={u.id} className="break-inside-avoid rounded-xl border-2 border-dashed border-line bg-white p-4">
              <p className="text-sm font-bold text-brand">{school?.name}</p>
              <p className="mt-2 text-lg font-extrabold">{u.name}</p>
              <p className="text-muted">{u.className}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Your exam number</p>
              <p className="font-mono text-2xl font-extrabold tracking-wider">{u.examNumber}</p>
              <p className="mt-2 text-xs text-muted">Go to {origin}/student and type this number. Keep it private.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}