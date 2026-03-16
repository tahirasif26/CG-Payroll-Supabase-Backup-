import { createContext, useContext, useState, ReactNode } from "react";
import { Asset, AssetCategory, AssetStoreItem, AssetRequest, AssetConditionItem, AssetLocationItem } from "@/types/hcm";
import { AssetAudit, AssetAuditEntry, AssetLogEntry } from "@/types/asset";
import { assets as initialAssets } from "@/data/mockData";

export interface AssetHistoryEntry {
  id: string;
  assetId: string;
  action: "assigned" | "unassigned" | "reassigned" | "created" | "deleted" | "edited" | "retired" | "condition-updated" | "audit-verified";
  fromEmployeeId?: string | null;
  fromEmployeeName?: string | null;
  toEmployeeId?: string | null;
  toEmployeeName?: string | null;
  date: string;
  note?: string;
}

const seedCategories: AssetCategory[] = [
  { id: "cat-1", name: "Laptops", description: "Portable computers and notebooks", status: "active", createdDate: "2025-01-15" },
  { id: "cat-2", name: "Keyboards", description: "Wired and wireless keyboards", status: "active", createdDate: "2025-01-15" },
  { id: "cat-3", name: "Monitors", description: "Desktop monitors and displays", status: "active", createdDate: "2025-01-15" },
  { id: "cat-4", name: "Mobile Phones", description: "Company mobile devices", status: "active", createdDate: "2025-01-15" },
  { id: "cat-5", name: "Printers", description: "Office printers and scanners", status: "active", createdDate: "2025-01-15" },
  { id: "cat-6", name: "Tablets", description: "Tablet devices", status: "active", createdDate: "2025-02-01" },
  { id: "cat-7", name: "Accessories", description: "Mice, headsets, cables and other accessories", status: "active", createdDate: "2025-02-01" },
];

const seedConditions: AssetConditionItem[] = [
  { id: "cond-1", name: "New", description: "Brand new, unused asset", status: "active", createdDate: "2025-01-15" },
  { id: "cond-2", name: "Good", description: "In good working condition", status: "active", createdDate: "2025-01-15" },
  { id: "cond-3", name: "Used", description: "Previously used but functional", status: "active", createdDate: "2025-01-15" },
  { id: "cond-4", name: "Old", description: "Aging asset, may need replacement soon", status: "active", createdDate: "2025-01-15" },
  { id: "cond-5", name: "Damaged", description: "Asset is damaged and may need repair", status: "active", createdDate: "2025-01-15" },
  { id: "cond-6", name: "Under Maintenance", description: "Currently being serviced or repaired", status: "active", createdDate: "2025-02-01" },
];

const seedLocations: AssetLocationItem[] = [
  { id: "loc-1", name: "Karachi", description: "Karachi office", status: "active", createdDate: "2025-01-15" },
  { id: "loc-2", name: "Lahore", description: "Lahore office", status: "active", createdDate: "2025-01-15" },
  { id: "loc-3", name: "Riyadh", description: "Riyadh headquarters", status: "active", createdDate: "2025-01-15" },
  { id: "loc-4", name: "Dubai", description: "Dubai branch", status: "active", createdDate: "2025-01-15" },
  { id: "loc-5", name: "Warehouse", description: "Central warehouse storage", status: "active", createdDate: "2025-02-01" },
  { id: "loc-6", name: "Head Office", description: "Main head office", status: "active", createdDate: "2025-02-01" },
];


