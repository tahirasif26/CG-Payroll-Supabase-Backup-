import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invitationsApi } from "./invitations.api";
import type {
  AcceptInvitationRequest,
  CreateInvitationRequest,
} from "./invitations.types";

export const invitationKeys = {
  all: ["invitations"] as const,
  list: () => [...invitationKeys.all, "list"] as const,
};

export function useInvitations() {
  return useQuery({
    queryKey: invitationKeys.list(),
    queryFn: () => invitationsApi.list(),
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvitationRequest) => invitationsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitationKeys.list() });
    },
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invitationsApi.resend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitationKeys.list() });
    },
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invitationsApi.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitationKeys.list() });
    },
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AcceptInvitationRequest) => invitationsApi.accept(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}
