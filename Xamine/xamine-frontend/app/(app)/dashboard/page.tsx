"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type AccessCodeStatus, type DashboardSummary, type User } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table } from "@/components/ui/Table";

const ADMIN_TEXT: Record<AccessCodeStatus, string> = { none: "No code yet", issued: "Code issued", used: "Admin joined" };
const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "-";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardSummary | null>(null);
  useEffect(() => {
    api.getSession().then((s) => setUser(s?.user ?? null));
    api.getDashboard().then(setData);
  }, []);

  const operator = data?.scope === "all";
  const teacher = data?.scope === "mine";
  const stats = data
    ? operator
      ? [["Schools", data.schools], ["Students", data.students], ["Open exams", data.openExams], ["Finished attempts", data.submitted]]
      : teacher
        ? [["My exams", data.exams], ["Open exams", data.openExams], ["Finished attempts", data.submitted]]
        : [["Students", data.students], ["Exams", data.exams], ["Open exams", data.openExams], ["Finished attempts", data.submitted]]
    : [];

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Card className="flex flex-col justify-between gap-4 bg-brand-soft sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[28px] font-extrabold">Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 text-muted">
            {data
              ? operator ? "Here is what is happening across your schools."
                : teacher ? `Here are your exams at ${data.schoolName}.`
                : `Here is what is happening at ${data.schoolName}.`
              : "Loading..."}
          </p>
        </div>
        <Link href={operator ? "/schools" : "/exams/new"} className="rounded-xl bg-brand px-6 py-3.5 text-center font-bold text-white hover:bg-brand-dark">
          {operator ? "Manage schools" : "Create exam"}
        </Link>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <p className="text-muted">{label}</p>
            <p className="mt-1 text-4xl font-extrabold">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-xl font-extrabold">Open and upcoming exams</h2>
        {data === null ? <p className="py-3 text-muted">Loading...</p> : data.upcoming.length === 0 ? (
          <p className="py-3 text-muted">Nothing open or scheduled. <Link href="/exams/new" className="font-bold text-brand">Create an exam</Link></p>
        ) : (
          <Table heads={operator ? ["Exam", "School", "Class", "Starts", "Status"] : ["Exam", "Class", "Starts", "Status"]} label="Open and upcoming exams">
            {data.upcoming.map((e) => (
              <tr key={e.id}>
                <td className="font-semibold">{e.title}</td>
                {operator && <td>{e.schoolName}</td>}
                <td>{e.className}</td>
                <td>{when(e.startsAt)}</td>
                <td><StatusChip status={e.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {operator && data?.schoolRows && (
        <Card className="p-5">
          <h2 className="mb-3 text-xl font-extrabold">Schools</h2>
          <Table heads={["School", "Code", "Students", "Exams", "Open", "Admin login"]} label="Schools overview">
            {data.schoolRows.map((s) => (
              <tr key={s.id}>
                <td className="font-semibold">{s.name}</td>
                <td className="font-mono font-bold tracking-wider">{s.code}</td>
                <td>{s.students}</td>
                <td>{s.exams}</td>
                <td>{s.openExams}</td>
                <td>{ADMIN_TEXT[s.adminStatus]}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {!operator && data && (
        <Card>
          <h2 className="mb-3 text-xl font-extrabold">Quick actions</h2>
          <ul className="flex flex-col gap-2 font-bold text-brand">
            {!teacher && <li><Link href="/users">Add students and generate exam numbers</Link></li>}
            {!teacher && <li><Link href="/users/sheet">Print exam number cards</Link></li>}
            {teacher && <li><Link href="/exams/new">Create an exam</Link></li>}
            <li><Link href="/exams">{teacher ? "Your exams" : "Schedule, open and close exams"}</Link></li>
            <li><Link href="/results">{teacher ? "See results for your exams" : "See results and release them"}</Link></li>
          </ul>
        </Card>
      )}
    </div>
  );
}