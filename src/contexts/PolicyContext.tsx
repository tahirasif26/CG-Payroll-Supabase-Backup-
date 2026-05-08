import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

export type PolicyCategory = "hr" | "finance" | "it" | "health-safety" | "general";

export interface PolicyVersion {
  version: number;
  fileName: string;
  fileUrl: string;
  uploadedDate: string;
  notes?: string;
}

export interface PolicyDocument {
  id: string;
  title: string;
  description: string;
  category: PolicyCategory;
  fileName: string;
  fileUrl: string;
  version: number;
  versions: PolicyVersion[];
  effectiveDate: string;
  expiryDate?: string;
  requiresAck: boolean;
  acknowledgments: string[];
  status: "active" | "archived";
  createdDate: string;
  updatedDate: string;
}

interface PolicyContextType {
  policies: PolicyDocument[];
  isLoading: boolean;
  addPolicy: (policy: Omit<PolicyDocument, "id" | "createdDate" | "updatedDate" | "versions" | "acknowledgments">) => void;
  updatePolicy: (id: string, updates: Partial<PolicyDocument>) => void;
  deletePolicy: (id: string) => void;
  acknowledgePolicy: (policyId: string, employeeId: string) => void;
}

const PolicyContext = createContext<PolicyContextType | undefined>(undefined);

function mapRowToPolicy(row: any): PolicyDocument {
  const rawVersions = Array.isArray(row.versions) ? row.versions : [];
  const versions: PolicyVersion[] = rawVersions.map((v: any) => ({
    version: typeof v.version === "number" ? v.version : 1,
    fileName: v.fileName ?? v.file_name ?? "",
    fileUrl: v.fileUrl ?? v.file_url ?? "#",
    uploadedDate: v.uploadedDate ?? v.uploaded_date ?? row.created_at?.split("T")[0] ?? "",
    notes: v.notes,
  }));

  return {
    id: row.id,
    title: row.title ?? "",
    description: row.description ?? "",
    category: (row.category as PolicyCategory) ?? "general",
    fileName: row.file_name ?? "",
    fileUrl: row.file_url ?? "#",
    version: row.version ?? 1,
    versions,
    effectiveDate: row.effective_date ?? row.created_at?.split("T")[0] ?? "",
    expiryDate: row.expiry_date ?? undefined,
    requiresAck: row.requires_ack ?? false,
    acknowledgments: [],
    status: row.status === "archived" ? "archived" : "active",
    createdDate: row.created_at ? row.created_at.split("T")[0] : "",
    updatedDate: row.updated_at ? row.updated_at.split("T")[0] : "",
  };
}

function buildInsertPayload(
  policy: Omit<PolicyDocument, "id" | "createdDate" | "updatedDate" | "versions" | "acknowledgments">,
  clientId: string
) {
  const today = new Date().toISOString().split("T")[0];
  return {
    client_id: clientId,
    title: policy.title,
    description: policy.description,
    category: policy.category,
    file_name: policy.fileName,
    file_url: policy.fileUrl,
    version: policy.version ?? 1,
    versions: [
      {
        version: policy.version ?? 1,
        fileName: policy.fileName,
        fileUrl: policy.fileUrl,
        uploadedDate: today,
      },
    ],
    effective_date: policy.effectiveDate ?? today,
    expiry_date: policy.expiryDate ?? null,
    requires_ack: policy.requiresAck ?? false,
    status: policy.status ?? "active",
  };
}

function buildUpdatePayload(patch: Partial<PolicyDocument>) {
  const dbPatch: Record<string, any> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.fileName !== undefined) dbPatch.file_name = patch.fileName;
  if (patch.fileUrl !== undefined) dbPatch.file_url = patch.fileUrl;
  if (patch.version !== undefined) dbPatch.version = patch.version;
  if (patch.effectiveDate !== undefined) dbPatch.effective_date = patch.effectiveDate;
  if (patch.expiryDate !== undefined) dbPatch.expiry_date = patch.expiryDate;
  if (patch.requiresAck !== undefined) dbPatch.requires_ack = patch.requiresAck;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.versions !== undefined) dbPatch.versions = patch.versions;
  return dbPatch;
}

export function PolicyProvider({ children }: { children: ReactNode }) {
  const { clientId } = useRole();
  const qc = useQueryClient();
  const KEY = ["company_policies", clientId];

  const { data: rawPolicies = [], isLoading } = useQuery({
    queryKey: KEY,
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_policies")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const policies: PolicyDocument[] = rawPolicies.map(mapRowToPolicy);

  const addMutation = useMutation({
    mutationFn: async (policy: Omit<PolicyDocument, "id" | "createdDate" | "updatedDate" | "versions" | "acknowledgments">) => {
      if (!clientId) throw new Error("No client context");
      const payload = buildInsertPayload(policy, clientId);
      const { error } = await supabase.from("company_policies").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PolicyDocument> }) => {
      const dbPatch = buildUpdatePayload(patch);
      if (Object.keys(dbPatch).length === 0) return;
      const { error } = await supabase.from("company_policies").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const addPolicy = (policy: Omit<PolicyDocument, "id" | "createdDate" | "updatedDate" | "versions" | "acknowledgments">) => {
    addMutation.mutate(policy);
  };

  const updatePolicy = (id: string, updates: Partial<PolicyDocument>) => {
    updateMutation.mutate({ id, patch: updates });
  };

  const deletePolicy = (id: string) => {
    deleteMutation.mutate(id);
  };

  const acknowledgePolicy = (_policyId: string, _employeeId: string) => {
    // Acknowledgements are managed via the separate policy_acknowledgements table
    // and usePolicyAcknowledgements / useAcknowledgePolicy hooks.
  };

  return (
    <PolicyContext.Provider value={{ policies, isLoading, addPolicy, updatePolicy, deletePolicy, acknowledgePolicy }}>
      {children}
    </PolicyContext.Provider>
  );
}

export function usePolicy() {
  const context = useContext(PolicyContext);
  if (!context) throw new Error("usePolicy must be used within a PolicyProvider");
  return context;
}
