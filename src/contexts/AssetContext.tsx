import { createContext, useContext, useMemo, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAssets as useAssetsApi,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useAssignAsset,
  useUnassignAsset,
  assetKeys,
  type Asset as ApiAsset,
} from "@/api";
import {
  Asset,
  AssetCategory,
  AssetStoreItem,
  AssetRequest,
  AssetConditionItem,
  AssetLocationItem,
} from "@/types/hcm";
import { AssetAudit, AssetAuditEntry, AssetLogEntry } from "@/types/asset";
import { useConsumerCounter, useLazyContextSubscribe } from "@/lib/lazy-context-query";

/**
 * Migrated to NestJS via @/api. The core asset list + assign/unassign/CRUD
 * are wired up. Sub-domains the backend doesn't model yet (categories,
 * conditions, locations, store items, audits, requests, asset logs) return
 * empty arrays with their mutations as no-ops, so consuming pages render
 * empty rather than crashing.
 *
 * To restore those features: build backend modules for asset_categories /
 * asset_conditions / asset_locations / asset_store_items / asset_requests /
 * asset_audits and add corresponding @/api hooks.
 */

export interface AssetHistoryEntry {
  id: string;
  assetId: string;
  action:
    | "assigned"
    | "unassigned"
    | "reassigned"
    | "created"
    | "deleted"
    | "edited"
    | "retired"
    | "condition-updated"
    | "audit-verified";
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
  reassignAsset: (
    id: string,
    toEmployeeId: string | null,
    toEmployeeName: string | null,
  ) => void;
  getAssetHistory: (assetId: string) => AssetHistoryEntry[];
  getAssetsForEmployee: (employeeId: string) => Asset[];
  bulkAddAssets: (assets: Asset[]) => void;
  audits: AssetAudit[];
  addAudit: (audit: AssetAudit) => void;
  updateAuditEntry: (
    auditId: string,
    entryId: string,
    data: Partial<AssetAuditEntry>,
  ) => void;
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
  /** @internal — wired up by `useAssets()` so the underlying query only fires while a page is consuming this provider. */
  _subscribe: () => () => void;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

function adaptAsset(a: ApiAsset): Asset {
  return {
    id: a.id,
    assetTag: a.assetTag,
    name: a.name,
    category: a.category ?? "",
    brand: a.brand ?? "",
    model: a.model ?? "",
    serialNumber: a.serialNumber ?? "",
    condition: a.condition ?? "good",
    location: a.location ?? "",
    assignedTo: a.assignedTo
      ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}`.trim()
      : "",
    assignedToId: a.assignedToId ?? undefined,
    assignedDate: a.assignedDate ?? undefined,
    status: a.status as Asset["status"],
    purchaseDate: a.purchaseDate ?? "",
    purchaseCost: a.purchaseCost ? Number(a.purchaseCost) : 0,
    warrantyExpiry: a.warrantyExpiry ?? "",
    serviceDueDate: a.serviceDueDate ?? undefined,
    notes: a.notes ?? "",
  };
}

const warnNotPorted = (feature: string) => {
  // eslint-disable-next-line no-console
  console.warn(`[AssetContext] "${feature}" is not yet implemented on the NestJS backend.`);
};

export function AssetProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  // Provider stays mounted globally but the list query only fires once a
  // consumer (e.g. the Assets page or the employee wizard's asset picker)
  // is rendered — see `useAssets()` below.
  const { enabled, subscribe } = useConsumerCounter();
  const listQ = useAssetsApi({ pageSize: 500 }, { enabled });
  const createMut = useCreateAsset();
  const updateMut = useUpdateAsset();
  const deleteMut = useDeleteAsset();
  const assignMut = useAssignAsset();
  const unassignMut = useUnassignAsset();

  const assets = useMemo<Asset[]>(
    () => (listQ.data?.data ?? []).map(adaptAsset),
    [listQ.data],
  );

  const noopArray = useMemo(() => [], []);

  const value: AssetContextType = {
    assets,
    history: noopArray as AssetHistoryEntry[],
    addAsset: (a) => {
      createMut.mutate({
        assetTag: a.assetTag,
        name: a.name,
        category: a.category ?? null,
        brand: a.brand ?? null,
        model: a.model ?? null,
        serialNumber: a.serialNumber ?? null,
        condition: a.condition ?? null,
        location: a.location ?? null,
        purchaseDate: a.purchaseDate || null,
        purchaseCost: a.purchaseCost ?? undefined,
        warrantyExpiry: a.warrantyExpiry || null,
        serviceDueDate: a.serviceDueDate || null,
        notes: a.notes ?? null,
      });
    },
    updateAsset: (id, data) => {
      updateMut.mutate({
        id,
        body: {
          name: data.name,
          category: data.category ?? null,
          brand: data.brand ?? null,
          model: data.model ?? null,
          serialNumber: data.serialNumber ?? null,
          condition: data.condition ?? null,
          location: data.location ?? null,
          purchaseDate: data.purchaseDate || null,
          purchaseCost: data.purchaseCost ?? undefined,
          warrantyExpiry: data.warrantyExpiry || null,
          serviceDueDate: data.serviceDueDate || null,
          notes: data.notes ?? null,
        },
      });
    },
    deleteAsset: (id) => deleteMut.mutate(id),
    reassignAsset: (id, toEmployeeId) => {
      if (toEmployeeId) {
        assignMut.mutate({ id, body: { assignedToId: toEmployeeId } });
      } else {
        unassignMut.mutate({ id, body: { status: "in_stock" } });
      }
    },
    getAssetHistory: () => [],
    getAssetsForEmployee: (employeeId) => assets.filter((a) => a.assignedToId === employeeId),
    bulkAddAssets: (list) => {
      list.forEach((a) => value.addAsset(a));
    },

    audits: noopArray as AssetAudit[],
    addAudit: () => warnNotPorted("audits"),
    updateAuditEntry: () => warnNotPorted("audits"),
    completeAudit: () => warnNotPorted("audits"),

    assetLogs: noopArray as AssetLogEntry[],
    addAssetLog: () => warnNotPorted("assetLogs"),

    categories: noopArray as AssetCategory[],
    addCategory: () => warnNotPorted("asset categories"),
    updateCategory: () => warnNotPorted("asset categories"),
    deleteCategory: () => {
      warnNotPorted("asset categories");
      return false;
    },
    canDeleteCategory: () => false,

    conditions: noopArray as AssetConditionItem[],
    addCondition: () => warnNotPorted("asset conditions"),
    updateCondition: () => warnNotPorted("asset conditions"),
    deleteCondition: () => {
      warnNotPorted("asset conditions");
      return false;
    },
    canDeleteCondition: () => false,

    locations: noopArray as AssetLocationItem[],
    addLocation: () => warnNotPorted("asset locations"),
    updateLocation: () => warnNotPorted("asset locations"),
    deleteLocation: () => {
      warnNotPorted("asset locations");
      return false;
    },
    canDeleteLocation: () => false,

    storeItems: noopArray as AssetStoreItem[],
    addStoreItem: () => warnNotPorted("asset store items"),
    updateStoreItem: () => warnNotPorted("asset store items"),
    deleteStoreItem: () => {
      warnNotPorted("asset store items");
      return false;
    },
    canDeleteStoreItem: () => false,
    getStoreItemsForDisplay: () => [],

    assetRequests: noopArray as AssetRequest[],
    addAssetRequest: () => warnNotPorted("asset requests"),
    approveRequest: () => warnNotPorted("asset requests"),
    rejectRequest: () => warnNotPorted("asset requests"),
    getEmployeeRequests: () => [],
    _subscribe: subscribe,
  };

  // Reference qc so eslint doesn't strip it; the create/update mutations
  // already invalidate via @/api hooks.
  void qc;

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useAssets() {
  const ctx = useContext(AssetContext);
  if (!ctx) throw new Error("useAssets must be used within AssetProvider");
  useLazyContextSubscribe(ctx._subscribe);
  return ctx;
}

// Re-export to keep barrel imports stable.
export { assetKeys };
