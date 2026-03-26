import React, { createContext, useContext, useState, ReactNode } from "react";

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
  addPolicy: (policy: Omit<PolicyDocument, "id" | "createdDate" | "updatedDate" | "versions" | "acknowledgments">) => void;
  updatePolicy: (id: string, updates: Partial<PolicyDocument>) => void;
  deletePolicy: (id: string) => void;
  acknowledgePolicy: (policyId: string, employeeId: string) => void;
}

const PolicyContext = createContext<PolicyContextType | undefined>(undefined);

const mockPolicies: PolicyDocument[] = [
  {
    id: "pol-1",
    title: "Annual Leave Policy",
    description: "Guidelines for requesting and managing annual leave entitlements for all employees.",
    category: "hr",
    fileName: "annual-leave-policy-v2.pdf",
    fileUrl: "#",
    version: 2,
    versions: [
      { version: 1, fileName: "annual-leave-policy-v1.pdf", fileUrl: "#", uploadedDate: "2023-06-01" },
      { version: 2, fileName: "annual-leave-policy-v2.pdf", fileUrl: "#", uploadedDate: "2024-01-15", notes: "Updated leave accrual rates" },
    ],
    effectiveDate: "2024-01-15",
    requiresAck: true,
    acknowledgments: ["emp-1", "emp-2", "emp-3"],
    status: "active",
    createdDate: "2023-06-01",
    updatedDate: "2024-01-15",
  },
  {
    id: "pol-2",
    title: "IT Security & Acceptable Use Policy",
    description: "Rules and guidelines for the use of company IT resources, data protection, and cybersecurity best practices.",
    category: "it",
    fileName: "it-security-policy.pdf",
    fileUrl: "#",
    version: 1,
    versions: [
      { version: 1, fileName: "it-security-policy.pdf", fileUrl: "#", uploadedDate: "2024-03-01" },
    ],
    effectiveDate: "2024-03-01",
    requiresAck: true,
    acknowledgments: ["emp-1"],
    status: "active",
    createdDate: "2024-03-01",
    updatedDate: "2024-03-01",
  },
  {
    id: "pol-3",
    title: "Expense Reimbursement Policy",
    description: "Procedures for submitting and approving business expense claims and reimbursements.",
    category: "finance",
    fileName: "expense-reimbursement-policy.pdf",
    fileUrl: "#",
    version: 1,
    versions: [
      { version: 1, fileName: "expense-reimbursement-policy.pdf", fileUrl: "#", uploadedDate: "2024-02-01" },
    ],
    effectiveDate: "2024-02-01",
    requiresAck: false,
    acknowledgments: [],
    status: "active",
    createdDate: "2024-02-01",
    updatedDate: "2024-02-01",
  },
  {
    id: "pol-4",
    title: "Workplace Health & Safety Policy",
    description: "Company's commitment to maintaining a safe and healthy work environment for all personnel.",
    category: "health-safety",
    fileName: "health-safety-policy.pdf",
    fileUrl: "#",
    version: 1,
    versions: [
      { version: 1, fileName: "health-safety-policy.pdf", fileUrl: "#", uploadedDate: "2024-01-01" },
    ],
    effectiveDate: "2024-01-01",
    requiresAck: true,
    acknowledgments: ["emp-1", "emp-2"],
    status: "active",
    createdDate: "2024-01-01",
    updatedDate: "2024-01-01",
  },
  {
    id: "pol-5",
    title: "Code of Conduct",
    description: "Standards of professional behavior and ethical conduct expected from all employees.",
    category: "general",
    fileName: "code-of-conduct.pdf",
    fileUrl: "#",
    version: 3,
    versions: [
      { version: 1, fileName: "code-of-conduct-v1.pdf", fileUrl: "#", uploadedDate: "2022-01-01" },
      { version: 2, fileName: "code-of-conduct-v2.pdf", fileUrl: "#", uploadedDate: "2023-01-01" },
      { version: 3, fileName: "code-of-conduct-v3.pdf", fileUrl: "#", uploadedDate: "2024-06-01", notes: "Added remote work guidelines" },
    ],
    effectiveDate: "2024-06-01",
    requiresAck: true,
    acknowledgments: ["emp-1", "emp-2", "emp-3", "emp-4"],
    status: "active",
    createdDate: "2022-01-01",
    updatedDate: "2024-06-01",
  },
];

export function PolicyProvider({ children }: { children: ReactNode }) {
  const [policies, setPolicies] = useState<PolicyDocument[]>(mockPolicies);

  const addPolicy = (policy: Omit<PolicyDocument, "id" | "createdDate" | "updatedDate" | "versions" | "acknowledgments">) => {
    const now = new Date().toISOString().split("T")[0];
    const newPolicy: PolicyDocument = {
      ...policy,
      id: `pol-${Date.now()}`,
      versions: [{ version: policy.version, fileName: policy.fileName, fileUrl: policy.fileUrl, uploadedDate: now }],
      acknowledgments: [],
      createdDate: now,
      updatedDate: now,
    };
    setPolicies((prev) => [...prev, newPolicy]);
  };

  const updatePolicy = (id: string, updates: Partial<PolicyDocument>) => {
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...updates, updatedDate: new Date().toISOString().split("T")[0] } : p
      )
    );
  };

  const deletePolicy = (id: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  };

  const acknowledgePolicy = (policyId: string, employeeId: string) => {
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === policyId && !p.acknowledgments.includes(employeeId)
          ? { ...p, acknowledgments: [...p.acknowledgments, employeeId] }
          : p
      )
    );
  };

  return (
    <PolicyContext.Provider value={{ policies, addPolicy, updatePolicy, deletePolicy, acknowledgePolicy }}>
      {children}
    </PolicyContext.Provider>
  );
}

export function usePolicy() {
  const context = useContext(PolicyContext);
  if (!context) throw new Error("usePolicy must be used within a PolicyProvider");
  return context;
}
