import { useState } from "react";
import { Asset } from "@/types/hcm";
import { generateQRCodeSVG } from "@/lib/qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Printer, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AssetLabelGeneratorProps {
  assets: Asset[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName?: string;
  preSelectedIds?: string[];
}

function buildQRPayload(asset: Asset) {
  return JSON.stringify({ asset_tag: asset.assetTag, asset_id: asset.id });
}

function LabelCard({ asset, companyName }: { asset: Asset; companyName: string }) {
  const qrSvg = generateQRCodeSVG(buildQRPayload(asset), 80);

  return (
    <div className="border rounded-lg p-3 bg-card flex flex-col items-center gap-1.5 w-[200px] h-[130px] print:break-inside-avoid">
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-full">{companyName}</p>
      <p className="text-xs font-semibold truncate max-w-full leading-tight">{asset.name}</p>
      <div className="flex items-center gap-3 flex-1">
        <div className="flex flex-col gap-0.5 text-[9px] text-muted-foreground min-w-0">
          <span className="truncate"><span className="font-medium text-foreground">Tag:</span> {asset.assetTag}</span>
          <span className="truncate"><span className="font-medium text-foreground">S/N:</span> {asset.serialNumber}</span>
        </div>
        <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="shrink-0" />
      </div>
    </div>
  );
}

export function AssetLabelGenerator({ assets, open, onOpenChange, companyName = "HRConnect", preSelectedIds }: AssetLabelGeneratorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preSelectedIds || []));
  const { toast } = useToast();

  const toggleAsset = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === assets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(assets.map(a => a.id)));
  };

  const selectedAssets = assets.filter(a => selectedIds.has(a.id));

  const generatePrintHTML = (assetsToPrint: Asset[]) => {
    const labels = assetsToPrint.map(asset => {
      const qrSvg = generateQRCodeSVG(buildQRPayload(asset), 70);
      return `
        <div style="width:188px;height:113px;border:1px solid #ddd;border-radius:6px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:2px;page-break-inside:avoid;font-family:system-ui,sans-serif;">
          <p style="font-size:7px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0;">${companyName}</p>
          <p style="font-size:10px;font-weight:600;margin:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${asset.name}</p>
          <div style="display:flex;align-items:center;gap:10px;flex:1;">
            <div style="font-size:8px;color:#666;">
              <div><b style="color:#333;">Tag:</b> ${asset.assetTag}</div>
              <div><b style="color:#333;">S/N:</b> ${asset.serialNumber}</div>
            </div>
            <div>${qrSvg}</div>
          </div>
        </div>`;
    }).join("");

    return `<!DOCTYPE html><html><head><title>Asset Labels</title><style>
      @page{margin:10mm;}
      body{margin:0;padding:0;}
      .grid{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-start;}
    </style></head><body><div class="grid">${labels}</div></body></html>`;
  };

  const handlePrint = () => {
    if (selectedAssets.length === 0) {
      toast({ title: "No assets selected", variant: "destructive" });
      return;
    }
    const html = generatePrintHTML(selectedAssets);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 500);
    }
  };

  const handleDownloadSingle = (asset: Asset) => {
    const html = generatePrintHTML([asset]);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `label-${asset.assetTag}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Label Downloaded", description: `Label for ${asset.assetTag} downloaded.` });
  };

  const handleDownloadAll = () => {
    if (selectedAssets.length === 0) {
      toast({ title: "No assets selected", variant: "destructive" });
      return;
    }
    const html = generatePrintHTML(selectedAssets);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asset-labels-${selectedAssets.length}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Labels Downloaded", description: `${selectedAssets.length} labels downloaded.` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />Asset Label Generator</DialogTitle>
          <DialogDescription>Select assets to generate printable labels with QR codes.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={selectedIds.size === assets.length && assets.length > 0} onCheckedChange={selectAll} />
            <span className="text-sm text-muted-foreground">
              Select All ({selectedIds.size}/{assets.length})
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadAll} disabled={selectedIds.size === 0}>
              <Download className="h-4 w-4 mr-1" />Download Labels
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={selectedIds.size === 0}>
              <Printer className="h-4 w-4 mr-1" />Print Labels
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[55vh]">
          <div className="space-y-2">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/30 transition-colors">
                <Checkbox checked={selectedIds.has(asset.id)} onCheckedChange={() => toggleAsset(asset.id)} />
                <LabelCard asset={asset} companyName={companyName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">{asset.assetTag} · {asset.serialNumber}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDownloadSingle(asset)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {selectedAssets.length > 0 && (
          <>
            <p className="text-sm font-semibold mt-2">Preview ({selectedAssets.length} labels)</p>
            <ScrollArea className="max-h-[200px]">
              <div className="flex flex-wrap gap-2 p-2">
                {selectedAssets.map(asset => (
                  <LabelCard key={asset.id} asset={asset} companyName={companyName} />
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
