import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import type { AppRole } from "@/hooks/useAuth";
import { AccessDenied } from "./AccessDenied";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole | AppRole[];
  requiredFeature?: string;
  fallback?: "redirect" | "denied";
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredFeature,
  fallback = "denied",
  redirectTo = "/",
}: ProtectedRouteProps) {
  const { appRole, isSuperAdmin, hasFeature, session, loading } = useRole();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Super admin bypasses all checks
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Role check
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!appRole || !allowed.includes(appRole)) {
      return fallback === "redirect" ? <Navigate to={redirectTo} replace /> : <AccessDenied />;
    }
  }

  // Feature check
  if (requiredFeature && !hasFeature(requiredFeature)) {
    return fallback === "redirect" ? <Navigate to={redirectTo} replace /> : <AccessDenied />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