const seedStoreItems: AssetStoreItem[] = [
  { id: "si-1", name: "HP Core i7 Laptop", categoryId: "cat-1", categoryName: "Laptops", brand: "HP", model: "ProBook 450 G10", description: "High-performance business laptop with Intel Core i7 processor, 16GB RAM, 512GB SSD.", image: "/assets/hp-laptop.png", status: "active", sku: "HP-PB450-I7", estimatedCost: 4500, warrantyPeriod: "3 years", publishToStore: true, createdDate: "2025-03-01" },
  { id: "si-2", name: "Dell XPS 15", categoryId: "cat-1", categoryName: "Laptops", brand: "Dell", model: "XPS 15 9530", description: "Premium ultrabook with stunning 15.6\" OLED display and powerful performance.", image: "/assets/dell-xps.png", status: "active", sku: "DELL-XPS15", estimatedCost: 6200, warrantyPeriod: "3 years", publishToStore: true, createdDate: "2025-03-01" },
  { id: "si-3", name: "MacBook Pro 14", categoryId: "cat-1", categoryName: "Laptops", brand: "Apple", model: "MacBook Pro 14\" M3", description: "Apple M3 chip, 18GB unified memory, 512GB SSD. Professional-grade performance.", image: "/assets/macbook.png", status: "active", sku: "APPLE-MBP14", estimatedCost: 7500, warrantyPeriod: "1 year", publishToStore: true, createdDate: "2025-03-01" },
  { id: "si-4", name: "Dell 27\" Monitor", categoryId: "cat-3", categoryName: "Monitors", brand: "Dell", model: "U2723QE", description: "27-inch 4K UltraSharp USB-C Hub monitor with excellent color accuracy.", image: "/assets/dell-monitor.png", status: "active", sku: "DELL-U2723", estimatedCost: 2200, warrantyPeriod: "3 years", publishToStore: true, createdDate: "2025-03-01" },
  { id: "si-5", name: "Logitech K380", categoryId: "cat-2", categoryName: "Keyboards", brand: "Logitech", model: "K380", description: "Compact multi-device Bluetooth keyboard with quiet keys.", image: "/assets/logitech-keyboard.png", status: "active", sku: "LOG-K380", estimatedCost: 150, warrantyPeriod: "1 year", publishToStore: true, createdDate: "2025-03-01" },
  { id: "si-6", name: "iPhone 15 Pro", categoryId: "cat-4", categoryName: "Mobile Phones", brand: "Apple", model: "iPhone 15 Pro", description: "Company mobile phone with A17 Pro chip.", image: "/assets/iphone.png", status: "active", publishToStore: false, createdDate: "2025-03-05" },
];

const seedRequests: AssetRequest[] = [
  { id: "req-1", employeeId: "2", employeeName: "Omar Hassan", storeItemId: "si-3", storeItemName: "MacBook Pro 14", category: "Laptops", requestDate: "2026-03-01", reason: "Current laptop is outdated and cannot run required software efficiently.", priority: "high", status: "pending" },
  { id: "req-2", employeeId: "1", employeeName: "Aisha Rahman", storeItemId: "si-4", storeItemName: "Dell 27\" Monitor", category: "Monitors", requestDate: "2026-02-25", reason: "Need an external monitor for better productivity.", priority: "medium", status: "approved" },
  { id: "req-3", employeeId: "3", employeeName: "Fatima Al-Sayed", storeItemId: "si-5", storeItemName: "Logitech K380", category: "Keyboards", requestDate: "2026-02-28", reason: "Ergonomic keyboard replacement needed.", priority: "low", status: "rejected" },
];


interface AssetContextType {
  assets: Asset[];
  history: AssetHistoryEntry[];
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, data: Partial<Asset>, note?: string) => void;
  deleteAsset: (id: string) => void;
  reassignAsset: (id: string, toEmployeeId: string | null, toEmployeeName: string | null) => void;
  getAssetHistory: (assetId: string) => AssetHistoryEntry[];
  getAssetsForEmployee: (employeeId: string) => Asset[];
  bulkAddAssets: (assets: Asset[]) => void;
  // Audits
  audits: AssetAudit[];
  addAudit: (audit: AssetAudit) => void;
  updateAuditEntry: (auditId: string, entryId: string, data: Partial<AssetAuditEntry>) => void;
  completeAudit: (auditId: string) => void;
  // Logs
  assetLogs: AssetLogEntry[];
  addAssetLog: (log: AssetLogEntry) => void;
  // Categories
  categories: AssetCategory[];
  addCategory: (cat: AssetCategory) => void;
  updateCategory: (id: string, data: Partial<AssetCategory>) => void;
  deleteCategory: (id: string) => boolean;
  canDeleteCategory: (id: string) => boolean;
  // Conditions
  conditions: AssetConditionItem[];
  addCondition: (item: AssetConditionItem) => void;
  updateCondition: (id: string, data: Partial<AssetConditionItem>) => void;
  deleteCondition: (id: string) => boolean;
  canDeleteCondition: (id: string) => boolean;
  // Locations
  locations: AssetLocationItem[];
  addLocation: (item: AssetLocationItem) => void;
  updateLocation: (id: string, data: Partial<AssetLocationItem>) => void;
  deleteLocation: (id: string) => boolean;
  canDeleteLocation: (id: string) => boolean;
  // Store Items
  storeItems: AssetStoreItem[];
  addStoreItem: (item: AssetStoreItem) => void;
  updateStoreItem: (id: string, data: Partial<AssetStoreItem>) => void;
  deleteStoreItem: (id: string) => boolean;
  canDeleteStoreItem: (id: string) => boolean;
  getStoreItemsForDisplay: () => AssetStoreItem[];
  // Requests
  assetRequests: AssetRequest[];
  addAssetRequest: (req: AssetRequest) => void;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  getEmployeeRequests: (employeeId: string) => AssetRequest[];
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

