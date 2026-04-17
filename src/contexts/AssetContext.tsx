import { createContext, useContext, ReactNode, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmployees } from "@/contexts/EmployeeContext";
import { Asset, AssetCategory, AssetStoreItem, AssetRequest, AssetConditionItem, AssetLocationItem } from "@/types/hcm";
import { AssetAudit, AssetAuditEntry, AssetLogEntry } from "@/types/asset";

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
  audits: AssetAudit[];
  addAudit: (audit: AssetAudit) => void;
  updateAuditEntry: (auditId: string, entryId: string, data: Partial<AssetAuditEntry>) => void;
  completeAudit: (auditId: string) => void;
  assetLogs: AssetLogEntry[];
  addAssetLog: (log: AssetLogEntry) => void;
  categories: AssetCategory[];
  addCategory: (cat: AssetCategory) => void;
  updateCategory: (id: string, data: Partial<AssetCategory>) => void;
  deleteCategory: (id: string) => boolean;
  canDeleteCategory: (id: string) => boolean;
  conditions: AssetConditionItem[];
  addCondition: (item: AssetConditionItem) => void;
  updateCondition: (id: string, data: Partial<AssetConditionItem>) => void;
  deleteCondition: (id: string) => boolean;
  canDeleteCondition: (id: string) => boolean;
  locations: AssetLocationItem[];
  addLocation: (item: AssetLocationItem) => void;
  updateLocation: (id: string, data: Partial<AssetLocationItem>) => void;
  deleteLocation: (id: string) => boolean;
  canDeleteLocation: (id: string) => boolean;
  storeItems: AssetStoreItem[];
  addStoreItem: (item: AssetStoreItem) => void;
  updateStoreItem: (id: string, data: Partial<AssetStoreItem>) => void;
  deleteStoreItem: (id: string) => boolean;
  canDeleteStoreItem: (id: string) => boolean;
  getStoreItemsForDisplay: () => AssetStoreItem[];
  assetRequests: AssetRequest[];
  addAssetRequest: (req: AssetRequest) => void;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  getEmployeeRequests: (employeeId: string) => AssetRequest[];
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

const sb = supabase as any;

const DEFAULT_CATEGORIES = [
  { name: "Laptops", description: "Portable computers and notebooks" },
  { name: "Keyboards", description: "Wired and wireless keyboards" },
  { name: "Monitors", description: "Desktop monitors and displays" },
  { name: "Mobile Phones", description: "Company mobile devices" },
  { name: "Printers", description: "Office printers and scanners" },
  { name: "Tablets", description: "Tablet devices" },
  { name: "Accessories", description: "Mice, headsets, cables and other accessories" },
];
const DEFAULT_CONDITIONS = [
  { name: "New", description: "Brand new, unused asset" },
  { name: "Good", description: "In good working condition" },
  { name: "Fair", description: "Used but functional" },
  { name: "Needs Repair", description: "Asset is damaged and may need repair" },
  { name: "Damaged", description: "Asset is damaged and may need repair" },
  { name: "Retired", description: "No longer in service" },
];
const DEFAULT_LOCATIONS = [
  { name: "Head Office", description: "Main head office" },
  { name: "Warehouse", description: "Central warehouse storage" },
];

// Map UI condition slug ("needs-repair") to DB row (matched by name)
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
const fromSlug = (s: string) => s.replace(/-/g, " ");

