export type AssetCondition = "new" | "good" | "fair" | "needs-repair" | "damaged" | "retired";

export type AssetStatus = "available" | "assigned" | "maintenance" | "retired";

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  type: "repair" | "service" | "inspection" | "upgrade" | "replacement";
  date: string;
  notes: string;
  nextServiceDate?: string;
  performedBy: string;
}

export interface AssetAudit {
  id: string;
  name: string;
  scope: "all" | "department" | "location" | "employee";
  scopeValue?: string;
  startDate: string;
  endDate?: string;
  status: "in-progress" | "completed";
  totalAssets: number;
  verified: number;
  missing: number;
  damaged: number;
  entries: AssetAuditEntry[];
}

export interface AssetAuditEntry {
  id: string;
  auditId: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  verification: "verified" | "missing" | "damaged" | "pending";
  verifiedBy?: string;
  verifiedDate?: string;
  notes?: string;
}

export interface AssetLogEntry {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  activity: string;
  employeeName?: string;
  performedBy: string;
  date: string;
  details: string;
}
