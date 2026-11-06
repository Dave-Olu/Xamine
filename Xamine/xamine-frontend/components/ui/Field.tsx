import type { InputHTMLAttributes } from "react";

export function Field({ label, error, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold">{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
        className={`rounded-xl border bg-white px-4 py-3.5 text-base placeholder:text-muted/70 ${error ? "border-danger" : "border-line"}`}
      />
      {error && <p id={`${id}-error`} className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
