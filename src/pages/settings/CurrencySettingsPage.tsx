import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { availableCurrencies, defaultCountryCurrencyMappings, CountryCurrencyMapping } from "@/data/settingsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Globe, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function CurrencySettingsPage() {
  const [reportingCurrency, setReportingCurrency] = useState("SAR");
  const [mappings, setMappings] = useState<CountryCurrencyMapping[]>([...defaultCountryCurrencyMappings]);
  const [editMapping, setEditMapping] = useState<CountryCurrencyMapping | null>(null);
  const [editCurrency, setEditCurrency] = useState("");
  const { toast } = useToast();

  const reportingCurrencyInfo = availableCurrencies.find(c => c.code === reportingCurrency);

  const handleSaveReporting = () => {
    toast({ title: "Reporting Currency Updated", description: `Reporting currency set to ${reportingCurrencyInfo?.name} (${reportingCurrencyInfo?.symbol}).` });
  };

  const handleEditMapping = (mapping: CountryCurrencyMapping) => {
    setEditMapping(mapping);
    setEditCurrency(mapping.currencyCode);
  };

  const handleSaveMapping = () => {
    if (!editMapping) return;
    setMappings(prev => prev.map(m => m.country === editMapping.country ? { ...m, currencyCode: editCurrency } : m));
    toast({ title: "Mapping Updated", description: `${editMapping.country} pay currency set to ${editCurrency}.` });
    setEditMapping(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Currency Settings" description="Configure the reporting currency and country-currency mappings for payroll." />

      {/* Section A: Reporting Currency */}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" />Reporting Currency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All payroll totals and reports will be converted to this currency for consolidated reporting.
          </p>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={reportingCurrency} onValueChange={setReportingCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reportingCurrencyInfo && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p className="text-sm"><span className="font-medium">Code:</span> {reportingCurrencyInfo.code}</p>
              <p className="text-sm"><span className="font-medium">Symbol:</span> {reportingCurrencyInfo.symbol}</p>
              <p className="text-sm"><span className="font-medium">Name:</span> {reportingCurrencyInfo.name}</p>
            </div>
          )}
          <Button className="gradient-ey text-primary-foreground font-semibold" onClick={handleSaveReporting}>Save Reporting Currency</Button>
        </CardContent>
      </Card>

      {/* Section B: Country-Currency Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" />Country–Pay Currency Mapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Each employee's pay currency is determined by their work location country. Edit mappings below to change the default pay currency per country.
          </p>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Country</TableHead>
                  <TableHead className="font-semibold">Pay Currency</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map(m => {
                  const currInfo = availableCurrencies.find(c => c.code === m.currencyCode);
                  return (
                    <TableRow key={m.country}>
                      <TableCell className="font-medium">{m.country}</TableCell>
                      <TableCell>{currInfo ? `${currInfo.symbol} — ${currInfo.name} (${currInfo.code})` : m.currencyCode}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditMapping(m)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Mapping Dialog */}
      <Dialog open={!!editMapping} onOpenChange={(open) => { if (!open) setEditMapping(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pay Currency</DialogTitle>
            <DialogDescription>Change the default pay currency for {editMapping?.country}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <p className="text-sm font-medium">{editMapping?.country}</p>
            </div>
            <div className="space-y-2">
              <Label>Pay Currency</Label>
              <Select value={editCurrency} onValueChange={setEditCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMapping(null)}>Cancel</Button>
            <Button onClick={handleSaveMapping}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
