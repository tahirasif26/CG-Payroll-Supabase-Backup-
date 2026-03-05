import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployees } from "@/contexts/EmployeeContext";
import { defaultMileageSettings } from "@/data/settingsData";
import { MileageEntry } from "@/types/hcm";
import { Play, Square, X, Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  onSubmit: (entry: Omit<MileageEntry, "id" | "status">) => void;
  onClose: () => void;
}

type Phase = "setup" | "tracking" | "review";

export function GPSMileageTracker({ onSubmit, onClose }: Props) {
  const { employees } = useEmployees();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("setup");

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [vehicleType, setVehicleType] = useState<"car" | "motorcycle" | "bicycle">("car");
  const [notes, setNotes] = useState("");

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }[]>([]);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const tripStartRef = useRef<number | null>(null);

  const rate = defaultMileageSettings.ratesByVehicle[vehicleType] || defaultMileageSettings.defaultRate;
  const amount = Math.round(gpsDistance * rate * 100) / 100;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Long trip warning
  useEffect(() => {
    if (phase !== "tracking" || !tripStartRef.current) return;
    const interval = setInterval(() => {
      if (tripStartRef.current && Date.now() - tripStartRef.current > 2 * 60 * 60 * 1000) {
        toast({ title: "Long Trip", description: "Your trip has been running for over 2 hours." });
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [phase, toast]);

  const addPoint = useCallback((pos: GeolocationPosition) => {
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
  }, []);

  const handleGeoError = useCallback((err: GeolocationPositionError) => {
    toast({
      title: "GPS Error",
      description: err.code === 1 ? "Location permission denied. Please allow location access." :
        err.code === 2 ? "Position unavailable. Make sure GPS is enabled." :
          "Location request timed out. Please try again.",
      variant: "destructive",
    });
  }, [toast]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS Unavailable", description: "Your browser does not support geolocation.", variant: "destructive" });
      return;
    }

    setPhase("tracking");
    setCoordinates([]);
    setGpsDistance(0);
    tripStartRef.current = Date.now();

    // Get immediate position first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        addPoint(pos);
        // Then start continuous tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
          addPoint,
          handleGeoError,
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
      },
      handleGeoError,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setPhase("review");
  };

  const handleSubmit = () => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    onSubmit({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      date,
      distance: gpsDistance,
      rate,
      amount,
      vehicleType,
      routeCoordinates: coordinates.length > 0 ? coordinates : undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  const polyline = coordinates.map(c => [c.lat, c.lng] as [number, number]);
  const emp = employees.find(e => e.id === employeeId);

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {phase === "setup" && "Setup GPS Trip"}
          {phase === "tracking" && "📡 GPS Tracking Active"}
          {phase === "review" && "Review Trip"}
        </CardTitle>
        {phase !== "tracking" && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SETUP PHASE */}
        {phase === "setup" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <Label>Vehicle</Label>
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
            <Button onClick={startTracking} disabled={!employeeId} className="w-full gap-2">
              <Play className="h-4 w-4" />Start Trip
            </Button>
          </>
        )}

        {/* TRACKING PHASE */}
        {phase === "tracking" && (
          <>
            <div className="rounded-lg border overflow-hidden" style={{ height: 350 }}>
              <MapContainer
                center={currentPos || [24.7136, 46.6753]}
                zoom={15}
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

            <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/50 border">
              <div>
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-2xl font-bold">{gpsDistance.toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold">SAR {amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Points</p>
                <p className="text-2xl font-bold">{coordinates.length}</p>
              </div>
              <div className="ml-auto">
                <Button variant="destructive" size="lg" onClick={stopTracking} className="gap-2">
                  <Square className="h-4 w-4" />Stop Trip
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground animate-pulse">📡 GPS tracking active — move to record your route...</p>
          </>
        )}

        {/* REVIEW PHASE */}
        {phase === "review" && (
          <>
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-semibold text-sm">Trip Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(date).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium capitalize">{vehicleType}</span></div>
                <div><span className="text-muted-foreground">Mode:</span> <span className="font-medium">GPS Tracked</span></div>
              </div>
              <div className="flex gap-6 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-xl font-bold">{gpsDistance.toFixed(1)} km</p>
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
            </div>

            {coordinates.length > 0 && (
              <div className="rounded-lg border overflow-hidden" style={{ height: 200 }}>
                <MapContainer
                  center={[coordinates[Math.floor(coordinates.length / 2)].lat, coordinates[Math.floor(coordinates.length / 2)].lng]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                  dragging={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Polyline positions={polyline} color="hsl(var(--primary))" weight={4} />
                  <Marker position={[coordinates[0].lat, coordinates[0].lng]} />
                  {coordinates.length > 1 && <Marker position={[coordinates[coordinates.length - 1].lat, coordinates[coordinates.length - 1].lng]} />}
                </MapContainer>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Purpose of trip..." rows={2} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase("setup")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1 gap-2">
                <Send className="h-4 w-4" />Submit Mileage Claim
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
