import { Asset } from "@/types/hcm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { CheckCircle, AlertTriangle, Eye, QrCode } from "lucide-react";
import { generateQRCodeSVG } from "@/lib/qrcode";

interface AssetVerificationPanelProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (asset: Asset) => void;
  onReportIssue: (asset: Asset) => void;
  onViewDetails: (asset: Asset) => void;
}

export function AssetVerificationPanel({ asset, open, onOpenChange, onVerify, onReportIssue, onViewDetails }: AssetVerificationPanelProps) {
  if (!asset) return null;

  const qrSvg = generateQRCodeSVG(JSON.stringify({ asset_tag: asset.assetTag, asset_id: asset.id }), 100);

  const conditionColor = (c: string) => {
    if (c === "new" || c === "good") return "default" as const;
    if (c === "fair") return "secondary" as const;
    return "destructive" as const;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />Asset Verification</DialogTitle>
          <DialogDescription>Scanned asset details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR & Basic Info */}
          <div className="flex items-start gap-4">
            <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="shrink-0 border rounded-lg p-2 bg-white" />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-base">{asset.name}</p>
              <p className="text-xs font-mono text-muted-foreground">{asset.assetTag}</p>
              <StatusBadge status={asset.status} />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Employee</p>
              <p className="text-sm font-medium">{asset.employeeName || "Unassigned"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Condition</p>
              <Badge variant={conditionColor(asset.condition)} className="text-[10px]">{asset.condition.replace("-", " ")}</Badge>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Location</p>
              <p className="text-sm font-medium">{asset.location || "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Category</p>
              <p className="text-sm font-medium">{asset.category}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" className="w-full" onClick={() => { onVerify(asset); onOpenChange(false); }}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" />Verify
            </Button>
            <Button size="sm" variant="destructive" className="w-full" onClick={() => { onReportIssue(asset); onOpenChange(false); }}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />Issue
            </Button>
            <Button size="sm" variant="outline" className="w-full" onClick={() => { onViewDetails(asset); onOpenChange(false); }}>
              <Eye className="h-3.5 w-3.5 mr-1" />Details
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
