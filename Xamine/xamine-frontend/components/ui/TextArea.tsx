import type { TextareaHTMLAttributes } from "react";

export function TextArea({ label, id, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold">{label}</label>
      <textarea id={id} rows={3} {...props}
        className={`rounded-xl border bg-white px-4 py-3.5 text-base placeholder:text-muted/70 ${error ? "border-danger" : "border-line"}`} />
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
