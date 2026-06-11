import { useCallback, useEffect, useState } from "react";

/**
 * One-shot "wake up the provider" flag. The provider's underlying `useQuery`
 * gates itself on `enabled`, which starts `false`. The very first consumer
 * hook that mounts flips `enabled` to `true` for the rest of the provider's
 * lifetime; it never flips back. This matches "fetch on first navigation,
 * keep the cache around until the user signs out" — and crucially avoids the
 * counter-based race where React 18 strict-mode's simulated unmount/remount
 * cycle can transiently drop the count back to zero.
 *
 * **Usage in a provider:**
 * ```ts
 * const { enabled, enable } = useEnableOnDemand();
 * const list = useApi({ enabled });
 * const value = { ...data, _enable: enable };
 * ```
 *
 * **Usage in the consumer hook (called by pages):**
 * ```ts
 * export function useMyData() {
 *   const ctx = useContext(MyContext);
 *   useEnableOnDemand_Subscribe(ctx._enable);
 *   return ctx;
 * }
 * ```
 *
 * Trade-off vs. a subscriber counter: the query stays enabled even after
 * every consumer page has unmounted. That's intentional — the cached data is
 * cheap to keep around, and React Query's own `gcTime` evicts it eventually.
 */
export function useEnableOnDemand() {
  const [enabled, setEnabled] = useState(false);
  const enable = useCallback(() => setEnabled((on) => on || true), []);
  return { enabled, enable };
}

/** Companion hook for the consumer side — flips the provider's enable flag on first render. */
export function useEnableOnDemand_Subscribe(enable: () => void) {
  useEffect(() => {
    enable();
  }, [enable]);
}

// ─── Back-compat aliases ─────────────────────────────────────────────────────
// The earlier counter-based API exposed `useConsumerCounter` + `useLazyContextSubscribe`.
// Several providers + consumer hooks still import those names. Map them to the
// new one-shot enable flag so all five context providers behave identically.

/** @deprecated use `useEnableOnDemand` */
export function useConsumerCounter() {
  const { enabled, enable } = useEnableOnDemand();
  return { enabled, subscribe: enable as unknown as () => () => void };
}

/** @deprecated use `useEnableOnDemand_Subscribe` */
export function useLazyContextSubscribe(subscribe: () => () => void) {
  useEffect(() => {
    // The new contract is "fire-and-forget" — call once on mount, no cleanup.
    // Old call sites passed a returned-unsubscribe function; we ignore it.
    (subscribe as unknown as () => void)();
  }, [subscribe]);
}
