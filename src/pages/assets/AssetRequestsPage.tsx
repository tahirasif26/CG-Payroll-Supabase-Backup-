import { PageHeader } from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useAssets } from "@/contexts/AssetContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyTableRow } from "@/components/EmptyState";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AssetRequestsPage() {
  const { currentEmployeeId, hasFeature } = useRole();
  const navigate = useNavigate();
  const { assetRequests, approveRequest, rejectRequest, getEmployeeRequests } = useAssets();
  const { toast } = useToast();

  const canApprove = hasFeature("assets.approve_requests");
  const displayRequests = canApprove ? assetRequests : getEmployeeRequests(currentEmployeeId);

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
              {canApprove && <TableHead className="font-semibold text-right">Actions</TableHead>}
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
                {canApprove && (
                  <TableCell className="text-right">
                    {req.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { approveRequest(req.id); toast({ title: "Request Approved" }); }}><CheckCircle className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { rejectRequest(req.id); toast({ title: "Request Rejected" }); }}><XCircle className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )) : (
              <EmptyTableRow colSpan={canApprove ? 8 : 6} icon={ClipboardList} title="No requests yet" description="Asset requests will appear here." />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
