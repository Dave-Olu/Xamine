// Placeholder mark. Replace the svg with the BLI logo (put the file in /public and use next/image).
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 text-[22px] font-extrabold ${light ? "text-white" : "text-ink"}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#5b2a9e" />
        <path d="M10 10l12 12M22 10L10 22" stroke="#f5b50a" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      Xamine
    </div>
  );
}
