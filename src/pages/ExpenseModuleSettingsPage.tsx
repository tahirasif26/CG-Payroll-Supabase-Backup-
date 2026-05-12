import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import MileageSettings from "@/components/expenses/MileageSettings";

const ExpenseCategoriesPage = lazy(() => import("@/pages/settings/ExpenseCategoriesPage"));
const CostAllocationPage = lazy(() => import("@/pages/CostAllocationPage"));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export default function ExpenseModuleSettingsPage() {
  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Expense Settings"
        description="Manage expense categories, mileage rates and cost allocation rules."
      />
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="mileage">Mileage Rates</TabsTrigger>
          <TabsTrigger value="cost">Cost Allocation</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-4">
          <Suspense fallback={<TabFallback />}><ExpenseCategoriesPage /></Suspense>
        </TabsContent>
        <TabsContent value="mileage" className="mt-4">
          <MileageSettings />
        </TabsContent>
        <TabsContent value="cost" className="mt-4">
          <Suspense fallback={<TabFallback />}><CostAllocationPage /></Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
