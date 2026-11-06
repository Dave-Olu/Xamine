"use client";
import { useEffect, useState } from "react";
import { api, type User } from "@/lib/api";
import { Card } from "@/components/ui/Card";

const MILESTONES = [
  "Milestone 1: foundation and sign-in screens (done)",
  "Milestone 2: users, exams, create exam, access codes (done)",
  "Milestone 3: student code, timed exam, instant result",
  "Milestone 4: polish, mobile, accessibility",
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { api.getSession().then((s) => setUser(s?.user ?? null)); }, []);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-[32px] font-extrabold">Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}</h1>
      <Card>
        <h2 className="mb-4 text-xl font-extrabold">Build progress</h2>
        <ul className="flex flex-col gap-3 text-[17px]">
          {MILESTONES.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </Card>
    </div>
  );
}
