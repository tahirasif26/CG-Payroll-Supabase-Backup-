import type { SupportedEosbCountry } from "./index";

/** Map a free-text work-location country (or ISO code) to a supported EOSB country. */
export function mapToEosbCountry(country?: string | null): SupportedEosbCountry | null {
  if (!country) return null;
  const c = country.trim().toLowerCase();
  if (["sa", "ksa", "saudi arabia", "kingdom of saudi arabia"].includes(c)) return "SA";
  if (["ae", "uae", "united arab emirates", "emirates"].includes(c)) return "AE";
  return null;
}
