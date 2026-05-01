import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";

export function AccessDenied() {
  const navigate = useNavigate();
  const { signOut, isSuperAdmin, isOrphan } = useRole();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isOrphan ? "Account Not Linked" : "Access Denied"}
          </h1>
          {isOrphan ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your login is active but no employee profile is linked to it yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Please ask your administrator to add you under <strong>Employees → Directory</strong> using the same email address.
              </p>
            </>
          ) : isSuperAdmin ? (
            <p className="text-sm text-muted-foreground">
              This is a client-specific area. Super admin accounts manage clients globally, not individual company data.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
              <p className="text-sm text-muted-foreground">If you think this is a mistake, contact your administrator.</p>
            </>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          {!isOrphan && <Button onClick={() => navigate("/")}>Go to Dashboard</Button>}
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;
