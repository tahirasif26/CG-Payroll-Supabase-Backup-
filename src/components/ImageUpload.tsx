import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, ImageIcon, Link } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export function ImageUpload({ value, onChange, label = "Image", required = false, className }: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">(value && value.startsWith("http") ? "url" : "upload");
  const [urlInput, setUrlInput] = useState(value && value.startsWith("http") ? value : "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB limit
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleUrlApply = () => {
    if (urlInput.trim()) onChange(urlInput.trim());
  };

  const clearImage = () => {
    onChange("");
    setUrlInput("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
          <div className="flex items-center rounded-md border border-input bg-background p-0.5">
            <Button
              type="button"
              variant={mode === "upload" ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setMode("upload")}
            >
              <Upload className="h-3 w-3 mr-1" />Upload
            </Button>
            <Button
              type="button"
              variant={mode === "url" ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setMode("url")}
            >
              <Link className="h-3 w-3 mr-1" />URL
            </Button>
          </div>
        </div>
      )}

      {value ? (
        <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
          <img
            src={value}
            alt="Preview"
            loading="lazy"
            decoding="async"
            className="w-full h-36 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
            onClick={clearImage}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : mode === "upload" ? (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Click to upload or drag & drop</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG, WEBP up to 5MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1"
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleUrlApply())}
          />
          <Button type="button" size="sm" variant="outline" onClick={handleUrlApply} disabled={!urlInput.trim()}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
