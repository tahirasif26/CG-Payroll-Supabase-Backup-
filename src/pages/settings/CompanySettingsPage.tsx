import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useClient } from "@/contexts/ClientContext";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building, Calendar, Lock, Image } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";

const months = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const daysInMonth: Record<string, number> = {
  "01": 31, "02": 28, "03": 31, "04": 30, "05": 31, "06": 30,
  "07": 31, "08": 31, "09": 30, "10": 31, "11": 30, "12": 31,
};

export default function CompanySettingsPage() {
  const { client, setClient } = useClient();
  const { clientId } = useRole();
  const [name, setName] = useState(client.companyName);
  const { toast } = useToast();

  const existingMonth = client.yearEndDate?.split("-")[0] || "";
  const existingDay = client.yearEndDate?.split("-")[1] || "";
  const [yeMonth, setYeMonth] = useState(existingMonth);
  const [yeDay, setYeDay] = useState(existingDay);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setClient({ ...client, companyName: name });
    toast({ title: "Saved", description: `Company name set to "${name}".` });
  };

  const handleSaveYearEnd = () => {
    if (!yeMonth || !yeDay) return;
    const yearEndDate = `${yeMonth}-${yeDay}`;
    setClient({ ...client, yearEndDate, yearEndLocked: true });
    toast({ title: "Year-End Date Saved", description: `Fiscal year-end set to ${months.find(m => m.value === yeMonth)?.label} ${parseInt(yeDay)}. This cannot be changed.` });
  };

  const maxDay = yeMonth ? daysInMonth[yeMonth] : 31;
  const dayOptions = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, "0"));

  const isLocked = client.yearEndLocked;
  const lockedMonthLabel = isLocked ? months.find(m => m.value === existingMonth)?.label : "";

  return (
    <div className="space-y-6">
      <PageHeader title="Company Profile" description="Set your organization name and branding." />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Building className="h-4 w-4" />Company Name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-2">
              <Label>Organization / Client Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your company name" required />
              <p className="text-xs text-muted-foreground">This name will appear on the sidebar, payroll reports, and payslips.</p>
            </div>
            <Button type="submit" className="gradient-ey text-primary-foreground font-semibold">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Image className="h-4 w-4" />Company Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileUpload
            bucket="client-logos"
            pathPrefix={clientId ?? "anonymous"}
            fileName="logo"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            maxSizeMB={2}
            currentUrl={client.companyLogo}
            onUploaded={(_path, url) => {
              if (url) {
                setClient({ ...client, companyLogo: url });
                toast({ title: "Logo uploaded" });
              }
            }}
            onRemoved={() => setClient({ ...client, companyLogo: undefined })}
          />
          <p className="text-xs text-muted-foreground">This logo will appear on digital greeting cards and payslips.</p>
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />Fiscal Year-End Date
            {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLocked ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{lockedMonthLabel} {parseInt(existingDay)}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />This date is locked and cannot be changed. It is used for leave balance resets, carryforward calculations, and mid-year proration.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Select the month and day your fiscal year ends. This defines when leave balances reset and is used for proration calculations. <strong>This cannot be changed once saved.</strong></p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={yeMonth} onValueChange={v => { setYeMonth(v); setYeDay(""); }}>
                    <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select value={yeDay} onValueChange={setYeDay} disabled={!yeMonth}>
                    <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent>
                      {dayOptions.map(d => <SelectItem key={d} value={d}>{parseInt(d)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveYearEnd} disabled={!yeMonth || !yeDay} className="gradient-ey text-primary-foreground font-semibold">Save Year-End Date</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
