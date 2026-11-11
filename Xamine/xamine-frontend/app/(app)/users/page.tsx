"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type NewUser, type SchoolUser } from "@/lib/api";
import { CLASSES } from "@/lib/constants";
import { downloadText, parseCsv } from "@/lib/csv";
import { isEmail } from "@/lib/validation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";

export default function UsersPage() {
  const [users, setUsers] = useState<SchoolUser[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [className, setClassName] = useState<string>(CLASSES[0]);
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => api.listUsers().then(setUsers);
  useEffect(() => { refresh(); }, []);

  function reset() {
    setEditingId(null); setName(""); setSubject(""); setEmail(""); setClassName(CLASSES[0]); setRole("student");
    setNameError(""); setEmailError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    let bad = false;
    if (!name.trim()) { setNameError("Enter the full name."); bad = true; } else setNameError("");
    if (role === "teacher" && email.trim() && !isEmail(email)) { setEmailError("Enter a valid email address."); bad = true; } else setEmailError("");
    if (bad) return;
    const input: NewUser = role === "student"
      ? { name: name.trim(), role, className }
      : { name: name.trim(), role, subject: subject.trim(), email: email.trim() || undefined };
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
    setClassName(u.className ?? CLASSES[0]); setSubject(u.subject ?? ""); setEmail(u.email ?? "");
    setNameError(""); setEmailError(""); setMessage(null);
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

  async function createLogin(u: SchoolUser) {
    setMessage(null); setCredentials(null);
    try {
      const { email: mail, tempPassword } = await api.createTeacherLogin(u.id);
      await refresh();
      setCredentials({ name: u.name, email: mail, password: tempPassword });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "Something went wrong. Try again." });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-extrabold">Users</h1>
        <p className="text-muted">Create and manage teacher and student accounts.</p>
      </div>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      {credentials && (
        <Alert kind="success">
          Login created for {credentials.name}. Email: <span className="font-bold">{credentials.email}</span>. Temporary password:{" "}
          <span className="font-mono font-bold tracking-wider">{credentials.password}</span>. Share it privately. It is shown only once.
        </Alert>
      )}
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
            <Table heads={["Name", "Role", "Class or subject", "Exam number or login", "Action"]} label="Users">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td className="capitalize">{u.role}</td>
                  <td>{u.className ?? u.subject ?? "-"}</td>
                  <td>
                    {u.role === "student" ? (
                      <span className="font-mono font-bold tracking-wide">{u.examNumber ?? "-"}</span>
                    ) : u.hasLogin ? (
                      "Has a login"
                    ) : u.email ? (
                      <button onClick={() => createLogin(u)} className="font-bold text-brand">Create login</button>
                    ) : (
                      <span className="text-muted">Add an email first</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <button onClick={() => startEdit(u)} className="mr-4 font-bold text-brand">Edit</button>
                    <button onClick={() => remove(u)} className="font-bold text-danger">Remove</button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card className="h-fit w-full lg:w-[340px]">
          <h2 className="mb-4 text-xl font-extrabold">{editingId ? "Edit user" : "Add user"}</h2>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Field id="name" label="Full name" placeholder="e.g. Tunde Bello" value={name} onChange={(e) => setName(e.target.value)} error={nameError} />
            <Select id="role" label="Role" options={["student", "teacher"]} value={role} onChange={(e) => setRole(e.target.value as "teacher" | "student")} />
            {role === "student"
              ? <Select id="class" label="Class" options={CLASSES} value={className} onChange={(e) => setClassName(e.target.value)} />
              : (
                <>
                  <Field id="subject" label="Subject" placeholder="e.g. Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} />
                  <Field id="email" label="Email (for their login)" type="email" placeholder="e.g. teacher@school.com" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />
                </>
              )}
            <Button type="submit" loading={saving}>{editingId ? "Save changes" : "Add user"}</Button>
            {editingId && <Button type="button" variant="outline" onClick={reset}>Cancel</Button>}
          </form>
        </Card>
      </div>
    </div>
  );
}