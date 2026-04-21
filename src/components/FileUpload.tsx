import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, FileIcon, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFile, deleteFile, makeFilePath, fileExt, getSignedUrl } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  bucket: string;
  /** Folder prefix inside the bucket, e.g. "client-id/employee-id". */
  pathPrefix: string;
  /** Optional fixed filename (without extension); otherwise a timestamp is used. */
  fileName?: string;
  accept?: string;
  maxSizeMB?: number;
  /** Existing object path (relative to bucket) to render a preview/replace UI. */
  currentPath?: string;
  /** Existing public/signed URL if you already have one (skips re-fetch). */
  currentUrl?: string;
  /** True if the bucket is private and we should show signed-URL preview. */
  privateBucket?: boolean;
  label?: string;
  required?: boolean;
  className?: string;
  onUploaded: (path: string, publicUrl: string | null) => void;
  onRemoved?: () => void;
}

export function FileUpload({
  bucket,
  pathPrefix,
  fileName,
  accept = "image/*",
  maxSizeMB = 5,
  currentPath,
  currentUrl,
  privateBucket = false,
  label,
  required,
  className,
  onUploaded,
  onRemoved,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isImage = accept.includes("image");

  // If private bucket and we only have a path, lazily fetch signed URL once.
  if (privateBucket && currentPath && !previewUrl && !busy) {
    void getSignedUrl(bucket, currentPath).then((u) => u && setPreviewUrl(u));
  }

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({ title: "File too large", description: `Max ${maxSizeMB}MB.`, variant: "destructive" });
        return;
      }
      setBusy(true);
      const ext = fileExt(file);
      const baseName = fileName ?? `${Date.now()}`;
      const path = makeFilePath(pathPrefix, `${baseName}.${ext}`);
      const { url, error } = await uploadFile(bucket, path, file, { upsert: true });
      setBusy(false);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        return;
      }
      let displayUrl = url;
      if (!displayUrl && privateBucket) displayUrl = await getSignedUrl(bucket, path);
      setPreviewUrl(displayUrl);
      onUploaded(path, url);
      toast({ title: "Uploaded" });
    },
    [bucket, fileName, maxSizeMB, onUploaded, pathPrefix, privateBucket, toast]
  );

  const handleRemove = async () => {
    if (currentPath) {
      setBusy(true);
      await deleteFile(bucket, currentPath);
      setBusy(false);
    }
    setPreviewUrl(null);
    onRemoved?.();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}

      {previewUrl ? (
        <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
          {isImage ? (
            <img src={previewUrl} alt="Preview" loading="lazy" decoding="async" className="w-full h-36 object-cover" />
          ) : (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-4 text-sm hover:underline"
            >
              <FileIcon className="h-4 w-4" />
              View uploaded file
            </a>
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
            onClick={handleRemove}
            disabled={busy}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            busy && "opacity-60 pointer-events-none"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : isImage ? (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground/40" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {busy ? "Uploading…" : "Click to upload or drag & drop"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Max {maxSizeMB}MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void handleFile(f);
            }}
          />
        </div>
      )}
    </div>
  );
}
