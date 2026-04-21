import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Optional label shown in the message, e.g. "the Payroll page". */
  routeLabel?: string;
}
interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Per-route error boundary. Catches runtime errors inside a single page so
 * the rest of the app (sidebar, topbar, other routes) keeps working instead
 * of whitescreening. Pairs with ChunkErrorBoundary which handles lazy-load
 * failures specifically.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[RouteErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const label = this.props.routeLabel ?? "this page";
      return (
        <div className="flex items-center justify-center py-16 px-4">
          <div className="max-w-md w-full rounded-xl border bg-card p-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" strokeWidth={2} />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              We hit an unexpected error loading {label}. Try again — if it keeps happening, refresh the app.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground mt-3 font-mono bg-muted/50 rounded p-2 break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                Try again
              </Button>
              <Button size="sm" onClick={this.handleReload}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reload app
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
