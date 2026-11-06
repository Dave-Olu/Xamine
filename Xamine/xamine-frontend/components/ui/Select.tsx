import type { SelectHTMLAttributes } from "react";

export function Select({ label, id, options, error, ...props }:
  SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string; options: readonly string[]; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold">{label}</label>
      <select id={id} {...props} className="rounded-xl border border-line bg-white px-4 py-3.5 text-base">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
