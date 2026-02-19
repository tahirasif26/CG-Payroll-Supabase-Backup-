import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building } from "lucide-react";

export default function CompanySettingsPage() {
  const { client, setClient } = useClient();
  const [name, setName] = useState(client.companyName);
  const { toast } = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setClient({ ...client, companyName: name });
    toast({ title: "Saved", description: `Company name set to "${name}".` });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Company Profile" description="Set your organization name and branding." />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Building className="h-4 w-4" />Company Name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Organization / Client Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your company name" required />
              <p className="text-xs text-muted-foreground">This name will appear on the sidebar, payroll reports, and payslips.</p>
            </div>
            <Button type="submit" className="gradient-ey text-primary-foreground font-semibold">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
