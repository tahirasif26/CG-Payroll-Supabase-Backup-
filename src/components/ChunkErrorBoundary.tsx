import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * Catches "Importing a module script failed" / chunk load errors that occur
 * after Vite reoptimizes deps or after a deploy invalidates lazy chunks.
 * Forces a one-time reload to fetch the new chunk graph.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    const msg = String(error?.message || "");
    const isChunkError =
      /Importing a module script failed/i.test(msg) ||
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /ChunkLoadError/i.test(msg) ||
      /Loading chunk [\d]+ failed/i.test(msg);

    if (isChunkError && typeof window !== "undefined") {
      const KEY = "__chunk_reload_at";
      const last = Number(sessionStorage.getItem(KEY) || 0);
      // Avoid infinite reload loops — only reload if last attempt was >10s ago
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    }
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Reloading…
        </div>
      );
    }
    return this.props.children;
  }
}
