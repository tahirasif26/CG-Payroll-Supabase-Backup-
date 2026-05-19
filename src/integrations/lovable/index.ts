/**
 * Phase 2.1 cutover: Lovable OAuth wrapper retired. The original implementation
 * wrapped `@lovable.dev/cloud-auth-js` and bridged its tokens into the Supabase
 * Auth session via `supabase.auth.setSession`. Both are gone now.
 *
 * OAuth (Google / Apple / Microsoft) returns when the NestJS Passport
 * strategies are wired up — see the Phase 1b TODO. Until then this stub
 * surfaces a clear error if any leftover caller invokes it.
 */

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type SignInResult = {
  error?: Error;
  redirected?: boolean;
  tokens?: never;
};

const notImplemented = (): SignInResult => {
  // eslint-disable-next-line no-console
  console.warn(
    "[lovable] OAuth sign-in not implemented in the NestJS migration yet. " +
      "Track via Phase 1b. Use email + password via `useLogin` from @/api in the meantime.",
  );
  return {
    error: new Error(
      "OAuth not implemented — sign in with email + password instead.",
    ),
  };
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      _provider: "google" | "apple" | "microsoft",
      _opts?: SignInOptions,
    ): Promise<SignInResult> => notImplemented(),
  },
};
