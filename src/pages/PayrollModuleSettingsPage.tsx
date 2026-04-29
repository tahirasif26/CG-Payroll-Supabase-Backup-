import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";

const PayrollSettingsPage = lazy(() => import("@/pages/settings/PayrollSettingsPage"));
const GLCodeMappingPage = lazy(() => import("@/pages/settings/GLCodeMappingPage"));
const TaxPage = lazy(() => import("@/pages/TaxPage"));
const DeductionsPage = lazy(() => import("@/pages/DeductionsPage"));
const EOSBenefitsPage = lazy(() => import("@/pages/settings/EOSBenefitsPage"));
const CompensationSettingsPage = lazy(() => import("@/pages/settings/CompensationSettingsPage"));

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
        description="Configure payroll engine, GL mapping, tax rules, deductions, end-of-service benefits and compensation."
      />
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="setup">Payroll Setup</TabsTrigger>
          <TabsTrigger value="gl">GL Codes</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="eosb">EOSB</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
        </TabsList>
        <TabsContent value="setup" className="mt-4">
          <Suspense fallback={<TabFallback />}><PayrollSettingsPage /></Suspense>
        </TabsContent>
        <TabsContent value="gl" className="mt-4">
          <Suspense fallback={<TabFallback />}><GLCodeMappingPage /></Suspense>
        </TabsContent>
        <TabsContent value="tax" className="mt-4">
          <Suspense fallback={<TabFallback />}><TaxPage /></Suspense>
        </TabsContent>
        <TabsContent value="deductions" className="mt-4">
          <Suspense fallback={<TabFallback />}><DeductionsPage /></Suspense>
        </TabsContent>
        <TabsContent value="eosb" className="mt-4">
          <Suspense fallback={<TabFallback />}><EOSBenefitsPage /></Suspense>
        </TabsContent>
        <TabsContent value="compensation" className="mt-4">
          <Suspense fallback={<TabFallback />}><CompensationSettingsPage /></Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
