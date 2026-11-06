export function Alert({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  const s = kind === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success";
  return <p role={kind === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-[15px] font-semibold ${s}`}>{children}</p>;
}
