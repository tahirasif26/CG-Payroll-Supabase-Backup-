import { TopNavLayout } from "@/components/TopNavLayout";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return <TopNavLayout>{children}</TopNavLayout>;
}
