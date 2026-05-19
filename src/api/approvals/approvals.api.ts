import { apiClient, apiGet, apiGetWithMeta, apiPatch, apiPost } from "../client";
import { ApiClientError } from "../errors";
import type { ApiResponse } from "../types";
import type {
  ApprovalDelegation,
  ApprovalGroup,
  ApprovalModule,
  ApprovalPolicy,
  CreateDelegationRequest,
  CreateGroupRequest,
  CreatePolicyRequest,
  DecideRequestRequest,
  ListRequestApprovalsQuery,
  RequestApproval,
  UpdateGroupRequest,
  UpdatePolicyRequest,
} from "./approvals.types";

async function _delete<T>(url: string): Promise<T> {
  const res = await apiClient.delete<ApiResponse<T>>(url);
  if (!res.data?.success) {
    throw new ApiClientError(res.status, res.data?.error ?? {
      code: "UNEXPECTED_RESPONSE",
      message: "Delete did not return data",
    });
  }
  return res.data.data as T;
}

export const approvalsApi = {
  // groups
  listGroups: (): Promise<ApprovalGroup[]> => apiGet("/approval-groups"),
  createGroup: (b: CreateGroupRequest): Promise<ApprovalGroup> =>
    apiPost("/approval-groups", b),
  updateGroup: (id: string, b: UpdateGroupRequest): Promise<ApprovalGroup> =>
    apiPatch(`/approval-groups/${id}`, b),
  deleteGroup: (id: string): Promise<ApprovalGroup> => _delete(`/approval-groups/${id}`),

  // policies
  listPolicies: (module?: ApprovalModule): Promise<ApprovalPolicy[]> =>
    apiGet("/approval-policies", module ? { module } : undefined),
  createPolicy: (b: CreatePolicyRequest): Promise<ApprovalPolicy> =>
    apiPost("/approval-policies", b),
  updatePolicy: (id: string, b: UpdatePolicyRequest): Promise<ApprovalPolicy> =>
    apiPatch(`/approval-policies/${id}`, b),

  // delegations
  listDelegations: (): Promise<ApprovalDelegation[]> => apiGet("/approval-delegations"),
  createDelegation: (b: CreateDelegationRequest): Promise<ApprovalDelegation> =>
    apiPost("/approval-delegations", b),
  revokeDelegation: (id: string): Promise<ApprovalDelegation> =>
    _delete(`/approval-delegations/${id}`),

  // requests
  listRequests: (
    query: ListRequestApprovalsQuery = {},
  ): Promise<ApiResponse<RequestApproval[]>> =>
    apiGetWithMeta<RequestApproval[]>("/approval-requests", query as Record<string, unknown>),
  findRequest: (id: string): Promise<RequestApproval> =>
    apiGet<RequestApproval>(`/approval-requests/${id}`),
  decide: (id: string, b: DecideRequestRequest): Promise<RequestApproval> =>
    apiPost<RequestApproval>(`/approval-requests/${id}/decision`, b),
};
