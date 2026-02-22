import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { availableCurrencies, defaultExchangeRates, ExchangeRate } from "@/data/settingsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeftRight, Plus, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function ExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([...defaultExchangeRates]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [formCurrency, setFormCurrency] = useState("");
  const [formRate, setFormRate] = useState("");
  const { toast } = useToast();

  const reportingCurrency = "SAR"; // Would come from shared state in production

  const resetForm = () => {
    setFormCurrency("");
    setFormRate("");
    setEditingRate(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setFormCurrency(rate.fromCurrency);
    setFormRate(String(rate.toReportingRate));
    setDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCurrency || !formRate) return;

    if (editingRate) {
      setRates(prev => prev.map(r => r.id === editingRate.id ? {
        ...r,
        fromCurrency: formCurrency,
        toReportingRate: Number(formRate),
        lastUpdated: new Date().toISOString().split("T")[0],
      } : r));
      toast({ title: "Rate Updated", description: `Exchange rate for ${formCurrency} updated.` });
    } else {
      const existing = rates.find(r => r.fromCurrency === formCurrency);
      if (existing) {
        toast({ title: "Already Exists", description: `An exchange rate for ${formCurrency} already exists. Edit it instead.`, variant: "destructive" });
        return;
      }
      const newRate: ExchangeRate = {
        id: String(Date.now()),
        fromCurrency: formCurrency,
        toReportingRate: Number(formRate),
        lastUpdated: new Date().toISOString().split("T")[0],
      };
      setRates(prev => [...prev, newRate]);
      toast({ title: "Rate Added", description: `Exchange rate for ${formCurrency} added.` });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!editingRate) return;
    setRates(prev => prev.filter(r => r.id !== editingRate.id));
    toast({ title: "Deleted", description: `Exchange rate for ${editingRate.fromCurrency} removed.` });
    setDeleteOpen(false);
    setEditingRate(null);
  };

  const usedCurrencies = new Set(rates.map(r => r.fromCurrency));
  const availableForAdd = availableCurrencies.filter(c => c.code !== reportingCurrency && !usedCurrencies.has(c.code));

  return (
    <div className="space-y-6">
      <PageHeader title="Exchange Rates" description="Manage exchange rates relative to the reporting currency for multi-currency payroll.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={handleOpenAdd}>
          <Plus className="h-4 w-4 mr-2" />Add Rate
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />Exchange Rates to {reportingCurrency}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            All rates are defined as: 1 [From Currency] = X {reportingCurrency}. These rates are used for payroll reporting and expense conversions.
          </p>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">From Currency</TableHead>
                  <TableHead className="font-semibold">To Currency</TableHead>
                  <TableHead className="font-semibold text-right">Rate</TableHead>
                  <TableHead className="font-semibold">Last Updated</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map(rate => {
                  const currInfo = availableCurrencies.find(c => c.code === rate.fromCurrency);
                  return (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{currInfo ? `${currInfo.symbol} ${currInfo.name} (${rate.fromCurrency})` : rate.fromCurrency}</TableCell>
                      <TableCell>{reportingCurrency}</TableCell>
                      <TableCell className="text-right font-semibold">{rate.toReportingRate}</TableCell>
                      <TableCell className="text-muted-foreground">{rate.lastUpdated}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(rate)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setEditingRate(rate); setDeleteOpen(true); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No exchange rates configured.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Exchange Rate" : "Add Exchange Rate"}</DialogTitle>
            <DialogDescription>
              {editingRate ? `Update the exchange rate for ${editingRate.fromCurrency}.` : `Set a new exchange rate relative to ${reportingCurrency}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>From Currency</Label>
              {editingRate ? (
                <p className="text-sm font-medium">{editingRate.fromCurrency}</p>
              ) : (
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>
                    {availableForAdd.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Rate (1 {formCurrency || editingRate?.fromCurrency || "?"} = X {reportingCurrency})</Label>
              <Input type="number" step="0.0001" placeholder="0.00" value={formRate} onChange={e => setFormRate(e.target.value)} required min={0.0001} />
            </div>
            {formCurrency && formRate && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p>1 {formCurrency} = {formRate} {reportingCurrency}</p>
                <p className="text-muted-foreground">1 {reportingCurrency} = {(1 / Number(formRate)).toFixed(4)} {formCurrency}</p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit">{editingRate ? "Update" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exchange Rate</DialogTitle>
            <DialogDescription>Are you sure you want to delete the exchange rate for {editingRate?.fromCurrency}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