let historyIdCounter = 100;
let logIdCounter = 100;

export function AssetProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [history, setHistory] = useState<AssetHistoryEntry[]>(() =>
    initialAssets
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
      }))
  );
  const [categories, setCategories] = useState<AssetCategory[]>(seedCategories);
  const [conditions, setConditions] = useState<AssetConditionItem[]>(seedConditions);
  const [locations, setLocations] = useState<AssetLocationItem[]>(seedLocations);
  const [storeItems, setStoreItems] = useState<AssetStoreItem[]>(seedStoreItems);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>(seedRequests);
  
  const [audits, setAudits] = useState<AssetAudit[]>([]);
  const [assetLogs, setAssetLogs] = useState<AssetLogEntry[]>(() =>
    initialAssets.map((a, i) => ({
      id: `log-seed-${i}`,
      assetId: a.id,
      assetTag: a.assetTag,
      assetName: a.name,
      activity: "Asset Created",
      performedBy: "System",
      date: a.purchaseDate || "2025-01-01",
      details: `Asset "${a.name}" registered in inventory`,
    }))
  );

  const addHistoryEntry = (entry: Omit<AssetHistoryEntry, "id">) => {
    setHistory(prev => [...prev, { ...entry, id: String(++historyIdCounter) }]);
  };

  const addLogEntry = (log: Omit<AssetLogEntry, "id">) => {
    setAssetLogs(prev => [{ ...log, id: `log-${++logIdCounter}` }, ...prev]);
  };

  const addAsset = (asset: Asset) => {
    setAssets(prev => [...prev, asset]);
    addHistoryEntry({ assetId: asset.id, action: "created", toEmployeeId: asset.employeeId, toEmployeeName: asset.employeeName, date: new Date().toISOString().split("T")[0], note: `Asset "${asset.name}" created` });
    addLogEntry({ assetId: asset.id, assetTag: asset.assetTag, assetName: asset.name, activity: "Asset Created", performedBy: "Admin", date: new Date().toISOString().split("T")[0], details: `Asset "${asset.name}" (${asset.assetTag}) registered` });
    if (asset.employeeId) {
      addHistoryEntry({ assetId: asset.id, action: "assigned", toEmployeeId: asset.employeeId, toEmployeeName: asset.employeeName, date: new Date().toISOString().split("T")[0] });
      addLogEntry({ assetId: asset.id, assetTag: asset.assetTag, assetName: asset.name, activity: "Assigned", employeeName: asset.employeeName || undefined, performedBy: "Admin", date: new Date().toISOString().split("T")[0], details: `Assigned to ${asset.employeeName}` });
    }
  };

  const updateAsset = (id: string, data: Partial<Asset>, note?: string) => {
    const asset = assets.find(a => a.id === id);
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    addHistoryEntry({ assetId: id, action: "edited", date: new Date().toISOString().split("T")[0], note: note || "Asset details updated" });
    if (data.condition && asset && data.condition !== asset.condition) {
      addLogEntry({ assetId: id, assetTag: asset.assetTag, assetName: asset.name, activity: "Condition Updated", performedBy: "Admin", date: new Date().toISOString().split("T")[0], details: `Condition changed from "${asset.condition}" to "${data.condition}"` });
    }
    if (data.status === "retired" && asset) {
      addLogEntry({ assetId: id, assetTag: asset.assetTag, assetName: asset.name, activity: "Asset Retired", performedBy: "Admin", date: new Date().toISOString().split("T")[0], details: `Asset "${asset.name}" retired` });
    }
  };

  const deleteAsset = (id: string) => {
    const asset = assets.find(a => a.id === id);
    setAssets(prev => prev.filter(a => a.id !== id));
    addHistoryEntry({ assetId: id, action: "deleted", date: new Date().toISOString().split("T")[0], note: `Asset "${asset?.name}" deleted` });
  };

  const reassignAsset = (id: string, toEmployeeId: string | null, toEmployeeName: string | null) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    const action: AssetHistoryEntry["action"] = toEmployeeId ? (asset.employeeId ? "reassigned" : "assigned") : "unassigned";
    addHistoryEntry({ assetId: id, action, fromEmployeeId: asset.employeeId, fromEmployeeName: asset.employeeName, toEmployeeId, toEmployeeName, date: new Date().toISOString().split("T")[0] });
    const logActivity = toEmployeeId ? (asset.employeeId ? "Reassigned" : "Assigned") : "Returned";
    addLogEntry({ assetId: id, assetTag: asset.assetTag, assetName: asset.name, activity: logActivity, employeeName: toEmployeeName || asset.employeeName || undefined, performedBy: "Admin", date: new Date().toISOString().split("T")[0], details: toEmployeeId ? `${logActivity} to ${toEmployeeName}` : `Returned by ${asset.employeeName}` });
    setAssets(prev => prev.map(a => a.id === id ? { ...a, employeeId: toEmployeeId, employeeName: toEmployeeName, assignedDate: toEmployeeId ? new Date().toISOString().split("T")[0] : null, status: toEmployeeId ? "assigned" : "available" } : a));
  };

  const getAssetHistory = (assetId: string) => history.filter(h => h.assetId === assetId).sort((a, b) => b.date.localeCompare(a.date));
  const getAssetsForEmployee = (employeeId: string) => assets.filter(a => a.employeeId === employeeId);

  const bulkAddAssets = (newAssets: Asset[]) => {
    setAssets(prev => [...prev, ...newAssets]);
    const today = new Date().toISOString().split("T")[0];
    newAssets.forEach(asset => {
      addHistoryEntry({ assetId: asset.id, action: "created", toEmployeeId: null, toEmployeeName: null, date: today, note: `Asset "${asset.name}" bulk created` });
      addLogEntry({ assetId: asset.id, assetTag: asset.assetTag, assetName: asset.name, activity: "Asset Created", performedBy: "Admin", date: today, details: `Bulk created: "${asset.name}" (${asset.assetTag})` });
    });
  };


  // Audits
  const addAudit = (audit: AssetAudit) => setAudits(prev => [...prev, audit]);
  const updateAuditEntry = (auditId: string, entryId: string, data: Partial<AssetAuditEntry>) => {
    setAudits(prev => prev.map(a => {
      if (a.id !== auditId) return a;
      const updatedEntries = a.entries.map(e => e.id === entryId ? { ...e, ...data } : e);
      const verified = updatedEntries.filter(e => e.verification === "verified").length;
      const missing = updatedEntries.filter(e => e.verification === "missing").length;
      const damaged = updatedEntries.filter(e => e.verification === "damaged").length;
      return { ...a, entries: updatedEntries, verified, missing, damaged };
    }));
    // Log
    const audit = audits.find(a => a.id === auditId);
    const entry = audit?.entries.find(e => e.id === entryId);
    if (entry && data.verification) {
      addLogEntry({ assetId: entry.assetId, assetTag: entry.assetTag, assetName: entry.assetName, activity: "Audit Verified", performedBy: data.verifiedBy || "Admin", date: new Date().toISOString().split("T")[0], details: `Audit verification: ${data.verification}` });
    }
  };
  const completeAudit = (auditId: string) => {
    setAudits(prev => prev.map(a => a.id === auditId ? { ...a, status: "completed", endDate: new Date().toISOString().split("T")[0] } : a));
  };

  // Logs
  const addAssetLog = (log: AssetLogEntry) => setAssetLogs(prev => [log, ...prev]);

  // Categories
  const addCategory = (cat: AssetCategory) => setCategories(prev => [...prev, cat]);
  const updateCategory = (id: string, data: Partial<AssetCategory>) => setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  const canDeleteCategory = (id: string) => !storeItems.some(si => si.categoryId === id) && !assets.some(a => a.category === categories.find(c => c.id === id)?.name);
  const deleteCategory = (id: string) => {
    if (!canDeleteCategory(id)) return false;
    setCategories(prev => prev.filter(c => c.id !== id));
    return true;
  };

  // Conditions
  const addCondition = (item: AssetConditionItem) => setConditions(prev => [...prev, item]);
  const updateCondition = (id: string, data: Partial<AssetConditionItem>) => setConditions(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  const canDeleteCondition = (id: string) => {
    const cond = conditions.find(c => c.id === id);
    return !cond || !assets.some(a => a.condition.toLowerCase() === cond.name.toLowerCase());
  };
  const deleteCondition = (id: string) => { if (!canDeleteCondition(id)) return false; setConditions(prev => prev.filter(c => c.id !== id)); return true; };

  // Locations
  const addLocation = (item: AssetLocationItem) => setLocations(prev => [...prev, item]);
  const updateLocation = (id: string, data: Partial<AssetLocationItem>) => setLocations(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
  const canDeleteLocation = (id: string) => {
    const loc = locations.find(l => l.id === id);
    return !loc || !assets.some(a => a.location?.toLowerCase() === loc.name.toLowerCase());
  };
  const deleteLocation = (id: string) => { if (!canDeleteLocation(id)) return false; setLocations(prev => prev.filter(l => l.id !== id)); return true; };


  // Store Items
  const addStoreItem = (item: AssetStoreItem) => setStoreItems(prev => [...prev, item]);
  const updateStoreItem = (id: string, data: Partial<AssetStoreItem>) => setStoreItems(prev => prev.map(si => si.id === id ? { ...si, ...data } : si));
  const canDeleteStoreItem = (id: string) => !assetRequests.some(r => r.storeItemId === id && r.status !== "rejected");
  const deleteStoreItem = (id: string) => {
    if (!canDeleteStoreItem(id)) return false;
    setStoreItems(prev => prev.filter(si => si.id !== id));
    return true;
  };
  const getStoreItemsForDisplay = () => storeItems.filter(si => si.publishToStore && si.status === "active");

  // Requests
  const addAssetRequest = (req: AssetRequest) => setAssetRequests(prev => [...prev, req]);
  const approveRequest = (id: string) => setAssetRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
  const rejectRequest = (id: string) => setAssetRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r));
  const getEmployeeRequests = (employeeId: string) => assetRequests.filter(r => r.employeeId === employeeId);

  return (
    <AssetContext.Provider value={{
      assets, history, addAsset, updateAsset, deleteAsset, reassignAsset, getAssetHistory, getAssetsForEmployee, bulkAddAssets,
      audits, addAudit, updateAuditEntry, completeAudit,
      assetLogs, addAssetLog,
      categories, addCategory, updateCategory, deleteCategory, canDeleteCategory,
      conditions, addCondition, updateCondition, deleteCondition, canDeleteCondition,
      locations, addLocation, updateLocation, deleteLocation, canDeleteLocation,
      storeItems, addStoreItem, updateStoreItem, deleteStoreItem, canDeleteStoreItem, getStoreItemsForDisplay,
      assetRequests, addAssetRequest, approveRequest, rejectRequest, getEmployeeRequests,
    }}>
      {children}
    </AssetContext.Provider>
  );
}

export function useAssets() {
  const ctx = useContext(AssetContext);
  if (!ctx) throw new Error("useAssets must be used within AssetProvider");
  return ctx;
}
