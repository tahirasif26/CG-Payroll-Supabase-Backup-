import { calculateKsaEosb } from "./ksa";
import { calculateUaeEosb } from "./uae";
import type { EosbInput, EosbResult } from "./types";

export type SupportedEosbCountry = "SA" | "AE";

export function calculateEosb(country: SupportedEosbCountry, input: EosbInput): EosbResult {
  switch (country) {
    case "SA":
      return calculateKsaEosb(input);
    case "AE":
      return calculateUaeEosb(input);
    default: {
      const _exhaustive: never = country;
      throw new Error(`Unsupported EOSB country: ${_exhaustive}`);
    }
  }
}

export { calculateKsaEosb, calculateUaeEosb };
export type { EosbInput, EosbResult } from "./types";
