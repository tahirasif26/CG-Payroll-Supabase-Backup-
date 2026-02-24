import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompensationSection from "./CompensationSettingsPage";
import DeductionsSection from "../DeductionsPage";
import TaxSection from "../TaxPage";
import EOSBenefitsSection from "./EOSBenefitsPage";
import LeaveTypesSection from "./LeaveTypesPage";

export default function PayrollSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Settings" description="Configure compensation, deductions, tax rules, leave types, and end-of-service benefits." />
      <Tabs defaultValue="compensation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="tax">Tax Config</TabsTrigger>
          <TabsTrigger value="leave-types">Leave Types</TabsTrigger>
          <TabsTrigger value="eos">EOS Benefits</TabsTrigger>
        </TabsList>
        <TabsContent value="compensation"><CompensationSection /></TabsContent>
        <TabsContent value="deductions"><DeductionsSection /></TabsContent>
        <TabsContent value="tax"><TaxSection /></TabsContent>
        <TabsContent value="leave-types"><LeaveTypesSection /></TabsContent>
        <TabsContent value="eos"><EOSBenefitsSection /></TabsContent>
      </Tabs>
    </div>
  );
}
