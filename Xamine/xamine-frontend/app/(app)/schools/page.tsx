"use client";
import { useEffect, useState } from "react";
import { api, ApiError, type AccessCodeStatus, type School } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Table } from "@/components/ui/Table";

const ACCESS_TEXT: Record<AccessCodeStatus, string> = { none: "No code yet", issued: "Code issued", used: "Admin joined" };

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [issued, setIssued] = useState<{ school: string; code: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => api.listSchools().then(setSchools);
  useEffect(() => { refresh(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter the school name.";
    if (!/^[A-Za-z]{2,4}$/.test(code.trim())) next.code = "Use 2 to 4 letters.";
    setErrors(next); setMessage(null);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const s = await api.createSchool({ name, code });
      setName(""); setCode(""); await refresh();
      setMessage({ kind: "success", text: `${s.name} added.` });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      else setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "Something went wrong. Try again." });
    } finally { setSaving(false); }
  }

  async function issueCode(s: School) {
    if (s.accessCodeStatus === "issued" && !window.confirm("This replaces the code that was already issued. Continue?")) return;
    setMessage(null); setIssued(null);
    try {
      const { code: accessCode } = await api.issueSchoolAccessCode(s.id);
      await refresh();
      setIssued({ school: s.name, code: accessCode });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "Something went wrong. Try again." });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-extrabold">Schools</h1>
        <p className="text-muted">Each school you serve. The code starts every student exam number for that school.</p>
        <p className="mt-1 text-[15px] text-muted">Demo number for visitors: <span className="font-mono font-bold">DEMO-1234</span>. It works at /student and starts fresh on every login.</p>
      </div>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      {issued && (
        <Alert kind="success">
          Access code for {issued.school}: <span className="font-mono font-bold tracking-wider">{issued.code}</span>. Give it to the school admin, who enters it at /join. It works once, and this is the only time it is shown.
        </Alert>
      )}
      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="min-w-0 flex-1 p-5">
          <h2 className="mb-3 text-xl font-extrabold">All schools</h2>
          {schools === null ? <p className="py-6 text-muted">Loading...</p> : schools.length === 0 ? (
            <p className="py-6 text-muted">No schools yet. Add one using the form.</p>
          ) : (
            <Table heads={["School", "Code", "Admin login", "Added", "Action"]} label="Schools">
              {schools.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td className="font-mono font-bold tracking-wider">{s.code}</td>
                  <td>{ACCESS_TEXT[s.accessCodeStatus ?? "none"]}</td>
                  <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="whitespace-nowrap">
                    {!s.isDemo && (
                      <button onClick={() => issueCode(s)} className="font-bold text-brand">
                        {s.accessCodeStatus === "issued" || s.accessCodeStatus === "used" ? "New code" : "Issue code"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card className="h-fit w-full lg:w-[340px]">
          <h2 className="mb-4 text-xl font-extrabold">Add school</h2>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Field id="school-name" label="School name" placeholder="e.g. Faith Comprehensive" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            <Field id="school-code" label="School code" placeholder="e.g. FCS" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} error={errors.code} />
            <Button type="submit" loading={saving}>Add school</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}