import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approvalsApi } from "./approvals.api";
import { tokenStorage } from "../token-storage";
import type {
  ApprovalModule,
  CreateDelegationRequest,
  CreateGroupRequest,
  CreatePolicyRequest,
  DecideRequestRequest,
  ListRequestApprovalsQuery,
  UpdateGroupRequest,
  UpdatePolicyRequest,
} from "./approvals.types";

const enabled = () => !!tokenStorage.getAccessToken();

export const approvalKeys = {
  all: ["approvals"] as const,
  groups: () => [...approvalKeys.all, "groups"] as const,
  policies: (m?: ApprovalModule) => [...approvalKeys.all, "policies", m ?? "all"] as const,
  delegations: () => [...approvalKeys.all, "delegations"] as const,
  requests: (q: ListRequestApprovalsQuery) => [...approvalKeys.all, "requests", q] as const,
  request: (id: string) => [...approvalKeys.all, "request", id] as const,
};

// ─── Groups ──────────────────────────────────────────────────────────────────

export function useApprovalGroups() {
  return useQuery({
    queryKey: approvalKeys.groups(),
    queryFn: () => approvalsApi.listGroups(),
    enabled: enabled(),
  });
}
export function useCreateApprovalGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateGroupRequest) => approvalsApi.createGroup(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.groups() }),
  });
}
export function useUpdateApprovalGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGroupRequest }) =>
      approvalsApi.updateGroup(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.groups() }),
  });
}
export function useDeleteApprovalGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvalsApi.deleteGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.groups() }),
  });
}

// ─── Policies ────────────────────────────────────────────────────────────────

export function useApprovalPolicies(module?: ApprovalModule) {
  return useQuery({
    queryKey: approvalKeys.policies(module),
    queryFn: () => approvalsApi.listPolicies(module),
    enabled: enabled(),
  });
}
export function useCreateApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreatePolicyRequest) => approvalsApi.createPolicy(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...approvalKeys.all, "policies"] }),
  });
}
export function useUpdateApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePolicyRequest }) =>
      approvalsApi.updatePolicy(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...approvalKeys.all, "policies"] }),
  });
}

// ─── Delegations ─────────────────────────────────────────────────────────────

export function useApprovalDelegations() {
  return useQuery({
    queryKey: approvalKeys.delegations(),
    queryFn: () => approvalsApi.listDelegations(),
    enabled: enabled(),
  });
}
export function useCreateApprovalDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateDelegationRequest) => approvalsApi.createDelegation(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.delegations() }),
  });
}
export function useRevokeApprovalDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvalsApi.revokeDelegation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.delegations() }),
  });
}

// ─── Requests ────────────────────────────────────────────────────────────────

export function useApprovalRequests(query: ListRequestApprovalsQuery = {}) {
  return useQuery({
    queryKey: approvalKeys.requests(query),
    queryFn: () => approvalsApi.listRequests(query),
    enabled: enabled(),
  });
}
export function useApprovalRequest(id: string | null | undefined) {
  return useQuery({
    queryKey: approvalKeys.request(id ?? ""),
    queryFn: () => approvalsApi.findRequest(id!),
    enabled: !!id && enabled(),
  });
}
export function useDecideApprovalRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DecideRequestRequest }) =>
      approvalsApi.decide(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}
