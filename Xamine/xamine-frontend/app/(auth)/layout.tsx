import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-7">
        <Logo />
        <Card className="w-full p-9">{children}</Card>
        <p className="text-sm text-muted">Smart exams, trusted results.</p>
      </div>
    </div>
  );
}
