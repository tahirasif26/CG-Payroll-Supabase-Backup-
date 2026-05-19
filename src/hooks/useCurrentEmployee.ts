/** Shim — current user's Employee record. */
import { useMyEmployee } from "@/api";

export function useCurrentEmployee() {
  return useMyEmployee();
}
