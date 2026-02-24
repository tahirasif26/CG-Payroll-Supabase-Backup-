import { useState, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building, Calendar, Lock, Upload, X, Image } from "lucide-react";

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
  const [name, setName] = useState(client.companyName);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setClient({ ...client, companyLogo: dataUrl });
      toast({ title: "Logo Uploaded", description: "Company logo has been saved." });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setClient({ ...client, companyLogo: undefined });
    toast({ title: "Logo Removed" });
  };

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
        <CardContent className="space-y-4">
          {client.companyLogo ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img src={client.companyLogo} alt="Company logo" className="h-20 w-auto max-w-[200px] object-contain rounded-md border" />
                <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">This logo will appear on digital greeting cards.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload logo</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or SVG (max 2MB)</p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleLogoUpload}
          />
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
