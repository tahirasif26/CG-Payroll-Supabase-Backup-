import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Undo2, Eye, CheckCircle2, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAssets } from "@/contexts/AssetContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSeparations, SeparationRecord } from "@/contexts/SeparationContext";
import { payrollRuns } from "@/data/mockData";

export default function SeparationsPage() {
  const { separations, updateSeparation, removeSeparation } = useSeparations();
  const { getAssetsForEmployee } = useAssets();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<SeparationRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<SeparationRecord | null>(null);
  const { toast } = useToast();

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReason, setFilterReason] = useState("all");

  const filteredSeparations = separations.filter(sep => {
    const q = search.toLowerCase();
    const matchesSearch = !q || sep.employeeName.toLowerCase().includes(q) || sep.empId.toLowerCase().includes(q) || sep.department.toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" || sep.status === filterStatus;
    const matchesReason = filterReason === "all" || sep.reason === filterReason;
    return matchesSearch && matchesStatus && matchesReason;
  });

  const openEdit = (sep: SeparationRecord) => {
    setEditItem({ ...sep });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editItem) return;
    updateSeparation(editItem.id, editItem);
    setEditOpen(false);
    toast({ title: "Updated", description: `Separation record for ${editItem.employeeName} updated.` });
  };

  const handleDelete = (id: string) => {
    const sep = separations.find(s => s.id === id);
    removeSeparation(id);
    setDeleteConfirmOpen(false);
    setDeleteId(null);
    toast({
      title: "Separation Reversed",
      description: `${sep?.employeeName}'s separation has been reversed. Employee is now active again.`,
    });
  };

  const handleApprove = (sep: SeparationRecord) => {
    // Block if employee still has assigned assets
    const empAssets = getAssetsForEmployee(sep.employeeId);
    if (empAssets.length > 0) {
      toast({
        title: "Assets Still Assigned",
        description: `${sep.employeeName} still has ${empAssets.length} asset(s) assigned (${empAssets.map(a => a.name).join(", ")}). Please reassign or unassign all assets before approving separation.`,
        variant: "destructive",
      });
      return;
    }

    const processingRun = payrollRuns.find(r => r.status === "processing" || r.status === "draft");
    if (!processingRun) {
      toast({ title: "No Active Payroll", description: "There is no processing or draft payroll run to link this separation to.", variant: "destructive" });
      return;
    }
    updateSeparation(sep.id, {
      status: "approved",
      payrollRunId: processingRun.id,
      payrollMonth: processingRun.month,
      payrollYear: processingRun.year,
    });
    toast({ title: "Separation Approved", description: `${sep.employeeName}'s separation linked to ${processingRun.month} ${processingRun.year} payroll.` });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Separations" description="View and manage all employee separations. Reversing a separation will reactivate the employee." />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, ID, department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterReason} onValueChange={setFilterReason}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Reason" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            <SelectItem value="resignation">Resignation</SelectItem>
            <SelectItem value="termination">Termination</SelectItem>
            <SelectItem value="retirement">Retirement</SelectItem>
            <SelectItem value="end_of_contract">End of Contract</SelectItem>
            <SelectItem value="mutual">Mutual Agreement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Last Date</TableHead>
                <TableHead className="font-semibold">Reason</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Settlement (SAR)</TableHead>
                <TableHead className="font-semibold">Payroll Period</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSeparations.length > 0 ? filteredSeparations.map(sep => (
                <TableRow key={sep.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setDetailItem(sep)}>
                  <TableCell className="font-medium">{sep.employeeName}</TableCell>
                  <TableCell className="font-mono text-sm">{sep.empId}</TableCell>
                  <TableCell>{sep.department}</TableCell>
                  <TableCell>{sep.lastDate}</TableCell>
                  <TableCell className="capitalize">{sep.reason.replace("_", " ")}</TableCell>
                  <TableCell>
                    <Badge variant={sep.status === "approved" ? "default" : "secondary"}>
                      {sep.status === "approved" ? "Approved" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{sep.totalSettlement.toLocaleString()}</TableCell>
                  <TableCell>{sep.status === "approved" ? `${sep.payrollMonth} ${sep.payrollYear}` : "—"}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailItem(sep)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {sep.status === "pending" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleApprove(sep)} title="Approve & link to payroll">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(sep)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(sep.id); setDeleteConfirmOpen(true); }}>
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No separations recorded yet. Process a separation from the Employee Directory.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={open => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          {detailItem && (
            <>
              <div className="bg-primary px-6 py-5 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{detailItem.employeeName}</h2>
                    <p className="text-xs text-primary-foreground/70">{detailItem.designation} · {detailItem.department} · {detailItem.empId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold capitalize">{detailItem.reason.replace("_", " ")}</p>
                    <p className="text-xs text-primary-foreground/70">Processed {detailItem.processedDate}</p>
                  </div>
                </div>
              </div>
              <ScrollArea className="max-h-[calc(90vh-200px)]">
                <div className="px-6 py-5 space-y-5">
                  {/* Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Last Working Date</p>
                      <p className="font-semibold">{detailItem.lastDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Notice Period</p>
                      <p className="font-semibold">{detailItem.noticePeriodDays} days {detailItem.noticePeriodServed ? "(Served)" : "(Not Served)"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payroll Period</p>
                      <p className="font-semibold">{detailItem.payrollMonth} {detailItem.payrollYear}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Separation Reason</p>
                      <p className="font-semibold capitalize">{detailItem.reason.replace("_", " ")}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Detailed Settlement Breakdown */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settlement Breakdown</p>
                    <div className="bg-muted/30 rounded-lg overflow-hidden text-sm">
                      {/* Unpaid Salary */}
                      <div className="flex justify-between px-3 py-2.5 border-b border-border/50">
                        <div>
                          <span className="font-medium">Unpaid Salary</span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(detailItem.lastDate).getDate()} days × SAR {Math.round(detailItem.unpaidSalary / Math.max(1, new Date(detailItem.lastDate).getDate())).toLocaleString()}/day
                          </p>
                        </div>
                        <span className="font-semibold">SAR {detailItem.unpaidSalary.toLocaleString()}</span>
                      </div>

                      {/* EOS Benefits */}
                      {detailItem.eosBreakdown.map((eos, i) => (
                        <div key={i} className="flex justify-between px-3 py-2.5 border-b border-border/50">
                          <div>
                            <span className="font-medium">{eos.name}</span>
                            <p className="text-xs text-muted-foreground">End of service benefit</p>
                          </div>
                          <span className="font-semibold">SAR {eos.amount.toLocaleString()}</span>
                        </div>
                      ))}

                      {/* Leave Encashment */}
                      <div className="flex justify-between px-3 py-2.5 border-b border-border/50">
                        <div>
                          <span className="font-medium">Leave Encashment</span>
                          <p className="text-xs text-muted-foreground">
                            Outstanding leave days × daily rate
                          </p>
                        </div>
                        <span className="font-semibold">SAR {detailItem.leaveEncashment.toLocaleString()}</span>
                      </div>

                      {/* Notice Period Pay */}
                      {detailItem.noticePeriodPay > 0 && (
                        <div className="flex justify-between px-3 py-2.5 border-b border-border/50">
                          <div>
                            <span className="font-medium">Notice Period Payment</span>
                            <p className="text-xs text-muted-foreground">{detailItem.noticePeriodDays} days notice not served</p>
                          </div>
                          <span className="font-semibold">SAR {detailItem.noticePeriodPay.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Loan Deduction */}
                      {detailItem.loanDeduction > 0 && (
                        <div className="flex justify-between px-3 py-2.5 border-b border-border/50 text-destructive">
                          <div>
                            <span className="font-medium">Outstanding Loan Deduction</span>
                            <p className="text-xs opacity-80">Full remaining loan balance recovered</p>
                          </div>
                          <span className="font-semibold">- SAR {detailItem.loanDeduction.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex justify-between px-4 py-3 font-bold bg-primary/10">
                        <span>Total Final Settlement</span>
                        <span className="text-primary text-lg">SAR {detailItem.totalSettlement.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="px-6 pb-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailItem(null)}>Close</Button>
                <Button variant="outline" onClick={() => { setDetailItem(null); openEdit(detailItem); }}>
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Separation</DialogTitle>
            <DialogDescription>Update separation details for {editItem?.employeeName}.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Last Working Date</Label>
                  <Input type="date" value={editItem.lastDate} onChange={e => setEditItem({ ...editItem, lastDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={editItem.reason} onValueChange={v => setEditItem({ ...editItem, reason: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resignation">Resignation</SelectItem>
                      <SelectItem value="termination">Termination</SelectItem>
                      <SelectItem value="retirement">Retirement</SelectItem>
                      <SelectItem value="end_of_contract">End of Contract</SelectItem>
                      <SelectItem value="mutual">Mutual Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Settlement Breakdown</Label>
                <div className="bg-muted/30 rounded-lg text-sm overflow-hidden">
                  <div className="flex justify-between px-3 py-2 border-b border-border/50">
                    <span>Unpaid Salary</span>
                    <span className="font-medium">SAR {editItem.unpaidSalary.toLocaleString()}</span>
                  </div>
                  {editItem.eosBreakdown.map((eos, i) => (
                    <div key={i} className="flex justify-between px-3 py-2 border-b border-border/50">
                      <span>{eos.name}</span>
                      <span className="font-medium">SAR {eos.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 border-b border-border/50">
                    <span>Leave Encashment</span>
                    <span className="font-medium">SAR {editItem.leaveEncashment.toLocaleString()}</span>
                  </div>
                  {editItem.noticePeriodPay > 0 && (
                    <div className="flex justify-between px-3 py-2 border-b border-border/50">
                      <span>Notice Period Pay</span>
                      <span className="font-medium">SAR {editItem.noticePeriodPay.toLocaleString()}</span>
                    </div>
                  )}
                  {editItem.loanDeduction > 0 && (
                    <div className="flex justify-between px-3 py-2 border-b border-border/50 text-destructive">
                      <span>Loan Deduction</span>
                      <span className="font-medium">- SAR {editItem.loanDeduction.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 font-bold bg-primary/10">
                    <span>Total Settlement</span>
                    <span className="text-primary">SAR {editItem.totalSettlement.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reverse Separation</DialogTitle>
            <DialogDescription>This will reverse the separation and reactivate the employee. Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              <Undo2 className="h-4 w-4 mr-2" />Reverse & Reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
