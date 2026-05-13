import { PageHeader } from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useAssets } from "@/contexts/AssetContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyTableRow } from "@/components/EmptyState";
import { ClipboardList } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { RequestRowActions } from "@/components/requests/RequestRowActions";
import { RequestedToCell } from "@/components/requests/RequestedToCell";
import { useRequestsRealtime } from "@/hooks/queries/useRequestWorkflow";
import { useAuth } from "@/hooks/useAuth";

export default function AssetRequestsPage() {
  const { hasFeature } = useRole();
  const { clientId } = useAuth();
  const { data: currentEmp } = useCurrentEmployee();
  const navigate = useNavigate();
  const { assetRequests, approveRequest, rejectRequest, getEmployeeRequests } = useAssets();
  const { toast } = useToast();
  useRequestsRealtime(clientId);

  const canApprove = hasFeature("assets.approve_requests");
  const displayRequests = canApprove ? assetRequests : (currentEmp?.id ? getEmployeeRequests(currentEmp.id) : []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Requests"
        description={canApprove ? "Review and manage asset requests from employees." : "Track your asset requests."}
      />

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {canApprove && <TableHead className="font-semibold">Employee</TableHead>}
              <TableHead className="font-semibold">Asset Name</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Request Date</TableHead>
              <TableHead className="font-semibold">Reason</TableHead>
              <TableHead className="font-semibold">Priority</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Requested To</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRequests.length > 0 ? displayRequests.map(req => (
              <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                {canApprove && (
                  <TableCell className="font-medium">
                    {req.employeeId ? (
                      <button
                        type="button"
                        className="text-primary hover:underline text-left"
                        onClick={() => navigate(`/employees?highlight=${req.employeeId}`)}
                      >
                        {req.employeeName}
                      </button>
                    ) : (
                      req.employeeName
                    )}
                  </TableCell>
                )}
                <TableCell>{req.storeItemName}</TableCell>
                <TableCell>{req.category}</TableCell>
                <TableCell>{new Date(req.requestDate).toLocaleDateString()}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={req.reason}>{req.reason}</TableCell>
                <TableCell><Badge variant={req.priority === "high" ? "destructive" : req.priority === "medium" ? "default" : "secondary"}>{req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}</Badge></TableCell>
                <TableCell><StatusBadge status={req.status} /></TableCell>
                <TableCell><RequestedToCell module="asset" entityId={req.id} /></TableCell>
                <TableCell className="text-right">
                  <RequestRowActions
                    module="asset"
                    entityId={req.id}
                    supportsDelivered
                    onActed={(action) => {
                      if (action === "approved") { approveRequest(req.id); toast({ title: "Request Approved" }); }
                      else if (action === "rejected") { rejectRequest(req.id); toast({ title: "Request Rejected" }); }
                    }}
                  />
                </TableCell>
              </TableRow>
            )) : (
              <EmptyTableRow colSpan={9} icon={ClipboardList} title="No requests yet" description="Asset requests will appear here." />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
