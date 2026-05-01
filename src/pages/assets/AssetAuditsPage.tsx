import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAssets } from "@/contexts/AssetContext";
import { AssetAudit, AssetAuditEntry } from "@/types/asset";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardCheck, CheckCircle, AlertTriangle, XCircle, Eye, ScanLine, FileSearch } from "lucide-react";
import { EmptyTableRow } from "@/components/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/StatusBadge";
import { QRScannerDialog } from "@/components/assets/QRScannerDialog";

let auditIdCounter = 100;
let auditEntryIdCounter = 1000;

export default function AssetAuditsPage() {
  const { assets, audits, addAudit, updateAuditEntry, completeAudit, addAssetLog } = useAssets();
  const { toast } = useToast();

  const [newOpen, setNewOpen] = useState(false);
  const [auditName, setAuditName] = useState("");
  const [auditScope, setAuditScope] = useState<"all" | "department" | "location" | "employee">("all");
  const [scopeValue, setScopeValue] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewAudit, setViewAudit] = useState<AssetAudit | null>(null);
  const [qrScanOpen, setQrScanOpen] = useState(false);

  const departments = [...new Set(assets.map(a => a.category).filter(Boolean))];
  const locations = [...new Set(assets.map(a => a.location).filter(Boolean))];

  const handleStartAudit = (e: React.FormEvent) => {
    e.preventDefault();
    let auditAssets = assets;
    if (auditScope === "department") auditAssets = assets.filter(a => a.category === scopeValue);
    else if (auditScope === "location") auditAssets = assets.filter(a => a.location === scopeValue);
    else if (auditScope === "employee") auditAssets = assets.filter(a => (a.employeeName || "").toLowerCase().includes(scopeValue.toLowerCase()));

    if (auditAssets.length === 0) {
      toast({ title: "No assets found", description: "No assets match the selected scope.", variant: "destructive" });
      return;
    }

    const entries: AssetAuditEntry[] = auditAssets.map(a => ({
      id: `ae-${++auditEntryIdCounter}`,
      auditId: `aud-${auditIdCounter + 1}`,
      assetId: a.id,
      assetTag: a.assetTag,
      assetName: a.name,
      verification: "pending" as const,
    }));

    const audit: AssetAudit = {
      id: `aud-${++auditIdCounter}`,
      name: auditName,
      scope: auditScope,
      scopeValue: auditScope !== "all" ? scopeValue : undefined,
      startDate: new Date().toISOString().split("T")[0],
      status: "in-progress",
      totalAssets: entries.length,
      verified: 0,
      missing: 0,
      damaged: 0,
      entries,
    };

    addAudit(audit);
    setNewOpen(false);
    setAuditName(""); setAuditScope("all"); setScopeValue("");
    toast({ title: "Audit Started", description: `Audit "${auditName}" started with ${entries.length} assets.` });
  };

  const openView = (audit: AssetAudit) => {
    // Refresh from state
    const latest = audits.find(a => a.id === audit.id) || audit;
    setViewAudit(latest);
    setViewOpen(true);
  };

  const handleVerify = (entryId: string, verification: "verified" | "missing" | "damaged") => {
    if (!viewAudit) return;
    updateAuditEntry(viewAudit.id, entryId, {
      verification,
      verifiedBy: "Admin",
      verifiedDate: new Date().toISOString().split("T")[0],
    });
    // Update local view
    const updated = audits.find(a => a.id === viewAudit.id);
    if (updated) setViewAudit({ ...updated });
  };

  const handleCompleteAudit = () => {
    if (!viewAudit) return;
    completeAudit(viewAudit.id);
    setViewOpen(false);
    toast({ title: "Audit Completed" });
  };

  const handleQrAuditScan = (payload: { asset_tag: string; asset_id: string }) => {
    if (!viewAudit || viewAudit.status !== "in-progress") return;
    const entry = viewAudit.entries.find(e => e.assetTag === payload.asset_tag || e.assetId === payload.asset_id || e.assetTag.toLowerCase() === payload.asset_tag.toLowerCase());
    if (!entry) {
      toast({ title: "Asset Not in Audit", description: `Asset "${payload.asset_tag}" is not part of this audit.`, variant: "destructive" });
      return;
    }
    if (entry.verification !== "pending") {
      toast({ title: "Already Verified", description: `Asset "${entry.assetName}" was already marked as ${entry.verification}.` });
      return;
    }
    handleVerify(entry.id, "verified");
    addAssetLog({ id: `log-qr-audit-${Date.now()}`, assetId: entry.assetId, assetTag: entry.assetTag, assetName: entry.assetName, activity: "QR Audit Verification", performedBy: "Admin", date: new Date().toISOString().split("T")[0], details: `Verified via QR scan in audit "${viewAudit.name}"` });
    toast({ title: "Asset Verified via QR", description: `${entry.assetName} (${entry.assetTag}) verified.` });
  };

  const totalAudits = audits.length;
  const activeAudits = audits.filter(a => a.status === "in-progress").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Asset Audits" description="Conduct and review asset verification audits.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Start Audit
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Audits" value={totalAudits} icon={ClipboardCheck} variant="primary" />
        <StatCard title="In Progress" value={activeAudits} icon={AlertTriangle} variant="warning" />
        <StatCard title="Completed" value={totalAudits - activeAudits} icon={CheckCircle} variant="success" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Audit Name</TableHead>
              <TableHead className="font-semibold">Scope</TableHead>
              <TableHead className="font-semibold">Start Date</TableHead>
              <TableHead className="font-semibold">Total Assets</TableHead>
              <TableHead className="font-semibold">Verified</TableHead>
              <TableHead className="font-semibold">Missing</TableHead>
              <TableHead className="font-semibold">Damaged</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audits.length > 0 ? audits.map(audit => (
              <TableRow key={audit.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{audit.name}</TableCell>
                <TableCell className="capitalize">{audit.scope}{audit.scopeValue ? `: ${audit.scopeValue}` : ""}</TableCell>
                <TableCell>{new Date(audit.startDate).toLocaleDateString()}</TableCell>
                <TableCell>{audit.totalAssets}</TableCell>
                <TableCell><span className="text-emerald-600 font-medium">{audit.verified}</span></TableCell>
                <TableCell><span className="text-destructive font-medium">{audit.missing}</span></TableCell>
                <TableCell><span className="text-warning font-medium">{audit.damaged}</span></TableCell>
                <TableCell><Badge variant={audit.status === "in-progress" ? "default" : "secondary"}>{audit.status === "in-progress" ? "In Progress" : "Completed"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(audit)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            )) : (
              <EmptyTableRow colSpan={9} icon={FileSearch} title="No audits yet" description="Start a new audit to verify your asset inventory." />
            )}
          </TableBody>
        </Table>
      </div>

      {/* Start Audit Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Asset Audit</DialogTitle>
            <DialogDescription>Define the scope and start verifying assets.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStartAudit} className="space-y-4">
            <div className="space-y-2"><Label>Audit Name</Label><Input required placeholder="e.g. Q1 2026 Full Audit" value={auditName} onChange={e => setAuditName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={auditScope} onValueChange={v => { setAuditScope(v as any); setScopeValue(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  <SelectItem value="department">By Category</SelectItem>
                  <SelectItem value="location">By Location</SelectItem>
                  <SelectItem value="employee">By Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {auditScope === "department" && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={scopeValue} onValueChange={setScopeValue}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {auditScope === "location" && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={scopeValue} onValueChange={setScopeValue}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>{locations.map(l => <SelectItem key={l} value={l!}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {auditScope === "employee" && (
              <div className="space-y-2"><Label>Employee Name</Label><Input placeholder="Search employee name..." value={scopeValue} onChange={e => setScopeValue(e.target.value)} /></div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit">Start Audit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Audit Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewAudit?.name}</DialogTitle>
            <DialogDescription>
              Scope: {viewAudit?.scope}{viewAudit?.scopeValue ? ` — ${viewAudit.scopeValue}` : ""} | {viewAudit?.totalAssets} assets
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{viewAudit?.verified || 0}</p><p className="text-xs text-muted-foreground">Verified</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-destructive">{viewAudit?.missing || 0}</p><p className="text-xs text-muted-foreground">Missing</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-warning">{viewAudit?.damaged || 0}</p><p className="text-xs text-muted-foreground">Damaged</p></CardContent></Card>
          </div>
          <ScrollArea className="flex-1 max-h-[45vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Asset Tag</TableHead>
                  <TableHead className="font-semibold">Asset Name</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(viewAudit?.entries || []).map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">{entry.assetTag}</TableCell>
                    <TableCell>{entry.assetName}</TableCell>
                    <TableCell>
                      <Badge variant={
                        entry.verification === "verified" ? "default" :
                        entry.verification === "missing" ? "destructive" :
                        entry.verification === "damaged" ? "secondary" : "outline"
                      } className="capitalize">{entry.verification}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {viewAudit?.status === "in-progress" && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600" onClick={() => handleVerify(entry.id, "verified")}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />Verified
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleVerify(entry.id, "missing")}>
                            <XCircle className="h-3.5 w-3.5 mr-1" />Missing
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-warning" onClick={() => handleVerify(entry.id, "damaged")}>
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />Damaged
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            {viewAudit?.status === "in-progress" && (
              <>
                <Button variant="outline" onClick={() => setQrScanOpen(true)}>
                  <ScanLine className="h-4 w-4 mr-2" />Scan QR
                </Button>
                <Button onClick={handleCompleteAudit}>Complete Audit</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Scanner for Audit */}
      <QRScannerDialog
        open={qrScanOpen}
        onOpenChange={setQrScanOpen}
        onScanResult={handleQrAuditScan}
        title="Scan Asset for Audit"
        description="Scan asset QR codes to verify them in this audit."
      />
    </div>
  );
}