export function AssetProvider({ children }: { children: ReactNode }) {
  const { clientId, user } = useAuth();
  const { employees } = useEmployees();
  const qc = useQueryClient();
  const seedDoneRef = useRef(false);

  const empNameById = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach(e => m.set(e.id, `${e.firstName} ${e.lastName}`));
    return m;
  }, [employees]);

  // ============ QUERIES ============
  const enabled = !!clientId;

  const { data: catsRaw = [] } = useQuery({
    queryKey: ["asset_categories", clientId], enabled,
    queryFn: async () => { const { data, error } = await sb.from("asset_categories").select("*").eq("client_id", clientId).order("name"); if (error) throw error; return data || []; },
  });
  const { data: condsRaw = [] } = useQuery({
    queryKey: ["asset_conditions", clientId], enabled,
    queryFn: async () => { const { data, error } = await sb.from("asset_conditions").select("*").eq("client_id", clientId).order("name"); if (error) throw error; return data || []; },
  });
  const { data: locsRaw = [] } = useQuery({
    queryKey: ["asset_locations", clientId], enabled,
    queryFn: async () => { const { data, error } = await sb.from("asset_locations").select("*").eq("client_id", clientId).order("name"); if (error) throw error; return data || []; },
  });
  const { data: assetsRaw = [] } = useQuery({
    queryKey: ["assets", clientId], enabled,
    queryFn: async () => {
      const { data, error } = await sb.from("assets")
        .select("*, asset_categories(name), asset_conditions(name), asset_locations(name)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error; return data || [];
    },
  });
  const { data: storeRaw = [] } = useQuery({
    queryKey: ["asset_store_items", clientId], enabled,
    queryFn: async () => { const { data, error } = await sb.from("asset_store_items").select("*, asset_categories(name)").eq("client_id", clientId); if (error) throw error; return data || []; },
  });
  const { data: requestsRaw = [] } = useQuery({
    queryKey: ["asset_requests", clientId], enabled,
    queryFn: async () => { const { data, error } = await sb.from("asset_requests").select("*, asset_store_items(name, asset_categories(name)), employees(first_name, last_name)").eq("client_id", clientId).order("request_date", { ascending: false }); if (error) throw error; return data || []; },
  });
  const { data: auditsRaw = [] } = useQuery({
    queryKey: ["asset_audits", clientId], enabled,
    queryFn: async () => {
      const { data: a, error } = await sb.from("asset_audits").select("*").eq("client_id", clientId).order("start_date", { ascending: false });
      if (error) throw error;
      const list = a || [];
      if (list.length === 0) return [];
      const { data: entries, error: e2 } = await sb.from("asset_audit_entries").select("*, assets(asset_tag, name)").in("audit_id", list.map((x: any) => x.id));
      if (e2) throw e2;
      return list.map((aud: any) => ({ ...aud, _entries: (entries || []).filter((e: any) => e.audit_id === aud.id) }));
    },
  });
  const { data: historyRaw = [] } = useQuery({
    queryKey: ["asset_history", clientId], enabled,
    queryFn: async () => { const { data, error } = await sb.from("asset_history").select("*").eq("client_id", clientId).order("created_at", { ascending: false }); if (error) throw error; return data || []; },
  });

  // ============ AUTO-SEED defaults on first visit ============
  useEffect(() => {
    if (!clientId || seedDoneRef.current) return;
    if (catsRaw.length > 0 || condsRaw.length > 0 || locsRaw.length > 0) { seedDoneRef.current = true; return; }
    // Only seed if all three are empty (fresh tenant)
    const seed = async () => {
      seedDoneRef.current = true;
      await Promise.all([
        sb.from("asset_categories").insert(DEFAULT_CATEGORIES.map(c => ({ ...c, client_id: clientId, status: "active" }))),
        sb.from("asset_conditions").insert(DEFAULT_CONDITIONS.map(c => ({ ...c, client_id: clientId, status: "active" }))),
        sb.from("asset_locations").insert(DEFAULT_LOCATIONS.map(l => ({ ...l, client_id: clientId, status: "active" }))),
      ]);
      qc.invalidateQueries({ queryKey: ["asset_categories"] });
      qc.invalidateQueries({ queryKey: ["asset_conditions"] });
      qc.invalidateQueries({ queryKey: ["asset_locations"] });
    };
    seed();
  }, [clientId, catsRaw.length, condsRaw.length, locsRaw.length, qc]);

  // ============ MAPPING TO UI SHAPES ============
  const categories: AssetCategory[] = useMemo(() => catsRaw.map((c: any) => ({
    id: c.id, name: c.name, description: c.description || "", status: c.status as "active" | "inactive", createdDate: (c.created_at || "").split("T")[0],
  })), [catsRaw]);

  const conditions: AssetConditionItem[] = useMemo(() => condsRaw.map((c: any) => ({
    id: c.id, name: c.name, description: c.description || "", status: c.status as "active" | "inactive", createdDate: (c.created_at || "").split("T")[0],
  })), [condsRaw]);

  const locations: AssetLocationItem[] = useMemo(() => locsRaw.map((l: any) => ({
    id: l.id, name: l.name, description: l.description || "", status: l.status as "active" | "inactive", createdDate: (l.created_at || "").split("T")[0],
  })), [locsRaw]);

  const assets: Asset[] = useMemo(() => assetsRaw.map((a: any) => ({
    id: a.id,
    assetTag: a.asset_tag,
    name: a.name,
    category: a.asset_categories?.name || "",
    model: a.model || undefined,
    brand: a.brand || undefined,
    serialNumber: a.serial_number || "",
    condition: (a.asset_conditions?.name ? slug(a.asset_conditions.name) : "good") as Asset["condition"],
    location: a.asset_locations?.name || undefined,
    employeeId: a.employee_id,
    employeeName: a.employee_id ? (empNameById.get(a.employee_id) || null) : null,
    assignedDate: a.assigned_date,
    status: a.status as Asset["status"],
    purchaseDate: a.purchase_date || undefined,
    warrantyExpiry: a.warranty_expiry || undefined,
    serviceDueDate: a.service_due_date || undefined,
  })), [assetsRaw, empNameById]);

  const storeItems: AssetStoreItem[] = useMemo(() => storeRaw.map((s: any) => ({
    id: s.id,
    name: s.name,
    categoryId: s.category_id || "",
    categoryName: s.asset_categories?.name || "",
    brand: s.brand || "",
    model: s.model || "",
    description: s.description || "",
    image: s.image_url || "",
    status: s.status as "active" | "inactive",
    sku: s.sku || undefined,
    estimatedCost: s.estimated_cost || undefined,
    warrantyPeriod: s.warranty_period || undefined,
    specifications: s.specifications || undefined,
    publishToStore: s.publish_to_store,
    createdDate: (s.created_at || "").split("T")[0],
  })), [storeRaw]);

  const assetRequests: AssetRequest[] = useMemo(() => requestsRaw.map((r: any) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employees ? `${r.employees.first_name || ""} ${r.employees.last_name || ""}`.trim() : "",
    storeItemId: r.store_item_id || "",
    storeItemName: r.asset_store_items?.name || "",
    category: r.asset_store_items?.asset_categories?.name || "",
    requestDate: r.request_date,
    reason: r.reason || "",
    priority: r.priority as "low" | "medium" | "high",
    status: r.status as "pending" | "approved" | "rejected",
  })), [requestsRaw]);

  const audits: AssetAudit[] = useMemo(() => auditsRaw.map((a: any) => {
    const entries: AssetAuditEntry[] = (a._entries || []).map((e: any) => ({
      id: e.id,
      auditId: e.audit_id,
      assetId: e.asset_id,
      assetTag: e.assets?.asset_tag || "",
      assetName: e.assets?.name || "",
      verification: e.verification,
      verifiedBy: e.verified_by || undefined,
      verifiedDate: e.verified_date ? e.verified_date.split("T")[0] : undefined,
      notes: e.notes || undefined,
    }));
    return {
      id: a.id,
      name: a.name,
      scope: a.scope,
      scopeValue: a.scope_value || undefined,
      startDate: a.start_date,
      endDate: a.end_date || undefined,
      status: a.status,
      totalAssets: entries.length,
      verified: entries.filter(e => e.verification === "verified").length,
      missing: entries.filter(e => e.verification === "missing").length,
      damaged: entries.filter(e => e.verification === "damaged").length,
      entries,
    };
  }), [auditsRaw]);

  const history: AssetHistoryEntry[] = useMemo(() => historyRaw.map((h: any) => ({
    id: h.id,
    assetId: h.asset_id,
    action: h.action,
    fromEmployeeId: h.from_employee_id,
    fromEmployeeName: h.from_employee_id ? (empNameById.get(h.from_employee_id) || null) : null,
    toEmployeeId: h.to_employee_id,
    toEmployeeName: h.to_employee_id ? (empNameById.get(h.to_employee_id) || null) : null,
    date: h.date,
    note: h.note || undefined,
  })), [historyRaw, empNameById]);

  // ============ HELPERS ============
  const findCategoryByName = (name?: string) => catsRaw.find((c: any) => c.name?.toLowerCase() === (name || "").toLowerCase());
  const findConditionBySlug = (s?: string) => {
    if (!s) return null;
    const target = fromSlug(s).toLowerCase();
    return condsRaw.find((c: any) => c.name?.toLowerCase() === target) || null;
  };
  const findLocationByName = (name?: string) => locsRaw.find((l: any) => l.name?.toLowerCase() === (name || "").toLowerCase());

  const invAll = () => {
    qc.invalidateQueries({ queryKey: ["assets"] });
    qc.invalidateQueries({ queryKey: ["asset_history"] });
  };

  const writeHistory = async (assetId: string, action: AssetHistoryEntry["action"], opts: { fromEmployeeId?: string | null; toEmployeeId?: string | null; note?: string } = {}) => {
    if (!clientId) return;
    await sb.from("asset_history").insert({
      client_id: clientId,
      asset_id: assetId,
      action,
      from_employee_id: opts.fromEmployeeId || null,
      to_employee_id: opts.toEmployeeId || null,
      note: opts.note || null,
      performed_by: user?.id || null,
      date: new Date().toISOString().split("T")[0],
    });
    qc.invalidateQueries({ queryKey: ["asset_history"] });
  };

  // ============ ASSET MUTATIONS ============
  const addAsset = async (asset: Asset) => {
    if (!clientId) return;
    const cat = findCategoryByName(asset.category);
    const cond = findConditionBySlug(asset.condition);
    const loc = findLocationByName(asset.location);
    const { data, error } = await sb.from("assets").insert({
      client_id: clientId,
      asset_tag: asset.assetTag,
      name: asset.name,
      category_id: cat?.id || null,
      condition_id: cond?.id || null,
      location_id: loc?.id || null,
      brand: asset.brand || null,
      model: asset.model || null,
      serial_number: asset.serialNumber,
      employee_id: asset.employeeId || null,
      assigned_date: asset.assignedDate || null,
      status: asset.status,
      purchase_date: asset.purchaseDate || null,
      warranty_expiry: asset.warrantyExpiry || null,
      service_due_date: asset.serviceDueDate || null,
    }).select().single();
    if (error) { console.error("addAsset", error); return; }
    await writeHistory(data.id, "created", { toEmployeeId: asset.employeeId, note: `Asset "${asset.name}" created` });
    if (asset.employeeId) {
      await writeHistory(data.id, "assigned", { toEmployeeId: asset.employeeId });
    }
    invAll();
  };

  const updateAsset = async (id: string, patch: Partial<Asset>, note?: string) => {
    if (!clientId) return;
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.assetTag !== undefined) dbPatch.asset_tag = patch.assetTag;
    if (patch.category !== undefined) dbPatch.category_id = findCategoryByName(patch.category)?.id || null;
    if (patch.condition !== undefined) dbPatch.condition_id = findConditionBySlug(patch.condition)?.id || null;
    if (patch.location !== undefined) dbPatch.location_id = findLocationByName(patch.location)?.id || null;
    if (patch.brand !== undefined) dbPatch.brand = patch.brand || null;
    if (patch.model !== undefined) dbPatch.model = patch.model || null;
    if (patch.serialNumber !== undefined) dbPatch.serial_number = patch.serialNumber;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.employeeId !== undefined) dbPatch.employee_id = patch.employeeId;
    if (patch.assignedDate !== undefined) dbPatch.assigned_date = patch.assignedDate;
    if (patch.purchaseDate !== undefined) dbPatch.purchase_date = patch.purchaseDate || null;
    if (patch.warrantyExpiry !== undefined) dbPatch.warranty_expiry = patch.warrantyExpiry || null;
    if (patch.serviceDueDate !== undefined) dbPatch.service_due_date = patch.serviceDueDate || null;
    const { error } = await sb.from("assets").update(dbPatch).eq("id", id);
    if (error) { console.error("updateAsset", error); return; }
    await writeHistory(id, "edited", { note: note || "Asset details updated" });
    invAll();
  };

  const deleteAsset = async (id: string) => {
    if (!clientId) return;
    const { error } = await sb.from("assets").delete().eq("id", id);
    if (error) { console.error("deleteAsset", error); return; }
    invAll();
  };

  const reassignAsset = async (id: string, toEmployeeId: string | null, _toEmployeeName: string | null) => {
    if (!clientId) return;
    const current = assetsRaw.find((a: any) => a.id === id);
    const fromEmployeeId = current?.employee_id || null;
    const action: AssetHistoryEntry["action"] = toEmployeeId ? (fromEmployeeId ? "reassigned" : "assigned") : "unassigned";
    const today = new Date().toISOString().split("T")[0];
    const { error } = await sb.from("assets").update({
      employee_id: toEmployeeId,
      assigned_date: toEmployeeId ? today : null,
      status: toEmployeeId ? "assigned" : "available",
    }).eq("id", id);
    if (error) { console.error("reassignAsset", error); return; }
    await writeHistory(id, action, { fromEmployeeId, toEmployeeId });
    invAll();
  };

  const bulkAddAssets = async (newAssets: Asset[]) => {
    if (!clientId || newAssets.length === 0) return;
    const rows = newAssets.map(a => ({
      client_id: clientId,
      asset_tag: a.assetTag,
      name: a.name,
      category_id: findCategoryByName(a.category)?.id || null,
      condition_id: findConditionBySlug(a.condition)?.id || null,
      location_id: findLocationByName(a.location)?.id || null,
      brand: a.brand || null,
      model: a.model || null,
      serial_number: a.serialNumber,
      status: "available",
      employee_id: null,
    }));
    const { data, error } = await sb.from("assets").insert(rows).select();
    if (error) { console.error("bulkAddAssets", error); return; }
    if (data && Array.isArray(data)) {
      await Promise.all(data.map((d: any) => writeHistory(d.id, "created", { note: `Bulk created: "${d.name}"` })));
    }
    invAll();
  };

  const getAssetHistory = (assetId: string) => history.filter(h => h.assetId === assetId).sort((a, b) => b.date.localeCompare(a.date));
  const getAssetsForEmployee = (employeeId: string) => assets.filter(a => a.employeeId === employeeId);

  // ============ CATEGORY/CONDITION/LOCATION MUTATIONS ============
  const addCategory = async (cat: AssetCategory) => {
    if (!clientId) return;
    await sb.from("asset_categories").insert({ client_id: clientId, name: cat.name, description: cat.description || null, status: cat.status });
    qc.invalidateQueries({ queryKey: ["asset_categories"] });
  };
  const updateCategory = async (id: string, data: Partial<AssetCategory>) => {
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description || null;
    if (data.status !== undefined) patch.status = data.status;
    await sb.from("asset_categories").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["asset_categories"] });
  };
  const canDeleteCategory = (id: string) => {
    const cat = catsRaw.find((c: any) => c.id === id);
    if (!cat) return true;
    return !storeRaw.some((si: any) => si.category_id === id) && !assetsRaw.some((a: any) => a.category_id === id);
  };
  const deleteCategory = (id: string) => {
    if (!canDeleteCategory(id)) return false;
    sb.from("asset_categories").delete().eq("id", id).then(() => qc.invalidateQueries({ queryKey: ["asset_categories"] }));
    return true;
  };

  const addCondition = async (item: AssetConditionItem) => {
    if (!clientId) return;
    await sb.from("asset_conditions").insert({ client_id: clientId, name: item.name, description: item.description || null, status: item.status });
    qc.invalidateQueries({ queryKey: ["asset_conditions"] });
  };
  const updateCondition = async (id: string, data: Partial<AssetConditionItem>) => {
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description || null;
    if (data.status !== undefined) patch.status = data.status;
    await sb.from("asset_conditions").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["asset_conditions"] });
  };
  const canDeleteCondition = (id: string) => !assetsRaw.some((a: any) => a.condition_id === id);
  const deleteCondition = (id: string) => {
    if (!canDeleteCondition(id)) return false;
    sb.from("asset_conditions").delete().eq("id", id).then(() => qc.invalidateQueries({ queryKey: ["asset_conditions"] }));
    return true;
  };

  const addLocation = async (item: AssetLocationItem) => {
    if (!clientId) return;
    await sb.from("asset_locations").insert({ client_id: clientId, name: item.name, description: item.description || null, status: item.status });
    qc.invalidateQueries({ queryKey: ["asset_locations"] });
  };
  const updateLocation = async (id: string, data: Partial<AssetLocationItem>) => {
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description || null;
    if (data.status !== undefined) patch.status = data.status;
    await sb.from("asset_locations").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["asset_locations"] });
  };
  const canDeleteLocation = (id: string) => !assetsRaw.some((a: any) => a.location_id === id);
  const deleteLocation = (id: string) => {
    if (!canDeleteLocation(id)) return false;
    sb.from("asset_locations").delete().eq("id", id).then(() => qc.invalidateQueries({ queryKey: ["asset_locations"] }));
    return true;
  };

  // ============ STORE ITEMS ============
  const addStoreItem = async (item: AssetStoreItem) => {
    if (!clientId) return;
    await sb.from("asset_store_items").insert({
      client_id: clientId,
      name: item.name,
      category_id: item.categoryId || null,
      brand: item.brand || null,
      model: item.model || null,
      description: item.description || null,
      image_url: item.image || null,
      status: item.status,
      sku: item.sku || null,
      estimated_cost: item.estimatedCost || null,
      warranty_period: item.warrantyPeriod || null,
      specifications: item.specifications || null,
      publish_to_store: item.publishToStore,
    });
    qc.invalidateQueries({ queryKey: ["asset_store_items"] });
  };
  const updateStoreItem = async (id: string, data: Partial<AssetStoreItem>) => {
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.categoryId !== undefined) patch.category_id = data.categoryId || null;
    if (data.brand !== undefined) patch.brand = data.brand || null;
    if (data.model !== undefined) patch.model = data.model || null;
    if (data.description !== undefined) patch.description = data.description || null;
    if (data.image !== undefined) patch.image_url = data.image || null;
    if (data.status !== undefined) patch.status = data.status;
    if (data.sku !== undefined) patch.sku = data.sku || null;
    if (data.estimatedCost !== undefined) patch.estimated_cost = data.estimatedCost || null;
    if (data.warrantyPeriod !== undefined) patch.warranty_period = data.warrantyPeriod || null;
    if (data.specifications !== undefined) patch.specifications = data.specifications || null;
    if (data.publishToStore !== undefined) patch.publish_to_store = data.publishToStore;
    await sb.from("asset_store_items").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["asset_store_items"] });
  };
  const canDeleteStoreItem = (id: string) => !requestsRaw.some((r: any) => r.store_item_id === id && r.status !== "rejected");
  const deleteStoreItem = (id: string) => {
    if (!canDeleteStoreItem(id)) return false;
    sb.from("asset_store_items").delete().eq("id", id).then(() => qc.invalidateQueries({ queryKey: ["asset_store_items"] }));
    return true;
  };
  const getStoreItemsForDisplay = () => storeItems.filter(si => si.publishToStore && si.status === "active");

  // ============ REQUESTS ============
  const addAssetRequest = async (req: AssetRequest) => {
    if (!clientId) return;
    await sb.from("asset_requests").insert({
      client_id: clientId,
      employee_id: req.employeeId,
      store_item_id: req.storeItemId || null,
      request_date: req.requestDate || new Date().toISOString().split("T")[0],
      reason: req.reason || null,
      priority: req.priority,
      status: req.status,
    });
    qc.invalidateQueries({ queryKey: ["asset_requests"] });
  };
  const approveRequest = async (id: string) => {
    await sb.from("asset_requests").update({ status: "approved" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["asset_requests"] });
  };
  const rejectRequest = async (id: string) => {
    await sb.from("asset_requests").update({ status: "rejected" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["asset_requests"] });
  };
  const getEmployeeRequests = (employeeId: string) => assetRequests.filter(r => r.employeeId === employeeId);

  // ============ AUDITS ============
  const addAudit = async (audit: AssetAudit) => {
    if (!clientId) return;
    const { data: aud, error } = await sb.from("asset_audits").insert({
      client_id: clientId,
      name: audit.name,
      scope: audit.scope,
      scope_value: audit.scopeValue || null,
      start_date: audit.startDate,
      status: audit.status,
    }).select().single();
    if (error) { console.error("addAudit", error); return; }
    if (audit.entries.length > 0) {
      await sb.from("asset_audit_entries").insert(audit.entries.map(e => ({
        client_id: clientId,
        audit_id: aud.id,
        asset_id: e.assetId,
        verification: e.verification,
      })));
    }
    qc.invalidateQueries({ queryKey: ["asset_audits"] });
  };
  const updateAuditEntry = async (_auditId: string, entryId: string, data: Partial<AssetAuditEntry>) => {
    const patch: any = {};
    if (data.verification !== undefined) patch.verification = data.verification;
    if (data.verifiedBy !== undefined) patch.verified_by = null; // optional: we store user uuid only
    if (data.verifiedDate !== undefined) patch.verified_date = data.verifiedDate;
    if (data.notes !== undefined) patch.notes = data.notes || null;
    await sb.from("asset_audit_entries").update(patch).eq("id", entryId);
    qc.invalidateQueries({ queryKey: ["asset_audits"] });
  };
  const completeAudit = async (auditId: string) => {
    await sb.from("asset_audits").update({ status: "completed", end_date: new Date().toISOString().split("T")[0] }).eq("id", auditId);
    qc.invalidateQueries({ queryKey: ["asset_audits"] });
  };

  // ============ LOGS (in-memory, derived from history) ============
  const assetLogs: AssetLogEntry[] = useMemo(() => historyRaw.map((h: any) => {
    const a = assetsRaw.find((x: any) => x.id === h.asset_id);
    return {
      id: h.id,
      assetId: h.asset_id,
      assetTag: a?.asset_tag || "",
      assetName: a?.name || "",
      activity: h.action,
      employeeName: h.to_employee_id ? empNameById.get(h.to_employee_id) : undefined,
      performedBy: "System",
      date: h.date,
      details: h.note || "",
    };
  }), [historyRaw, assetsRaw, empNameById]);

  const addAssetLog = (_log: AssetLogEntry) => { /* no-op: logs are derived from history */ };

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
