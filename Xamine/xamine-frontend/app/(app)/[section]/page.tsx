import { Card } from "@/components/ui/Card";

// Placeholder for routes that are built in later milestones (exams, users, results).
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-[32px] font-extrabold capitalize">{section}</h1>
      <Card><p className="text-muted">This screen is built in the next milestone.</p></Card>
    </div>
  );
}
