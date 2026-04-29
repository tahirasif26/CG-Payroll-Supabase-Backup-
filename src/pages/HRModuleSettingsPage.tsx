import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";

const LeaveTypesPage = lazy(() => import("@/pages/settings/LeaveTypesPage"));
const CompanyStructurePage = lazy(() => import("@/pages/settings/CompanyStructurePage"));
const ReminderSettingsPage = lazy(() => import("@/pages/settings/ReminderSettingsPage"));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export default function HRModuleSettingsPage() {
  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="HR Settings"
        description="Configure leave types, company structure and HR reminders."
      />
      <Tabs defaultValue="leave" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="leave">Leave Types</TabsTrigger>
          <TabsTrigger value="structure">Company Structure</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>
        <TabsContent value="leave" className="mt-4">
          <Suspense fallback={<TabFallback />}><LeaveTypesPage /></Suspense>
        </TabsContent>
        <TabsContent value="structure" className="mt-4">
          <Suspense fallback={<TabFallback />}><CompanyStructurePage /></Suspense>
        </TabsContent>
        <TabsContent value="reminders" className="mt-4">
          <Suspense fallback={<TabFallback />}><ReminderSettingsPage /></Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
