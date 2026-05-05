import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";

const PayrollSettingsPage = lazy(() => import("@/pages/settings/PayrollSettingsPage"));
const GLCodeMappingPage = lazy(() => import("@/pages/settings/GLCodeMappingPage"));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export default function PayrollModuleSettingsPage() {
  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Payroll Settings"
        description="Configure the payroll engine and GL code mapping."
      />
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="setup">Payroll Setup</TabsTrigger>
          <TabsTrigger value="gl">GL Code Mapping</TabsTrigger>
        </TabsList>
        <TabsContent value="setup" className="mt-4">
          <Suspense fallback={<TabFallback />}><PayrollSettingsPage /></Suspense>
        </TabsContent>
        <TabsContent value="gl" className="mt-4">
          <Suspense fallback={<TabFallback />}><GLCodeMappingPage /></Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
