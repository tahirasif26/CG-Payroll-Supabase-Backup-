import { useState } from "react";
import { defaultMileageSettings, MileageSettings as MileageSettingsType } from "@/data/settingsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function MileageSettings() {
  const [settings, setSettings] = useState<MileageSettingsType>(defaultMileageSettings);
  const { toast } = useToast();

  const handleSave = () => {
    Object.assign(defaultMileageSettings, settings);
    toast({ title: "Saved", description: "Mileage settings updated." });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Per-Kilometre Rates (SAR)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>🚗 Car</Label>
              <Input type="number" step="0.5" value={settings.ratesByVehicle.car} onChange={e => setSettings(s => ({ ...s, ratesByVehicle: { ...s.ratesByVehicle, car: Number(e.target.value) } }))} />
            </div>
            <div className="space-y-1.5">
              <Label>🏍️ Motorcycle</Label>
              <Input type="number" step="0.5" value={settings.ratesByVehicle.motorcycle} onChange={e => setSettings(s => ({ ...s, ratesByVehicle: { ...s.ratesByVehicle, motorcycle: Number(e.target.value) } }))} />
            </div>
            <div className="space-y-1.5">
              <Label>🚲 Bicycle</Label>
              <Input type="number" step="0.5" value={settings.ratesByVehicle.bicycle} onChange={e => setSettings(s => ({ ...s, ratesByVehicle: { ...s.ratesByVehicle, bicycle: Number(e.target.value) } }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Default Rate (fallback)</Label>
            <Input type="number" step="0.5" value={settings.defaultRate} onChange={e => setSettings(s => ({ ...s, defaultRate: Number(e.target.value) }))} className="max-w-[200px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Daily Distance Cap (km)</Label>
            <Input type="number" value={settings.dailyDistanceCap} onChange={e => setSettings(s => ({ ...s, dailyDistanceCap: Number(e.target.value) }))} className="max-w-[200px]" placeholder="0 = no cap" />
            <p className="text-xs text-muted-foreground">Claims exceeding this will be flagged for review.</p>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={settings.requireGPS} onCheckedChange={v => setSettings(s => ({ ...s, requireGPS: v }))} />
            <Label>Require GPS tracking for all mileage claims</Label>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave}>Save Mileage Settings</Button>
    </div>
  );
}
