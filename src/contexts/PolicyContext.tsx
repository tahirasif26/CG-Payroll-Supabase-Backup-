import { createContext, useContext, ReactNode, useState } from "react";

/**
 * Stubbed during NestJS migration. The `company_policies` + `policy_acknowledgements`
 * tables are not yet modeled in Prisma. Restore by:
 *   1. Adding `Policy` + `PolicyAcknowledgement` to `api/prisma/schema.prisma`
 *   2. Building a `PoliciesModule` + FE `@/api/policies` service layer
 *   3. Replacing the in-memory state below with the new hooks
 *
 * For now policies render empty on CompanyPoliciesPage; mutations stay
 * client-local within a session so the upload wizard still works for demos.
 */

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
  addPolicy: (
    policy: Omit<PolicyDocument, "id" | "createdDate" | "updatedDate" | "versions" | "acknowledgments">,
  ) => void;
  updatePolicy: (id: string, updates: Partial<PolicyDocument>) => void;
  deletePolicy: (id: string) => void;
  acknowledgePolicy: (policyId: string, employeeId: string) => void;
}

const PolicyContext = createContext<PolicyContextType | undefined>(undefined);

export function PolicyProvider({ children }: { children: ReactNode }) {
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);

  const value: PolicyContextType = {
    policies,
    isLoading: false,
    addPolicy: (p) =>
      setPolicies((prev) => [
        ...prev,
        {
          ...p,
          id: `local-${Date.now()}`,
          versions: [
            {
              version: p.version,
              fileName: p.fileName,
              fileUrl: p.fileUrl,
              uploadedDate: new Date().toISOString().slice(0, 10),
            },
          ],
          acknowledgments: [],
          createdDate: new Date().toISOString().slice(0, 10),
          updatedDate: new Date().toISOString().slice(0, 10),
        },
      ]),
    updatePolicy: (id, updates) =>
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, ...updates, updatedDate: new Date().toISOString().slice(0, 10) }
            : p,
        ),
      ),
    deletePolicy: (id) => setPolicies((prev) => prev.filter((p) => p.id !== id)),
    acknowledgePolicy: (policyId, employeeId) =>
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policyId && !p.acknowledgments.includes(employeeId)
            ? { ...p, acknowledgments: [...p.acknowledgments, employeeId] }
            : p,
        ),
      ),
  };

  return <PolicyContext.Provider value={value}>{children}</PolicyContext.Provider>;
}

export function usePolicy() {
  const ctx = useContext(PolicyContext);
  if (!ctx) throw new Error("usePolicy must be used within PolicyProvider");
  return ctx;
}
