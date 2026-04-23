import { useState } from "react";
import { LayoutDashboard, User } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminOverviewPanel from "./AdminOverviewPanel";
import EmployeeDashboard from "./EmployeeDashboard";

type TabKey = "overview" | "my-dashboard";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            icon={LayoutDashboard}
            label="Admin Overview"
          />
          <TabButton
            active={activeTab === "my-dashboard"}
            onClick={() => setActiveTab("my-dashboard")}
            icon={User}
            label="My Dashboard"
          />
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" ? <AdminOverviewPanel /> : <EmployeeDashboard />}
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
