import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "gold" | "outline" | "success";
const styles: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  gold: "bg-gold text-ink hover:brightness-95",
  outline: "border border-line bg-white text-ink hover:bg-surface",
  success: "bg-success text-white hover:brightness-95",
};

export function Button({
  variant = "primary", loading = false, className = "", children, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`w-full rounded-xl px-6 py-3.5 text-base font-bold transition disabled:opacity-60 ${styles[variant]} ${className}`}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
