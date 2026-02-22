import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface BLEDoor {
  id: string;
  name: string;
  location: string;
  status: "active" | "inactive";
}

export interface BLEAccessGrant {
  id: string;
  employeeId: string;
  doorId: string;
  grantedAt: string;
  revokedAt?: string;
  status: "active" | "revoked";
}

interface BLEAccessContextType {
  doors: BLEDoor[];
  grants: BLEAccessGrant[];
  addDoor: (door: Omit<BLEDoor, "id">) => void;
  editDoor: (id: string, updates: Partial<BLEDoor>) => void;
  deleteDoor: (id: string) => void;
  grantAccess: (employeeId: string, doorId: string) => void;
  revokeAccess: (grantId: string) => void;
  revokeAllForEmployee: (employeeId: string) => number;
  getAccessForEmployee: (employeeId: string) => BLEAccessGrant[];
  getAccessForDoor: (doorId: string) => BLEAccessGrant[];
  getActiveGrantCountForEmployee: (employeeId: string) => number;
}

const BLEAccessContext = createContext<BLEAccessContextType | undefined>(undefined);

const DOORS_KEY = "cg_ble_doors";
const GRANTS_KEY = "cg_ble_grants";

const defaultDoors: BLEDoor[] = [
  { id: "door-1", name: "Main Entrance", location: "Building A, Ground Floor", status: "active" },
  { id: "door-2", name: "Server Room", location: "Building A, Floor 2", status: "active" },
  { id: "door-3", name: "Executive Suite", location: "Building A, Floor 3", status: "active" },
  { id: "door-4", name: "Parking Gate", location: "Basement Level 1", status: "active" },
  { id: "door-5", name: "Storage Room", location: "Building B, Ground Floor", status: "inactive" },
];

const defaultGrants: BLEAccessGrant[] = [
  { id: "grant-1", employeeId: "1", doorId: "door-1", grantedAt: "2024-01-15", status: "active" },
  { id: "grant-2", employeeId: "1", doorId: "door-2", grantedAt: "2024-01-15", status: "active" },
  { id: "grant-3", employeeId: "2", doorId: "door-1", grantedAt: "2024-01-10", status: "active" },
  { id: "grant-4", employeeId: "2", doorId: "door-3", grantedAt: "2024-01-10", status: "active" },
  { id: "grant-5", employeeId: "4", doorId: "door-1", grantedAt: "2024-02-01", status: "active" },
  { id: "grant-6", employeeId: "4", doorId: "door-2", grantedAt: "2024-02-01", status: "active" },
  { id: "grant-7", employeeId: "4", doorId: "door-3", grantedAt: "2024-02-01", status: "active" },
  { id: "grant-8", employeeId: "7", doorId: "door-1", grantedAt: "2024-01-05", status: "active" },
  { id: "grant-9", employeeId: "7", doorId: "door-3", grantedAt: "2024-01-05", status: "active" },
];

export function BLEAccessProvider({ children }: { children: ReactNode }) {
  const [doors, setDoors] = useState<BLEDoor[]>(() => {
    const saved = localStorage.getItem(DOORS_KEY);
    return saved ? JSON.parse(saved) : defaultDoors;
  });

  const [grants, setGrants] = useState<BLEAccessGrant[]>(() => {
    const saved = localStorage.getItem(GRANTS_KEY);
    return saved ? JSON.parse(saved) : defaultGrants;
  });

  const saveDoors = (d: BLEDoor[]) => { setDoors(d); localStorage.setItem(DOORS_KEY, JSON.stringify(d)); };
  const saveGrants = (g: BLEAccessGrant[]) => { setGrants(g); localStorage.setItem(GRANTS_KEY, JSON.stringify(g)); };

  const addDoor = useCallback((door: Omit<BLEDoor, "id">) => {
    const newDoor = { ...door, id: `door-${Date.now()}` };
    saveDoors([...doors, newDoor]);
  }, [doors]);

  const editDoor = useCallback((id: string, updates: Partial<BLEDoor>) => {
    saveDoors(doors.map(d => d.id === id ? { ...d, ...updates } : d));
  }, [doors]);

  const deleteDoor = useCallback((id: string) => {
    saveDoors(doors.filter(d => d.id !== id));
    // Also revoke all grants for this door
    saveGrants(grants.map(g => g.doorId === id && g.status === "active"
      ? { ...g, status: "revoked" as const, revokedAt: new Date().toISOString().split("T")[0] }
      : g
    ));
  }, [doors, grants]);

  const grantAccess = useCallback((employeeId: string, doorId: string) => {
    // Check if already active
    const existing = grants.find(g => g.employeeId === employeeId && g.doorId === doorId && g.status === "active");
    if (existing) return;
    const newGrant: BLEAccessGrant = {
      id: `grant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employeeId,
      doorId,
      grantedAt: new Date().toISOString().split("T")[0],
      status: "active",
    };
    saveGrants([...grants, newGrant]);
  }, [grants]);

  const revokeAccess = useCallback((grantId: string) => {
    saveGrants(grants.map(g => g.id === grantId
      ? { ...g, status: "revoked" as const, revokedAt: new Date().toISOString().split("T")[0] }
      : g
    ));
  }, [grants]);

  const revokeAllForEmployee = useCallback((employeeId: string): number => {
    let count = 0;
    const updated = grants.map(g => {
      if (g.employeeId === employeeId && g.status === "active") {
        count++;
        return { ...g, status: "revoked" as const, revokedAt: new Date().toISOString().split("T")[0] };
      }
      return g;
    });
    saveGrants(updated);
    return count;
  }, [grants]);

  const getAccessForEmployee = useCallback((employeeId: string) => {
    return grants.filter(g => g.employeeId === employeeId && g.status === "active");
  }, [grants]);

  const getAccessForDoor = useCallback((doorId: string) => {
    return grants.filter(g => g.doorId === doorId && g.status === "active");
  }, [grants]);

  const getActiveGrantCountForEmployee = useCallback((employeeId: string) => {
    return grants.filter(g => g.employeeId === employeeId && g.status === "active").length;
  }, [grants]);

  return (
    <BLEAccessContext.Provider value={{
      doors, grants, addDoor, editDoor, deleteDoor,
      grantAccess, revokeAccess, revokeAllForEmployee,
      getAccessForEmployee, getAccessForDoor, getActiveGrantCountForEmployee,
    }}>
      {children}
    </BLEAccessContext.Provider>
  );
}

export function useBLEAccess() {
  const ctx = useContext(BLEAccessContext);
  if (!ctx) throw new Error("useBLEAccess must be used within BLEAccessProvider");
  return ctx;
}
