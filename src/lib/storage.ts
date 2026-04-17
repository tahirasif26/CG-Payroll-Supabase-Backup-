import { supabase } from "@/integrations/supabase/client";

/** Public buckets: getPublicUrl works directly. */
const PUBLIC_BUCKETS = new Set(["avatars", "client-logos"]);

export interface UploadResult {
  /** Storage object path (relative to bucket). Save this to DB. */
  path: string;
  /** Public URL (only meaningful for public buckets). For private, use getSignedUrl. */
  url: string | null;
  error: Error | null;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean; contentType?: string }
): Promise<UploadResult> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: options?.upsert ?? true,
    contentType: options?.contentType ?? (file instanceof File ? file.type : undefined),
    cacheControl: "3600",
  });
  if (error) return { path, url: null, error };

  if (PUBLIC_BUCKETS.has(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { path, url: data.publicUrl, error: null };
  }
  return { path, url: null, error: null };
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return error ? null : data.signedUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return !error;
}

/** Build a path: parts joined by "/", filtering empties. */
export function makeFilePath(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join("/");
}

/** Best-effort extension from a File or filename. */
export function fileExt(file: File | string): string {
  const name = typeof file === "string" ? file : file.name;
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "bin";
}
