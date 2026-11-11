"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api, type Role, type User } from "@/lib/api";

// Pages each role may not open. The backend must enforce the same rules.
const DENIED: Partial<Record<Role, string[]>> = {
  school_admin: ["/schools"],
  teacher: ["/schools", "/users"],
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    api.getSession()
      .then((s) => {
        if (!s) router.replace("/login");
        else if (s.user.role === "student") router.replace("/student/dashboard");
        else setUser(s.user);
      })
      .catch((e) => setProblem(e instanceof Error ? e.message : String(e)));
  }, [router]);

  const blocked = !!user && (DENIED[user.role] ?? []).some((p) => path.startsWith(p));
  useEffect(() => { if (blocked) router.replace("/dashboard"); }, [blocked, router]);

  if (problem) return <pre className="p-6 text-danger">Session check failed: {problem}</pre>;
  if (!user) return <p className="p-6 text-muted">Checking your session...</p>;
  if (blocked) return null;
  return <AppShell user={user}>{children}</AppShell>;
}