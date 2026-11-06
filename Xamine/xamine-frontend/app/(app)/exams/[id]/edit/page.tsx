"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Exam } from "@/lib/api";
import { ExamForm } from "@/components/ExamForm";
import { Alert } from "@/components/ui/Alert";

export default function EditExamPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.getExam(id).then(setExam).catch((e) => setError(e.message)); }, [id]);
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!exam) return <p className="text-muted">Loading...</p>;
  return <ExamForm initial={exam} />;
}
