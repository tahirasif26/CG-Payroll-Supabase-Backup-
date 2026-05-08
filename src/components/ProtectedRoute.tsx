import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
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
  const { appRole, isSuperAdmin, isOrphan, hasFeature, hasPeopleFeature, session, loading } = useRole();
  const { scope } = useViewScope();

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

  // Orphan = role assigned but no employee row. Block all routes with a clear message.
  if (isOrphan) {
    return <AccessDenied />;
  }

  // Super admin scoping: only allowed on routes with no role requirement
  // OR routes that explicitly include "super_admin" in requiredRole.
  // Client-scoped routes (admin/hr/employee) are blocked → redirect to dashboard.
  if (isSuperAdmin) {
    if (!requiredRole) {
      // Still respect feature checks below
    } else {
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowed.includes("super_admin")) {
        return <Navigate to="/" replace />;
      }
    }
  } else {
    // Role check (non-super-admin)
    if (requiredRole) {
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!appRole || !allowed.includes(appRole)) {
        return fallback === "redirect" ? <Navigate to={redirectTo} replace /> : <AccessDenied />;
      }
    }
  }

  // Feature check (applies to everyone except super_admin, who bypasses features)
  if (!isSuperAdmin && requiredFeature && !hasFeature(requiredFeature)) {
    return fallback === "redirect" ? <Navigate to={redirectTo} replace /> : <AccessDenied />;
  }

  // Custom People-side routes must respect the People toggle, not just personal Me defaults.
  if (!isSuperAdmin && appRole === "hr" && scope === "people" && requiredFeature && !hasPeopleFeature(requiredFeature)) {
    return fallback === "redirect" ? <Navigate to={redirectTo} replace /> : <AccessDenied />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
