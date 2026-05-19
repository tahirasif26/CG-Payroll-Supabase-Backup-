import type { PaginationQuery } from "../types";

export type ApprovalModule = "leave" | "expense" | "advance" | "loan" | "asset" | "payroll";
export type ApprovalType = "any_one" | "all_must" | "majority";
export type ApprovalMode = "sequential" | "parallel";
export type RequestApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
export type AssignmentStatus = "pending" | "acted" | "skipped";
export type ApprovalHistoryAction =
  | "approve"
  | "reject"
  | "comment"
  | "delegate"
  | "cancel"
  | "system_advance";

export interface ApprovalGroup {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  approvalType: ApprovalType;
  maxLimitMinor: string | null;
  escalateAfterDays: number | null;
  escalateToGroupId: string | null;
  isActive: boolean;
  members?: { employeeId: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalPolicyLevel {
  id: string;
  policyId: string;
  levelOrder: number;
  groupId: string;
  mode: ApprovalMode;
  slaHours: number | null;
}

export interface ApprovalPolicy {
  id: string;
  clientId: string;
  module: ApprovalModule;
  category: string | null;
  minValueMinor: string;
  maxValueMinor: string | null;
  groupId: string | null;
  sortOrder: number;
  isActive: boolean;
  levels: ApprovalPolicyLevel[];
  group?: ApprovalGroup | null;
}

export interface ApprovalDelegation {
  id: string;
  clientId: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  fallbackEmployeeId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface RequestApproval {
  id: string;
  clientId: string;
  module: ApprovalModule;
  entityId: string;
  policyId: string | null;
  requesterEmployeeId: string;
  valueMinor: string;
  valueUnit: string;
  currentLevel: number;
  currentGroupId: string | null;
  status: RequestApprovalStatus;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: { firstName: string; lastName: string; empId: string };
  currentGroup?: { id: string; name: string };
  history?: RequestApprovalHistoryEntry[];
  assignments?: RequestAssignment[];
  policy?: ApprovalPolicy;
}

export interface RequestApprovalHistoryEntry {
  id: string;
  requestApprovalId: string;
  levelOrder: number;
  action: ApprovalHistoryAction;
  actorUserId: string | null;
  actorEmployeeId: string | null;
  onBehalfOfEmployeeId: string | null;
  groupId: string | null;
  comment: string | null;
  createdAt: string;
}

export interface RequestAssignment {
  id: string;
  requestApprovalId: string;
  levelOrder: number;
  groupId: string;
  employeeId: string;
  viaDelegation: boolean;
  status: AssignmentStatus;
  actedAt: string | null;
}

// ─── Request shapes ──────────────────────────────────────────────────────────

export interface CreateGroupRequest {
  name: string;
  description?: string | null;
  approvalType?: ApprovalType;
  maxLimitMinor?: string | number | null;
  escalateAfterDays?: number | null;
  escalateToGroupId?: string | null;
  memberEmployeeIds?: string[];
}
export type UpdateGroupRequest = Partial<CreateGroupRequest>;

export interface PolicyLevelInput {
  levelOrder: number;
  groupId: string;
  mode?: ApprovalMode;
  slaHours?: number | null;
}

export interface CreatePolicyRequest {
  module: ApprovalModule;
  category?: string | null;
  minValueMinor?: string | number;
  maxValueMinor?: string | number | null;
  groupId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  levels?: PolicyLevelInput[];
}
export type UpdatePolicyRequest = Partial<CreatePolicyRequest>;

export interface CreateDelegationRequest {
  fromEmployeeId: string;
  toEmployeeId: string;
  startDate: string;
  endDate: string;
  fallbackEmployeeId?: string | null;
  reason?: string | null;
}

export interface ListRequestApprovalsQuery extends PaginationQuery {
  module?: ApprovalModule;
  status?: RequestApprovalStatus;
  scope?: "mine" | "pending" | "all";
}

export interface DecideRequestRequest {
  decision: "approve" | "reject";
  comment?: string;
}
