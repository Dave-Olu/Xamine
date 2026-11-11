"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { api, type Role, type School, type User } from "@/lib/api";
import { getActiveSchoolId, setActiveSchoolId } from "@/lib/schoolContext";

// Which roles see which menu items. The backend must enforce the same rules.
const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "school_admin", "teacher"] },
  { href: "/exams", label: "Exams", roles: ["admin", "school_admin", "teacher"] },
  { href: "/users", label: "Users", roles: ["admin", "school_admin"] },
  { href: "/schools", label: "Schools", roles: ["admin"] },
  { href: "/results", label: "Results", roles: ["admin", "school_admin", "teacher"] },
];

// The operator chooses which school to act as.
function SchoolPicker() {
  const [schools, setSchools] = useState<School[]>([]);
  const [active, setActive] = useState("");
  useEffect(() => { api.listSchools().then(setSchools); setActive(getActiveSchoolId()); }, []);
  return (
    <label className="block w-full px-2 text-xs font-semibold uppercase tracking-wide text-white/60">
      Acting as
      <select
        value={active}
        onChange={(e) => { setActiveSchoolId(e.target.value); window.location.reload(); }}
        className="mt-1 w-full min-w-0 truncate rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-white"
      >
        {schools.map((s) => <option key={s.id} value={s.id} className="text-ink">{s.name}</option>)}
      </select>
    </label>
  );
}

// School staff are tied to one school, so it is shown and cannot be changed.
function SchoolName() {
  const [name, setName] = useState("");
  useEffect(() => { api.listSchools().then((all) => setName(all[0]?.name ?? "")); }, []);
  return (
    <div className="w-full px-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Your school</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{name || "..."}</p>
    </div>
  );
}

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="print:hidden flex flex-wrap items-center gap-2 bg-brand-dark p-3 md:w-64 md:flex-col md:items-stretch md:gap-8 md:p-5">
        <div className="px-2 md:pt-2"><Logo light /></div>
        {user.role === "admin" ? <SchoolPicker /> : <SchoolName />}
        <nav aria-label="Main" className="flex flex-1 flex-wrap gap-1.5 md:flex-col">
          {NAV.filter((n) => n.roles.includes(user.role)).map((n) => {
            const on = path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
                className={`rounded-xl px-4 py-2.5 text-[15px] font-semibold md:py-3 ${on ? "bg-brand text-white" : "text-white/75 hover:bg-white/10"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={async () => { await api.logout(); router.push("/login"); }}
          className="rounded-xl px-4 py-2.5 text-left text-[15px] font-semibold text-white/75 hover:bg-white/10">
          Log out
        </button>
      </aside>
      <main className="flex-1 p-5 md:p-10 print:p-0">{children}</main>
    </div>
  );
}