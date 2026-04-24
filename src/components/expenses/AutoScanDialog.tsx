import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Upload, ScanLine, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Employee } from "@/types/hcm";
import { availableCurrencies } from "@/data/settingsData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Confidence = "high" | "medium" | "low";

interface ExtractedField<T> {
  value: T;
  confidence: Confidence;
}

interface ExtractionResult {
  amount: ExtractedField<string>;
  currency: ExtractedField<string>;
  date: ExtractedField<Date | undefined>;
  category: ExtractedField<string>;
  description: ExtractedField<string>;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is data:<mime>;base64,<data>
      const [meta, base64] = result.split(",");
      const mimeType = meta.match(/data:(.*?);base64/)?.[1] ?? file.type;
      resolve({ base64, mimeType });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function extractWithAI(file: File): Promise<ExtractionResult> {
  const { base64, mimeType } = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke("scan-receipt", {
    body: { imageBase64: base64, mimeType },
  });
  if (error) throw new Error(error.message ?? "Scan failed");
  if (!data?.success) throw new Error(data?.error ?? "Scan failed");

  const r = data.data;
  // Parse date string YYYY-MM-DD safely
  let parsedDate: Date | undefined;
  if (r.date?.value) {
    const d = new Date(r.date.value);
    if (!isNaN(d.getTime())) parsedDate = d;
  }
  return {
    amount: { value: String(r.amount?.value ?? ""), confidence: r.amount?.confidence ?? "low" },
    currency: { value: String(r.currency?.value ?? ""), confidence: r.currency?.confidence ?? "low" },
    date: { value: parsedDate, confidence: r.date?.confidence ?? "low" },
    category: { value: String(r.category?.value ?? ""), confidence: r.category?.confidence ?? "low" },
    description: { value: String(r.description?.value ?? ""), confidence: r.description?.confidence ?? "low" },
  };
}

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  high: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  low: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

const CATEGORIES = ["Travel", "Client Entertainment", "Training", "Equipment", "Other"];

interface AutoScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onSubmit: (data: {
    employeeId: string;
    category: string;
    amount: string;
    currency: string;
    date: Date;
    description: string;
  }) => void;
}

type Step = "upload" | "processing" | "review";

export function AutoScanDialog({ open, onOpenChange, employees, onSubmit }: AutoScanDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Review form state
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [confidences, setConfidences] = useState<Record<string, Confidence>>({});

  const activeEmployees = employees.filter(e => e.status === "active");

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setDragOver(false);
    setEmployeeId("");
    setAmount("");
    setCurrency("");
    setDate(undefined);
    setCategory("");
    setDescription("");
    setConfidences({});
  }, []);

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const processFile = async (f: File) => {
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
    setStep("processing");

    try {
      const result = await extractWithAI(f);
      setAmount(result.amount.value.replace(/,/g, ""));
      setCurrency(result.currency.value);
      setDate(result.date.value);
      setCategory(result.category.value);
      setDescription(result.description.value);
      setConfidences({
        amount: result.amount.confidence,
        currency: result.currency.confidence,
        date: result.date.confidence,
        category: result.category.confidence,
        description: result.description.confidence,
      });
      setStep("review");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to scan receipt");
      setStep("upload");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleSubmit = () => {
    if (!employeeId || !date) return;
    onSubmit({ employeeId, category, amount, currency, date, description });
    handleOpenChange(false);
  };

  const ConfidenceBadge = ({ field }: { field: string }) => {
    const conf = confidences[field];
    if (!conf) return null;
    return (
      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-medium capitalize", CONFIDENCE_COLORS[conf])}>
        {conf}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {step === "upload" && "Auto Scan Receipt"}
            {step === "processing" && "Scanning Document..."}
            {step === "review" && "Review Extracted Data"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a receipt or invoice image to auto-fill your expense claim."}
            {step === "processing" && "Extracting information from your document."}
            {step === "review" && "Verify and adjust extracted fields before submitting."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drop your receipt here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, PDF</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Step 2: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ScanLine className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <Loader2 className="h-6 w-6 text-primary animate-spin absolute -top-1 -right-1" />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{file.name}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Analyzing receipt with AI...</p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* File info */}
            {file && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                {preview ? (
                  <img src={preview} alt="Receipt" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <FileText className="h-10 w-10 text-muted-foreground" />
                )}
                <span className="truncate flex-1">{file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { reset(); setStep("upload"); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Employee */}
            <div className="space-y-1.5">
              <Label className="text-xs">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">Amount</Label>
                  <ConfidenceBadge field="amount" />
                </div>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">Currency</Label>
                  <ConfidenceBadge field="currency" />
                </div>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                <SelectContent>
                    {availableCurrencies.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Expense Date</Label>
                <ConfidenceBadge field="date" />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Category</Label>
                <ConfidenceBadge field="category" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Description</Label>
                <ConfidenceBadge field="description" />
              </div>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Not detected" rows={2} />
            </div>
          </div>
        )}

        {step === "review" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!employeeId || !date || !amount}>
              Submit Claim
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
