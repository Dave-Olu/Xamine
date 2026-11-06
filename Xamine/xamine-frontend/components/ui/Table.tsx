export function Table({ heads, children, label = "Table" }: { heads: string[]; children: React.ReactNode; label?: string }) {
  return (
    <div className="overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full min-w-[560px] border-collapse text-left text-base">
        <thead>
          <tr className="text-sm text-muted">{heads.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-line [&_td]:px-3 [&_td]:py-4">{children}</tbody>
      </table>
    </div>
  );
}