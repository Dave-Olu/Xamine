import type { ExamStatus } from "@/lib/api";

const styles: Record<ExamStatus, string> = {
  draft: "bg-surface text-muted",
  scheduled: "bg-brand-soft text-brand",
  open: "bg-success-soft text-success",
  closed: "bg-danger-soft text-danger",
};

export function StatusChip({ status }: { status: ExamStatus }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold capitalize ${styles[status]}`}>{status}</span>;
}
