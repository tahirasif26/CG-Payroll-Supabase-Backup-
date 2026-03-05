import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmployees } from "@/contexts/EmployeeContext";
import { defaultMileageSettings } from "@/data/settingsData";
import { MileageEntry } from "@/types/hcm";
import { MapPin, Navigation, Play, Square, Car, Bike } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const carIcon = new L.DivIcon({
  html: `<div style="background:hsl(var(--primary));color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚗</div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapAutoCenter({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: Omit<MileageEntry, "id" | "status">) => void;
}

export function MileageEntryDialog({ open, onOpenChange, onSubmit }: Props) {
  const { employees } = useEmployees();
  const { toast } = useToast();
  const [step, setStep] = useState<"entry" | "review">("entry");
  const [mode, setMode] = useState<"gps" | "manual">("manual");

  // Common fields
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [vehicleType, setVehicleType] = useState<"car" | "motorcycle" | "bicycle">("car");
  const [notes, setNotes] = useState("");

  // Manual fields
  const [manualDistance, setManualDistance] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");

  // GPS fields
  const [tracking, setTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }[]>([]);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const tripStartRef = useRef<number | null>(null);

  const rate = defaultMileageSettings.ratesByVehicle[vehicleType] || defaultMileageSettings.defaultRate;
  const distance = mode === "gps" ? gpsDistance : Number(manualDistance) || 0;
  const amount = Math.round(distance * rate * 100) / 100;

  const reset = useCallback(() => {
    setStep("entry");
    setMode("manual");
    setEmployeeId("");
    setDate(new Date().toISOString().split("T")[0]);
    setVehicleType("car");
    setNotes("");
    setManualDistance("");
    setFromAddress("");
    setToAddress("");
    setTracking(false);
    setCoordinates([]);
    setGpsDistance(0);
    setCurrentPos(null);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    tripStartRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Trip duration warning
  useEffect(() => {
    if (!tracking || !tripStartRef.current) return;
    const interval = setInterval(() => {
      if (tripStartRef.current && Date.now() - tripStartRef.current > 2 * 60 * 60 * 1000) {
        toast({ title: "Long Trip", description: "Your trip has been running for over 2 hours. Consider stopping if completed." });
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [tracking, toast]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS Unavailable", description: "Your browser does not support geolocation.", variant: "destructive" });
      return;
    }
    setTracking(true);
    setCoordinates([]);
    setGpsDistance(0);
    tripStartRef.current = Date.now();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPos([point.lat, point.lng]);
        setCoordinates(prev => {
          const newCoords = [...prev, point];
          if (newCoords.length >= 2) {
            const last = newCoords[newCoords.length - 2];
            const dist = haversineDistance(last.lat, last.lng, point.lat, point.lng);
            setGpsDistance(d => Math.round((d + dist) * 100) / 100);
          }
          return newCoords;
        });
      },
      (err) => {
        toast({ title: "GPS Error", description: err.message, variant: "destructive" });
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setStep("review");
  };

  const handleManualSubmit = () => {
    if (!employeeId || !manualDistance) return;
    setStep("review");
  };

  const handleFinalSubmit = () => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    onSubmit({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      date,
      distance,
      rate,
      amount,
      vehicleType,
      fromAddress: fromAddress || undefined,
      toAddress: toAddress || undefined,
      routeCoordinates: mode === "gps" && coordinates.length > 0 ? coordinates : undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  const emp = employees.find(e => e.id === employeeId);
  const polyline = coordinates.map(c => [c.lat, c.lng] as [number, number]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "entry" ? "New Mileage Entry" : "Review & Submit"}</DialogTitle>
          <DialogDescription>{step === "entry" ? "Record your trip using GPS tracking or manual entry." : "Review the details before submitting."}</DialogDescription>
        </DialogHeader>

        {step === "entry" && (
          <div className="space-y-4">
            {/* Common fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === "active").map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle Type</Label>
                <Select value={vehicleType} onValueChange={v => setVehicleType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">🚗 Car</SelectItem>
                    <SelectItem value="motorcycle">🏍️ Motorcycle</SelectItem>
                    <SelectItem value="bicycle">🚲 Bicycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rate</Label>
                <div className="h-9 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-medium">
                  SAR {rate}/km
                </div>
              </div>
            </div>

            <Tabs value={mode} onValueChange={v => setMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gps" className="gap-1.5"><Navigation className="h-3.5 w-3.5" />GPS Mode</TabsTrigger>
                <TabsTrigger value="manual" className="gap-1.5"><MapPin className="h-3.5 w-3.5" />Manual Entry</TabsTrigger>
              </TabsList>

              <TabsContent value="gps" className="space-y-3 mt-3">
                {/* Map */}
                <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}>
                  <MapContainer
                    center={currentPos || [24.7136, 46.6753]}
                    zoom={14}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {currentPos && <Marker position={currentPos} icon={carIcon} />}
                    {polyline.length >= 2 && <Polyline positions={polyline} color="hsl(var(--primary))" weight={4} />}
                    <MapAutoCenter position={currentPos} />
                  </MapContainer>
                </div>

                {/* Live stats */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
                  <div>
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-lg font-bold">{gpsDistance.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-lg font-bold">SAR {(gpsDistance * rate).toFixed(2)}</p>
                  </div>
                  <div className="ml-auto">
                    {!tracking ? (
                      <Button onClick={startTracking} disabled={!employeeId} className="gap-2">
                        <Play className="h-4 w-4" />Start Trip
                      </Button>
                    ) : (
                      <Button variant="destructive" onClick={stopTracking} className="gap-2">
                        <Square className="h-4 w-4" />Stop Trip
                      </Button>
                    )}
                  </div>
                </div>
                {tracking && (
                  <p className="text-xs text-muted-foreground animate-pulse">📡 GPS tracking active — move to record your route...</p>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Distance (km)</Label>
                    <Input type="number" step="0.1" value={manualDistance} onChange={e => setManualDistance(e.target.value)} placeholder="e.g. 25.5" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Calculated Amount</Label>
                    <div className="h-9 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-semibold">
                      SAR {(Number(manualDistance || 0) * rate).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>From (optional)</Label>
                    <Input value={fromAddress} onChange={e => setFromAddress(e.target.value)} placeholder="Starting location" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>To (optional)</Label>
                    <Input value={toAddress} onChange={e => setToAddress(e.target.value)} placeholder="Destination" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Purpose of trip, additional details..." rows={2} />
            </div>

            {mode === "manual" && (
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleManualSubmit} disabled={!employeeId || !manualDistance}>
                  Review
                </Button>
              </DialogFooter>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-semibold text-sm">Trip Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(date).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium capitalize">{vehicleType}</span></div>
                <div><span className="text-muted-foreground">Mode:</span> <span className="font-medium">{mode === "gps" ? "GPS Tracked" : "Manual Entry"}</span></div>
                {fromAddress && <div><span className="text-muted-foreground">From:</span> <span className="font-medium">{fromAddress}</span></div>}
                {toAddress && <div><span className="text-muted-foreground">To:</span> <span className="font-medium">{toAddress}</span></div>}
              </div>
              <div className="flex gap-6 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-xl font-bold">{distance.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="text-xl font-bold">SAR {rate}/km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold text-primary">SAR {amount.toFixed(2)}</p>
                </div>
              </div>
              {notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{notes}</p>
                </div>
              )}
            </div>

            {/* Map snapshot for GPS mode */}
            {mode === "gps" && coordinates.length > 0 && (
              <div className="rounded-lg border overflow-hidden" style={{ height: 200 }}>
                <MapContainer
                  center={coordinates.length > 0 ? [coordinates[Math.floor(coordinates.length / 2)].lat, coordinates[Math.floor(coordinates.length / 2)].lng] : [24.7136, 46.6753]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                  dragging={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Polyline positions={polyline} color="hsl(var(--primary))" weight={4} />
                  {coordinates.length > 0 && <Marker position={[coordinates[0].lat, coordinates[0].lng]} />}
                  {coordinates.length > 1 && <Marker position={[coordinates[coordinates.length - 1].lat, coordinates[coordinates.length - 1].lng]} />}
                </MapContainer>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("entry")}>Back</Button>
              <Button onClick={handleFinalSubmit}>Submit Mileage Claim</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
