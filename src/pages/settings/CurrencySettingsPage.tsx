import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { availableCurrencies } from "@/data/settingsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";

export default function CurrencySettingsPage() {
  const [currency, setCurrency] = useState("SAR");
  const { toast } = useToast();

  const selected = availableCurrencies.find(c => c.code === currency);

  const handleSave = () => {
    toast({ title: "Currency Updated", description: `Default currency set to ${selected?.name} (${selected?.symbol}).` });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Currency Settings" description="Set the default currency for the organization." />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" />Default Currency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p className="text-sm"><span className="font-medium">Code:</span> {selected.code}</p>
              <p className="text-sm"><span className="font-medium">Symbol:</span> {selected.symbol}</p>
              <p className="text-sm"><span className="font-medium">Name:</span> {selected.name}</p>
              <p className="text-sm text-muted-foreground mt-2">All monetary values across the platform will display using this currency.</p>
            </div>
          )}
          <Button className="gradient-ey text-primary-foreground font-semibold" onClick={handleSave}>Save Currency</Button>
        </CardContent>
      </Card>
    </div>
  );
}
