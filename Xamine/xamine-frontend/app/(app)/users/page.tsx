"use client";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type NewUser, type SchoolUser } from "@/lib/api";
import { CLASSES } from "@/lib/constants";
import { downloadText, parseCsv } from "@/lib/csv";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import Link from "next/link";

export default function UsersPage() {
  const [users, setUsers] = useState<SchoolUser[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [className, setClassName] = useState<string>(CLASSES[0]);
  const [subject, setSubject] = useState("");
  const [nameError, setNameError] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => api.listUsers().then(setUsers);
  useEffect(() => { refresh(); }, []);

  function reset() { setEditingId(null); setName(""); setSubject(""); setClassName(CLASSES[0]); setRole("student"); setNameError(""); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError("Enter the full name."); return; }
    const input: NewUser = role === "student"
      ? { name: name.trim(), role, className }
      : { name: name.trim(), role, subject: subject.trim() };
    setSaving(true); setMessage(null);
    try {
      if (editingId) await api.updateUser(editingId, input); else await api.createUser(input);
      reset(); await refresh();
      setMessage({ kind: "success", text: editingId ? "User updated." : "User added." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "Something went wrong. Try again." });
    } finally { setSaving(false); }
  }

  function startEdit(u: SchoolUser) {
    setEditingId(u.id); setName(u.name); setRole(u.role);
    setClassName(u.className ?? CLASSES[0]); setSubject(u.subject ?? ""); setNameError(""); setMessage(null);
  }

  async function remove(u: SchoolUser) {
    if (!window.confirm(`Remove ${u.name}?`)) return;
    await api.deleteUser(u.id); if (editingId === u.id) reset(); await refresh();
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (rows[0]?.[0]?.toLowerCase() === "name") rows.shift();
    const valid: NewUser[] = []; let skipped = 0;
    for (const [n, r, c] of rows) {
      const rl = (r ?? "").toLowerCase();
      if (!n || (rl !== "teacher" && rl !== "student")) { skipped++; continue; }
      valid.push(rl === "student" ? { name: n, role: "student", className: c || CLASSES[0] } : { name: n, role: "teacher", subject: c || "" });
    }
    if (!valid.length) { setMessage({ kind: "error", text: "No valid rows found. Use the template: name, role, class or subject." }); return; }
    const { created } = await api.importUsers(valid); await refresh();
    setMessage({ kind: "success", text: `Imported ${created} users${skipped ? `, skipped ${skipped} invalid rows` : ""}.` });
  }

    async function onGenerate() {
    const { created } = await api.generateExamNumbers(); await refresh();
    setMessage({
      kind: "success",
      text: created ? `Created ${created} exam number${created > 1 ? "s" : ""}.` : "All students already have an exam number.",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-extrabold">Users</h1>
        <p className="text-muted">Create and manage teacher and student accounts.</p>
      </div>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      <div className="flex flex-col gap-6 lg:flex-row">
                <Card className="min-w-0 flex-1 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">All users</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => downloadText("users-template.csv", "name,role,class or subject\nTunde Bello,student,JSS2\nMrs. Obi,teacher,Mathematics\n")}
                className="rounded-xl px-3 py-2 text-[15px] font-bold text-brand hover:bg-brand-soft">Download template</button>
              <button onClick={() => fileRef.current?.click()}
                className="rounded-xl border border-brand px-4 py-2 text-[15px] font-bold text-brand hover:bg-brand-soft">Import list (CSV)</button>
              <button onClick={onGenerate}
                className="rounded-xl bg-brand px-4 py-2 text-[15px] font-bold text-white hover:bg-brand-dark">Generate exam numbers</button>
                <Link href="/users/sheet"
                className="rounded-xl border border-brand px-4 py-2 text-[15px] font-bold text-brand hover:bg-brand-soft">Print exam numbers</Link>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onImport} aria-label="Import users from CSV" />
            </div>
          </div>
          {users === null ? <p className="py-6 text-muted">Loading...</p> : users.length === 0 ? (
            <p className="py-6 text-muted">No users yet. Add one using the form.</p>
          ) : (
            <Table heads={["Name", "Role", "Class or subject", "Exam number", "Action"]}>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td className="capitalize">{u.role}</td>
                  <td>{u.className ?? u.subject ?? "-"}</td>
                  <td className="font-mono font-bold tracking-wide">{u.examNumber ?? "-"}</td>
                  <td className="whitespace-nowrap">
                    <button onClick={() => startEdit(u)} className="mr-4 font-bold text-brand">Edit</button>
                    <button onClick={() => remove(u)} className="font-bold text-danger">Remove</button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
