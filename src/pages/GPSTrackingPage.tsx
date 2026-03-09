import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRole } from "@/contexts/RoleContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { defaultMileageSettings } from "@/data/settingsData";
import { MileageEntry } from "@/types/hcm";
import { Play, Square, Send, ArrowLeft, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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
  html: `<div style="background:hsl(var(--primary));color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚗</div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// eslint-disable-next-line react/display-name
const MapAutoCenter = ({ position }: { position: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
};
MapAutoCenter.displayName = "MapAutoCenter";

type Phase = "ready" | "tracking" | "review";

export default function GPSTrackingPage() {
  const navigate = useNavigate();
  const { currentEmployeeId } = useRole();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const employee = employees.find(e => e.id === currentEmployeeId);
  const vehicleType = "car" as const;
  const date = new Date().toISOString().split("T")[0];
  const rate = defaultMileageSettings.ratesByVehicle[vehicleType] || defaultMileageSettings.defaultRate;

  const [phase, setPhase] = useState<Phase>("ready");
  const [notes, setNotes] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }[]>([]);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const tripStartRef = useRef<number | null>(null);

  const amount = Math.round(gpsDistance * rate * 100) / 100;

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        addPoint(pos);
        watchIdRef.current = navigator.geolocation.watchPosition(
          addPoint, handleGeoError,
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
    if (!employee) return;
    const entry: Omit<MileageEntry, "id" | "status"> = {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      date,
      distance: gpsDistance,
      rate,
      amount,
      vehicleType,
      routeCoordinates: coordinates.length > 0 ? coordinates : undefined,
      notes: notes || undefined,
    };

    if (defaultMileageSettings.dailyDistanceCap && gpsDistance > defaultMileageSettings.dailyDistanceCap) {
      toast({ title: "Policy Warning", description: `Distance of ${gpsDistance} km exceeds daily cap of ${defaultMileageSettings.dailyDistanceCap} km.`, variant: "destructive" });
    }

    // We store this in sessionStorage so MileagePage can pick it up
    sessionStorage.setItem("newMileageEntry", JSON.stringify(entry));
    toast({ title: "Mileage Claim Submitted", description: `${gpsDistance.toFixed(1)} km × SAR ${rate}/km = SAR ${amount.toFixed(2)}` });
    navigate("/expenses");
  };

  const polyline = coordinates.map(c => [c.lat, c.lng] as [number, number]);

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* READY PHASE — only a Start button */}
      {phase === "ready" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="text-center space-y-3">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-content-center items-center justify-center">
              <MapPin className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">GPS Mileage Tracking</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Start your trip to automatically track distance and calculate reimbursement.
            </p>
          </div>
          <Button size="lg" onClick={startTracking} className="gap-3 px-10 py-6 text-lg font-semibold rounded-xl shadow-lg">
            <Play className="h-6 w-6" />
            Start Trip
          </Button>
          <Button variant="ghost" onClick={() => navigate("/expenses")} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Expenses
          </Button>
        </div>
      )}

      {/* TRACKING PHASE — map + live stats + stop */}
      {phase === "tracking" && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="rounded-xl border overflow-hidden flex-1" style={{ minHeight: 400 }}>
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

          <div className="flex items-center gap-6 p-5 rounded-xl bg-card border shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Distance</p>
              <p className="text-3xl font-bold">{gpsDistance.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Amount</p>
              <p className="text-3xl font-bold text-primary">SAR {amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Points</p>
              <p className="text-3xl font-bold">{coordinates.length}</p>
            </div>
            <div className="ml-auto">
              <Button variant="destructive" size="lg" onClick={stopTracking} className="gap-2 px-8 py-5 text-base font-semibold rounded-xl">
                <Square className="h-5 w-5" />Stop Trip
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground animate-pulse text-center">📡 GPS tracking active — move to record your route...</p>
        </div>
      )}

      {/* REVIEW PHASE — summary + submit */}
      {phase === "review" && (
        <div className="flex-1 flex flex-col gap-6 max-w-2xl mx-auto w-full pt-6">
          <h2 className="text-xl font-bold">Trip Summary</h2>

          <div className="rounded-xl border p-5 space-y-4 bg-card">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{employee ? `${employee.firstName} ${employee.lastName}` : "—"}</span></div>
              <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(date).toLocaleDateString()}</span></div>
              <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium capitalize">{vehicleType}</span></div>
              <div><span className="text-muted-foreground">Mode:</span> <span className="font-medium">GPS Tracked</span></div>
            </div>
            <div className="flex gap-6 pt-3 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-2xl font-bold">{gpsDistance.toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rate</p>
                <p className="text-2xl font-bold">SAR {rate}/km</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">SAR {amount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {coordinates.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ height: 220 }}>
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

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/mileage")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1 gap-2">
              <Send className="h-4 w-4" />Submit Mileage Claim
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
