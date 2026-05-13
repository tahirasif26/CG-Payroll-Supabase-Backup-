import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequestApproval } from "@/hooks/queries/useRequestWorkflow";
import type { RequestModule } from "@/lib/workflow";

interface Props {
  module: RequestModule;
  entityId: string | undefined;
}

/** Inline cell that shows who the request is currently waiting on. */
export function RequestedToCell({ module, entityId }: Props) {
  const { data: req } = useRequestApproval(module, entityId);
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    const pending = (req?.assignments ?? []).filter((a: any) => a.status === "pending");
    if (pending.length === 0) { setNames([]); return; }
    (async () => {
      const ids = pending.map((a: any) => a.employee_id);
      const { data } = await (supabase as any).from("employees")
        .select("id, first_name, last_name").in("id", ids);
      setNames((data ?? []).map((e: any) =>
        [e.first_name, e.last_name].filter(Boolean).join(" ") || "—"));
    })();
  }, [req]);

  if (!req) return <span className="text-xs text-muted-foreground">—</span>;
  if (req.status !== "pending") return <span className="text-xs text-muted-foreground">—</span>;
  if (names.length === 0) return <span className="text-xs text-muted-foreground italic">Admin</span>;

  const display = names.slice(0, 2).join(", ");
  const extra = names.length - 2;
  return (
    <span className="text-xs">
      {display}{extra > 0 && <span className="text-muted-foreground"> +{extra}</span>}
    </span>
  );
}
