import { createContext, useContext, useCallback, ReactNode, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModuleEnabled } from "@/hooks/useModuleEnabled";

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

export function BLEAccessProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { clientId } = useAuth() as any;
  const accessEnabled = useModuleEnabled("access");
  const enabled = !!clientId && accessEnabled;
  const STALE = 5 * 60 * 1000;

  const { data: doorsRaw = [] } = useQuery({
    queryKey: ["ble_doors", clientId],
    enabled,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ble_doors")
        .select("id, name, location, status")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: grantsRaw = [] } = useQuery({
    queryKey: ["ble_access_grants", clientId],
    enabled,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ble_access_grants")
        .select("id, employee_id, door_id, granted_at, revoked_at, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const doors: BLEDoor[] = useMemo(
    () =>
      doorsRaw.map((d: any) => ({
        id: d.id,
        name: d.name,
        location: d.location ?? "",
        status: (d.status === "inactive" ? "inactive" : "active") as BLEDoor["status"],
      })),
    [doorsRaw],
  );

  const grants: BLEAccessGrant[] = useMemo(
    () =>
      grantsRaw.map((g: any) => ({
        id: g.id,
        employeeId: g.employee_id,
        doorId: g.door_id,
        grantedAt: g.granted_at,
        revokedAt: g.revoked_at ?? undefined,
        status: (g.status === "revoked" ? "revoked" : "active") as BLEAccessGrant["status"],
      })),
    [grantsRaw],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ble_doors"] });
    qc.invalidateQueries({ queryKey: ["ble_access_grants"] });
  };

  const addDoor = useCallback(
    async (door: Omit<BLEDoor, "id">) => {
      if (!clientId) throw new Error("No client context");
      const { error } = await supabase
        .from("ble_doors")
        .insert({ client_id: clientId, name: door.name, location: door.location, status: door.status });
      if (error) throw error;
      invalidate();
    },
    [clientId],
  );

  const editDoor = useCallback(async (id: string, updates: Partial<BLEDoor>) => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.status !== undefined) payload.status = updates.status;
    const { error } = await supabase.from("ble_doors").update(payload).eq("id", id);
    if (error) throw error;
    invalidate();
  }, []);

  const deleteDoor = useCallback(async (id: string) => {
    // FK cascade revokes grants automatically
    const { error } = await supabase.from("ble_doors").delete().eq("id", id);
    if (error) throw error;
    invalidate();
  }, []);

  const grantAccess = useCallback(
    async (employeeId: string, doorId: string) => {
      if (!clientId) throw new Error("No client context");
      // skip if already active
      const existing = grants.find(
        (g) => g.employeeId === employeeId && g.doorId === doorId && g.status === "active",
      );
      if (existing) return;
      const { error } = await supabase.from("ble_access_grants").insert({
        client_id: clientId,
        employee_id: employeeId,
        door_id: doorId,
        status: "active",
      });
      if (error) throw error;
      invalidate();
    },
    [clientId, grants],
  );

  const revokeAccess = useCallback(async (grantId: string) => {
    const { error } = await supabase
      .from("ble_access_grants")
      .update({ status: "revoked", revoked_at: new Date().toISOString().slice(0, 10) })
      .eq("id", grantId);
    if (error) throw error;
    invalidate();
  }, []);

  const revokeAllForEmployee = useCallback(
    async (employeeId: string): Promise<number> => {
      const active = grants.filter((g) => g.employeeId === employeeId && g.status === "active");
      if (active.length === 0) return 0;
      const { error } = await supabase
        .from("ble_access_grants")
        .update({ status: "revoked", revoked_at: new Date().toISOString().slice(0, 10) })
        .eq("employee_id", employeeId)
        .eq("status", "active");
      if (error) throw error;
      invalidate();
      return active.length;
    },
    [grants],
  );

  const getAccessForEmployee = useCallback(
    (employeeId: string) => grants.filter((g) => g.employeeId === employeeId && g.status === "active"),
    [grants],
  );

  const getAccessForDoor = useCallback(
    (doorId: string) => grants.filter((g) => g.doorId === doorId && g.status === "active"),
    [grants],
  );

  const getActiveGrantCountForEmployee = useCallback(
    (employeeId: string) =>
      grants.filter((g) => g.employeeId === employeeId && g.status === "active").length,
    [grants],
  );

  return (
    <BLEAccessContext.Provider
      value={{
        doors,
        grants,
        addDoor,
        editDoor,
        deleteDoor,
        grantAccess,
        revokeAccess,
        revokeAllForEmployee,
        getAccessForEmployee,
        getAccessForDoor,
        getActiveGrantCountForEmployee,
      }}
    >
      {children}
    </BLEAccessContext.Provider>
  );
}

export function useBLEAccess() {
  const ctx = useContext(BLEAccessContext);
  if (!ctx) throw new Error("useBLEAccess must be used within BLEAccessProvider");
  return ctx;
}
