import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompanyProfileSection from "./CompanySettingsPage";
import GLCodeSection from "./GLCodeMappingPage";
import VisualPreferenceSection from "./VisualPreferencePage";

export default function CompanyProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Company Profile" description="Manage company details and GL code mappings." />
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Company Details</TabsTrigger>
          <TabsTrigger value="gl-codes">GL Code Mapping</TabsTrigger>
          <TabsTrigger value="visual">Visual Preference</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><CompanyProfileSection /></TabsContent>
        <TabsContent value="gl-codes"><GLCodeSection /></TabsContent>
        <TabsContent value="visual"><VisualPreferenceSection /></TabsContent>
      </Tabs>
    </div>
  );
}
