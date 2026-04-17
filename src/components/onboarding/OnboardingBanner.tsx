import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function OnboardingBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, refetch } = useOnboardingStatus();

  // Hide on the wizard itself, on auth, and when nothing to show
  if (!status || !status.shouldShowBanner) return null;
  if (location.pathname.startsWith("/onboarding")) return null;

  const pct = Math.round((status.completedCount / status.totalCount) * 100);

  const handleDismiss = async () => {
    if (!status.clientId) return;
    const { error } = await supabase
      .from("clients")
      .update({ setup_dismissed_at: new Date().toISOString() })
      .eq("id", status.clientId);
    if (error) {
      toast.error("Couldn't dismiss banner");
      return;
    }
    toast.success("Setup banner hidden — you can resume anytime from Settings");
    refetch();
  };

  return (
    <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 py-2.5">
      <div className="mx-auto flex items-center gap-4">
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-card shrink-0",
        )}>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-foreground">
              Finish setting up your company
            </p>
            <span className="text-[11px] text-muted-foreground">
              {status.completedCount} of {status.totalCount} steps complete
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <Progress value={pct} className="h-1.5 max-w-xs" />
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {status.steps.map((s) => (
                <span
                  key={s.key}
                  className={cn(
                    "inline-flex items-center gap-1",
                    s.done ? "text-emerald-600" : "text-muted-foreground/60",
                  )}
                >
                  {s.done && <CheckCircle2 className="h-3 w-3" />}
                  {s.title}
                </span>
              )).reduce<React.ReactNode[]>((acc, el, i, arr) => {
                acc.push(el);
                if (i < arr.length - 1) acc.push(<span key={`sep-${i}`} className="text-muted-foreground/30">·</span>);
                return acc;
              }, [])}
            </div>
          </div>
        </div>

        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => navigate("/onboarding")}
        >
          Continue setup
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
          aria-label="Dismiss"
          title="Dismiss — you can finish setup later from Settings"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
