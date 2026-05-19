import { apiDelete, apiGet, apiPost } from "../client";
import { tokenStorage } from "../token-storage";
import type {
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  CreateInvitationRequest,
  Invitation,
} from "./invitations.types";

export const invitationsApi = {
  list(): Promise<Invitation[]> {
    return apiGet<Invitation[]>("/invitations");
  },

  create(body: CreateInvitationRequest): Promise<Invitation> {
    return apiPost<Invitation>("/invitations", body);
  },

  resend(id: string): Promise<Invitation> {
    return apiPost<Invitation>(`/invitations/${id}/resend`);
  },

  revoke(id: string): Promise<Invitation> {
    return apiDelete<Invitation>(`/invitations/${id}`);
  },

  /**
   * Public endpoint — creates the user and signs them in. Persists the issued
   * session tokens so the caller is immediately authenticated.
   */
  async accept(body: AcceptInvitationRequest): Promise<AcceptInvitationResponse> {
    const session = await apiPost<AcceptInvitationResponse>("/invitations/accept", body);
    tokenStorage.setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    if (session.user.primaryClientId) {
      tokenStorage.setActiveClientId(session.user.primaryClientId);
    }
    return session;
  },
};
