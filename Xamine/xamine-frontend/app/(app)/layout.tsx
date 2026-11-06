"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    api.getSession()
      .then((s) => {
        if (!s) router.replace("/login");
        else if (s.user.role === "student") router.replace("/student/dashboard");
        else setReady(true);
      })
      .catch((e) => setProblem(e instanceof Error ? e.message : String(e)));
  }, [router]);

  if (problem) return <pre className="p-6 text-danger">Session check failed: {problem}</pre>;
  if (!ready) return <p className="p-6 text-muted">Checking your session...</p>;
  return <AppShell>{children}</AppShell>;
}