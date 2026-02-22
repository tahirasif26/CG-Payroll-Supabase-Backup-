/**
 * Deterministic BLE UUID generator.
 * Produces a UUID-v4-like string from an employee ID using a simple hash.
 */
export function generateBLEUUID(employeeId: string): string {
  let h = 0;
  for (let i = 0; i < employeeId.length; i++) {
    h = (Math.imul(31, h) + employeeId.charCodeAt(i)) | 0;
  }
  // Use hash to seed a deterministic pseudo-random sequence
  const seed = (n: number) => {
    let s = h + n * 2654435761;
    s = Math.imul(s ^ (s >>> 16), 0x85ebca6b);
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35);
    return (s ^ (s >>> 16)) >>> 0;
  };

  const hex = (n: number, len: number) => (n >>> 0).toString(16).padStart(len, "0").slice(0, len);

  return [
    hex(seed(0), 8),
    hex(seed(1), 4),
    "4" + hex(seed(2), 3),
    ((seed(3) & 0x3f) | 0x80).toString(16).padStart(2, "0") + hex(seed(4), 2),
    hex(seed(5), 8) + hex(seed(6), 4),
  ].join("-");
}
