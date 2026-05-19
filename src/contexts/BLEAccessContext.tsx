import { createContext, useContext, ReactNode } from "react";

/**
 * Stubbed during NestJS migration. The BLE door-access feature (Bluetooth
 * door entry tied to employee assignments) isn't yet modeled in Prisma.
 *
 * Restore by adding `BLEDoor` + `BLEAccessGrant` to the schema and a
 * `BLEAccessModule` to NestJS, then wire up @/api/ble-access hooks here.
 *
 * For now every list is empty and every mutation logs a warning so the
 * Access Management page renders without crashing.
 */

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
  addDoor: (door: Omit<BLEDoor, "id">) => Promise<void>;
  editDoor: (id: string, updates: Partial<BLEDoor>) => Promise<void>;
  deleteDoor: (id: string) => Promise<void>;
  grantAccess: (employeeId: string, doorId: string) => Promise<void>;
  revokeAccess: (grantId: string) => Promise<void>;
  revokeAllForEmployee: (employeeId: string) => Promise<number>;
  getAccessForEmployee: (employeeId: string) => BLEAccessGrant[];
  getAccessForDoor: (doorId: string) => BLEAccessGrant[];
  getActiveGrantCountForEmployee: (employeeId: string) => number;
}

const BLEAccessContext = createContext<BLEAccessContextType | undefined>(undefined);

const notImplemented = (op: string) =>
  // eslint-disable-next-line no-console
  console.warn(`[BLEAccessContext] ${op} not implemented — BLE Access module not yet on NestJS.`);

export function BLEAccessProvider({ children }: { children: ReactNode }) {
  const value: BLEAccessContextType = {
    doors: [],
    grants: [],
    addDoor: async () => notImplemented("addDoor"),
    editDoor: async () => notImplemented("editDoor"),
    deleteDoor: async () => notImplemented("deleteDoor"),
    grantAccess: async () => notImplemented("grantAccess"),
    revokeAccess: async () => notImplemented("revokeAccess"),
    revokeAllForEmployee: async () => {
      notImplemented("revokeAllForEmployee");
      return 0;
    },
    getAccessForEmployee: () => [],
    getAccessForDoor: () => [],
    getActiveGrantCountForEmployee: () => 0,
  };

  return <BLEAccessContext.Provider value={value}>{children}</BLEAccessContext.Provider>;
}

export function useBLEAccess() {
  const ctx = useContext(BLEAccessContext);
  if (!ctx) throw new Error("useBLEAccess must be used within BLEAccessProvider");
  return ctx;
}
