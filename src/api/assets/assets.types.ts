import type { PaginationQuery } from "../types";

export type AssetStatus = "in_stock" | "assigned" | "in_repair" | "retired" | "lost";

export interface AssetHistoryEntry {
  id: string;
  assetId: string;
  clientId: string;
  action: string;
  fromEmployeeId: string | null;
  toEmployeeId: string | null;
  date: string;
  note: string | null;
  performedById: string | null;
}

export interface Asset {
  id: string;
  clientId: string;
  assetTag: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  condition: string | null;
  location: string | null;
  assignedToId: string | null;
  assignedDate: string | null;
  status: AssetStatus;
  purchaseDate: string | null;
  purchaseCost: string | null;
  warrantyExpiry: string | null;
  serviceDueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; firstName: string; lastName: string; empId: string } | null;
  history?: AssetHistoryEntry[];
}

export interface ListAssetsQuery extends PaginationQuery {
  status?: AssetStatus;
  category?: string;
  assignedToId?: string;
}

export interface CreateAssetRequest {
  assetTag: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  condition?: string | null;
  location?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: string | number;
  warrantyExpiry?: string | null;
  serviceDueDate?: string | null;
  notes?: string | null;
}

export type UpdateAssetRequest = Partial<Omit<CreateAssetRequest, "assetTag">>;

export interface AssignAssetRequest {
  assignedToId: string;
  assignedDate?: string | null;
  note?: string;
}

export interface UnassignAssetRequest {
  status?: "in_stock" | "in_repair" | "retired" | "lost";
  note?: string;
}
