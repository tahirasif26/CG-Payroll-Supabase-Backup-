/**
 * Frontend storage helper. Stubbed during NestJS migration — real uploads
 * will route through the NestJS Storage module in a follow-up.
 */

export type StorageBucket = "avatars" | "documents" | "receipts" | "payslips" | "employee-documents";

export function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function makeFilePath(parts: Array<string | undefined | null>, fileName: string): string {
  const safe = parts.filter(Boolean).map((p) => String(p).replace(/[^a-zA-Z0-9._-]/g, "_"));
  return `${safe.join("/")}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

export async function uploadFile(
  _bucket: StorageBucket,
  _path: string,
  _file: File | Blob,
): Promise<{ url: string }> {
  console.warn("[lib/storage] uploadFile not yet wired to NestJS storage endpoint.");
  return { url: "" };
}

export async function deleteFile(_bucket: StorageBucket, _path: string): Promise<void> {
  console.warn("[lib/storage] deleteFile not yet wired to NestJS storage endpoint.");
}

export async function getSignedUrl(_bucket: StorageBucket, _path: string): Promise<string> {
  console.warn("[lib/storage] getSignedUrl not yet wired.");
  return "";
}

export async function removeFile(bucket: StorageBucket, path: string): Promise<void> {
  return deleteFile(bucket, path);
}
