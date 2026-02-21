import { createContext, useContext, useState, ReactNode } from "react";
import { Asset } from "@/types/hcm";
import { assets as initialAssets } from "@/data/mockData";

export interface AssetHistoryEntry {
  id: string;
  assetId: string;
  action: "assigned" | "unassigned" | "reassigned" | "created" | "deleted" | "edited" | "maintenance";
  fromEmployeeId?: string | null;
  fromEmployeeName?: string | null;
  toEmployeeId?: string | null;
  toEmployeeName?: string | null;
  date: string;
  note?: string;
}

interface AssetContextType {
  assets: Asset[];
  history: AssetHistoryEntry[];
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, data: Partial<Asset>, note?: string) => void;
  deleteAsset: (id: string) => void;
  reassignAsset: (id: string, toEmployeeId: string | null, toEmployeeName: string | null) => void;
  getAssetHistory: (assetId: string) => AssetHistoryEntry[];
  getAssetsForEmployee: (employeeId: string) => Asset[];
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

let historyIdCounter = 100;

export function AssetProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [history, setHistory] = useState<AssetHistoryEntry[]>(() => {
    // Seed initial history from existing assigned assets
    return initialAssets
      .filter(a => a.employeeId)
      .map((a, i) => ({
        id: String(i + 1),
        assetId: a.id,
        action: "assigned" as const,
        fromEmployeeId: null,
        fromEmployeeName: null,
        toEmployeeId: a.employeeId,
        toEmployeeName: a.employeeName,
        date: a.assignedDate || new Date().toISOString().split("T")[0],
      }));
  });

  const addHistoryEntry = (entry: Omit<AssetHistoryEntry, "id">) => {
    setHistory(prev => [...prev, { ...entry, id: String(++historyIdCounter) }]);
  };

  const addAsset = (asset: Asset) => {
    setAssets(prev => [...prev, asset]);
    addHistoryEntry({
      assetId: asset.id,
      action: "created",
      toEmployeeId: asset.employeeId,
      toEmployeeName: asset.employeeName,
      date: new Date().toISOString().split("T")[0],
      note: `Asset "${asset.name}" created`,
    });
    if (asset.employeeId) {
      addHistoryEntry({
        assetId: asset.id,
        action: "assigned",
        toEmployeeId: asset.employeeId,
        toEmployeeName: asset.employeeName,
        date: new Date().toISOString().split("T")[0],
      });
    }
  };

  const updateAsset = (id: string, data: Partial<Asset>, note?: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    addHistoryEntry({
      assetId: id,
      action: "edited",
      date: new Date().toISOString().split("T")[0],
      note: note || "Asset details updated",
    });
  };

  const deleteAsset = (id: string) => {
    const asset = assets.find(a => a.id === id);
    setAssets(prev => prev.filter(a => a.id !== id));
    addHistoryEntry({
      assetId: id,
      action: "deleted",
      date: new Date().toISOString().split("T")[0],
      note: `Asset "${asset?.name}" deleted`,
    });
  };

  const reassignAsset = (id: string, toEmployeeId: string | null, toEmployeeName: string | null) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    const action: AssetHistoryEntry["action"] = toEmployeeId
      ? (asset.employeeId ? "reassigned" : "assigned")
      : "unassigned";

    addHistoryEntry({
      assetId: id,
      action,
      fromEmployeeId: asset.employeeId,
      fromEmployeeName: asset.employeeName,
      toEmployeeId,
      toEmployeeName,
      date: new Date().toISOString().split("T")[0],
    });

    setAssets(prev => prev.map(a =>
      a.id === id
        ? {
            ...a,
            employeeId: toEmployeeId,
            employeeName: toEmployeeName,
            assignedDate: toEmployeeId ? new Date().toISOString().split("T")[0] : null,
            status: toEmployeeId ? "assigned" : "available",
          }
        : a
    ));
  };

  const getAssetHistory = (assetId: string) =>
    history.filter(h => h.assetId === assetId).sort((a, b) => b.date.localeCompare(a.date));

  const getAssetsForEmployee = (employeeId: string) =>
    assets.filter(a => a.employeeId === employeeId);

  return (
    <AssetContext.Provider value={{ assets, history, addAsset, updateAsset, deleteAsset, reassignAsset, getAssetHistory, getAssetsForEmployee }}>
      {children}
    </AssetContext.Provider>
  );
}

export function useAssets() {
  const ctx = useContext(AssetContext);
  if (!ctx) throw new Error("useAssets must be used within AssetProvider");
  return ctx;
}
