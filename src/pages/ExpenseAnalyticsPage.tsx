import { PageHeader } from "@/components/PageHeader";
import ExpenseAnalytics from "@/components/expenses/ExpenseAnalytics";

export default function ExpenseAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Expense Analytics" description="Compare category and employee spending across payroll periods." />
      <ExpenseAnalytics />
    </div>
  );
}
