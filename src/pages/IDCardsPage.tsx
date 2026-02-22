import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Search, Printer, DoorOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useClient } from "@/contexts/ClientContext";
import { useBLEAccess } from "@/contexts/BLEAccessContext";
import { generateBLEUUID } from "@/lib/bleAccess";
import { generateQRCodeSVG } from "@/lib/qrcode";

export default function IDCardsPage() {
  const activeEmployees = useActiveEmployees();
  const { client } = useClient();
  const { getAccessForEmployee, doors } = useBLEAccess();
  const [search, setSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<typeof activeEmployees[0] | null>(null);

  const filtered = activeEmployees.filter(emp => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q)
      || emp.empId.toLowerCase().includes(q)
      || emp.department.toLowerCase().includes(q);
  });

  const getDoorName = (doorId: string) => doors.find(d => d.id === doorId)?.name || doorId;

  const IDCard = ({ emp, large = false }: { emp: typeof activeEmployees[0]; large?: boolean }) => {
    const bleUUID = generateBLEUUID(emp.id);
    const qrData = `BLE:${bleUUID}|EMP:${emp.empId}`;
    const qrSVG = generateQRCodeSVG(qrData, large ? 120 : 80);
    const empGrants = getAccessForEmployee(emp.id);

    return (
      <div className={`bg-card border rounded-xl overflow-hidden ${large ? "w-full max-w-lg mx-auto" : "w-full"}`}>
        {/* Header */}
        <div className="bg-primary px-4 py-3">
          <p className={`text-primary-foreground font-bold ${large ? "text-base" : "text-xs"}`}>
            {client.companyName || "CG Payroll HCM"}
          </p>
          <p className={`text-primary-foreground/60 ${large ? "text-xs" : "text-[10px]"}`}>Employee Identification Card</p>
        </div>

        {/* Body */}
        <div className={`p-4 ${large ? "space-y-4" : "space-y-3"}`}>
          <div className="flex gap-4">
            {/* Avatar */}
            <div className={`${large ? "h-20 w-20" : "h-14 w-14"} rounded-lg bg-primary/10 flex items-center justify-center shrink-0`}>
              <span className={`font-bold text-primary ${large ? "text-2xl" : "text-lg"}`}>
                {emp.firstName[0]}{emp.lastName[0]}
              </span>
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1 space-y-1">
              <p className={`font-bold text-foreground truncate ${large ? "text-lg" : "text-sm"}`}>
                {emp.firstName} {emp.lastName}
              </p>
              <p className={`text-muted-foreground ${large ? "text-sm" : "text-xs"}`}>{emp.designation}</p>
              <p className={`text-muted-foreground ${large ? "text-sm" : "text-xs"}`}>{emp.department}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className={`grid grid-cols-2 gap-x-4 gap-y-1 ${large ? "text-sm" : "text-xs"}`}>
            <div>
              <span className="text-muted-foreground">Employee ID</span>
              <p className="font-mono font-semibold text-foreground">{emp.empId}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Location</span>
              <p className="font-semibold text-foreground">{emp.workLocationCountry}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Joined</span>
              <p className="font-semibold text-foreground">{new Date(emp.joiningDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{emp.status}</Badge>
            </div>
          </div>

          {/* BLE UUID + QR */}
          <div className="border-t pt-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className={`text-muted-foreground ${large ? "text-xs" : "text-[10px]"}`}>BLE Access UUID</p>
              <p className={`font-mono font-semibold text-foreground break-all ${large ? "text-xs" : "text-[9px]"}`}>{bleUUID}</p>

              {empGrants.length > 0 && (
                <div className="mt-2">
                  <p className={`text-muted-foreground mb-1 ${large ? "text-xs" : "text-[10px]"}`}>Authorized Doors</p>
                  <div className="flex flex-wrap gap-1">
                    {empGrants.map(g => (
                      <Badge key={g.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                        <DoorOpen className="h-2.5 w-2.5 mr-0.5" />
                        {getDoorName(g.doorId)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {empGrants.length === 0 && (
                <p className={`text-destructive mt-1 ${large ? "text-xs" : "text-[10px]"}`}>No door access assigned</p>
              )}
            </div>
            <div
              className="shrink-0"
              dangerouslySetInnerHTML={{ __html: qrSVG }}
            />
          </div>
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Employee ID Cards" description="Digital ID cards with BLE access credentials and QR codes." />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, ID, department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(emp => (
          <div key={emp.id} className="cursor-pointer hover:ring-2 hover:ring-primary/30 rounded-xl transition-all" onClick={() => setSelectedEmp(emp)}>
            <IDCard emp={emp} />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">No employees found.</div>
        )}
      </div>

      {/* Print-ready dialog */}
      <Dialog open={!!selectedEmp} onOpenChange={open => { if (!open) setSelectedEmp(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee ID Card</DialogTitle>
          </DialogHeader>
          {selectedEmp && (
            <div className="space-y-4">
              <IDCard emp={selectedEmp} large />
              <div className="flex justify-end">
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />Print Card
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
