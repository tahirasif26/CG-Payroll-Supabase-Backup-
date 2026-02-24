import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompanyProfileSection from "./CompanySettingsPage";
import CurrencySection from "./CurrencySettingsPage";
import GLCodeSection from "./GLCodeMappingPage";

export default function CompanyProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Company Profile" description="Manage company details, currency settings, and GL code mappings." />
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Company Details</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="gl-codes">GL Code Mapping</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><CompanyProfileSection /></TabsContent>
        <TabsContent value="currency"><CurrencySection /></TabsContent>
        <TabsContent value="gl-codes"><GLCodeSection /></TabsContent>
      </Tabs>
    </div>
  );
}
