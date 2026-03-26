import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useReminderSettings } from "@/contexts/ReminderSettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";

export default function ReminderSettingsPage() {
  const { reminderDays, setReminderDays, autoRemind, setAutoRemind, reminderFrequency, setReminderFrequency } = useReminderSettings();
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Reminder settings saved", description: `Documents expiring within ${reminderDays} days will be flagged.` });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reminder Settings" description="Configure document expiry reminders applied globally to all employees." />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Document Expiry Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Remind</Label>
              <Input
                type="number"
                min={1}
                max={180}
                value={reminderDays}
                onChange={e => setReminderDays(Number(e.target.value))}
                className="h-9 w-24 text-sm"
              />
              <span className="text-sm text-muted-foreground">days before expiry</span>
            </div>
            <Separator orientation="vertical" className="h-8 hidden sm:block" />
            <div className="flex items-center gap-3">
              <Switch checked={autoRemind} onCheckedChange={setAutoRemind} />
              <Label className="text-sm">Auto-remind</Label>
            </div>
            {autoRemind && (
              <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
                <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Every 7 days</SelectItem>
                  <SelectItem value="15">Every 15 days</SelectItem>
                  <SelectItem value="30">Every 30 days</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
