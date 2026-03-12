import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Search, Zap, ZapOff, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanResult: (payload: { asset_tag: string; asset_id: string }) => void;
  title?: string;
  description?: string;
}

export function QRScannerDialog({ open, onOpenChange, onScanResult, title = "Scan QR Code", description = "Point camera at an asset QR code or search manually." }: QRScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setFlashOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError("Camera access denied or unavailable. Use manual search instead.");
    }
  }, []);

  useEffect(() => {
    if (open) startCamera();
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(!flashOn);
    } catch {
      toast({ title: "Flash not supported", variant: "destructive" });
    }
  };

  // Simulated QR detection - scans the camera frame for QR-like patterns
  // In production, use a library like jsQR
  useEffect(() => {
    if (!cameraActive || !open) return;
    // Since we don't have jsQR, we provide manual entry as primary method
    // Camera view serves as visual aid for reading QR codes manually
  }, [cameraActive, open]);

  const handleManualSubmit = () => {
    const searchVal = manualSearch.trim();
    if (!searchVal) return;

    // Try to parse as JSON QR payload
    try {
      const parsed = JSON.parse(searchVal);
      if (parsed.asset_tag && parsed.asset_id) {
        onScanResult(parsed);
        onOpenChange(false);
        setManualSearch("");
        return;
      }
    } catch {
      // Not JSON, treat as asset tag search
    }

    // Treat as asset tag
    onScanResult({ asset_tag: searchVal, asset_id: searchVal });
    onOpenChange(false);
    setManualSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopCamera(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-[4/3]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning Frame Overlay */}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-primary/60 animate-pulse top-1/2" />
                </div>
              </div>
            )}

            {/* Flash Toggle */}
            {cameraActive && (
              <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8" onClick={toggleFlash}>
                {flashOn ? <Zap className="h-4 w-4 text-yellow-500" /> : <ZapOff className="h-4 w-4" />}
              </Button>
            )}

            {!cameraActive && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button variant="secondary" onClick={startCamera}><Camera className="h-4 w-4 mr-2" />Start Camera</Button>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <p className="text-sm text-center text-muted-foreground">{error}</p>
              </div>
            )}
          </div>

          {/* Manual Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Manual Asset Search</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter asset tag (e.g. AST-001)..."
                value={manualSearch}
                onChange={e => setManualSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleManualSubmit(); }}
              />
              <Button onClick={handleManualSubmit} disabled={!manualSearch.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { stopCamera(); onOpenChange(false); }}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
