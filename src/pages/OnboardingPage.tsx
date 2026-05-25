import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { status, isLoading, refetch } = useOnboardingStatus();

  if (isLoading || !status) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  const pct = Math.round((status.completedCount / status.totalCount) * 100);

  if (status.isComplete) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mb-4">
            <PartyPopper className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold mb-1.5">You're all set!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your company is fully configured. You can start adding employees and running payroll.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              Go to dashboard
            </Button>
            <Button onClick={() => navigate("/employees")}>
              Manage employees
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          Welcome — let's get you set up
        </div>
        <h1 className="text-2xl font-bold">Set up your company</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Finish these quick steps so payroll, leave and expenses work correctly for your team.
          You can do them in any order and come back any time.
        </p>
      </div>

      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">
            {status.completedCount} of {status.totalCount} complete
          </p>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {status.steps.map((step, idx) => {
          const isDone = step.done;
          return (
            <Card
              key={step.key}
              className={cn(
                "p-4 flex items-center gap-4 transition-all",
                isDone
                  ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/50"
                  : "hover:border-primary/40",
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center shrink-0 border-2",
                  isDone
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-card border-border text-muted-foreground",
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4.5 w-4.5" />
                ) : (
                  <span className="text-sm font-bold">{idx + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={isDone ? "outline" : "default"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    navigate(step.appRoute);
                    // Re-query when admin returns to the wizard so completion flips live.
                    setTimeout(() => refetch(), 0);
                  }}
                >
                  {isDone ? "Review" : "Set up"}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={() => navigate("/")}>
          Do this later
        </Button>
        <Button variant="outline" onClick={() => refetch()}>
          Refresh progress
        </Button>
      </div>
    </div>
  );
}
