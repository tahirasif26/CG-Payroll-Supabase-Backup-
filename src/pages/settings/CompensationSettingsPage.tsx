import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet } from "lucide-react";

export default function CompensationSettingsPage() {
  const navigate = useNavigate();
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Wallet className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-lg font-semibold">Managed in Payroll Setup</h3>
          <p className="text-sm text-muted-foreground">
            Compensation components are now configured inside each Payroll Setup,
            so the catalog stays aligned with the engine that uses it.
          </p>
        </div>
        <Button onClick={() => navigate("/payroll/setup")} className="gap-2">
          Go to Payroll Setup
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
