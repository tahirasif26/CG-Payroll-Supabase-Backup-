import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { employees } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, FileText, Upload } from "lucide-react";

interface EmployeeDoc {
  name: string;
  type: string;
  uploadedDate: string;
}

// Placeholder documents per employee
const employeeDocs: Record<string, EmployeeDoc[]> = {
  "1": [
    { name: "National ID", type: "Identity", uploadedDate: "2021-03-15" },
    { name: "Employment Contract", type: "Contract", uploadedDate: "2021-03-15" },
  ],
  "2": [
    { name: "National ID", type: "Identity", uploadedDate: "2019-06-01" },
    { name: "Tax Certificate", type: "Tax", uploadedDate: "2024-01-10" },
  ],
};

export default function EmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage employee records and documentation.">
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold"><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
      </PageHeader>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-4">
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Designation</TableHead>
                  <TableHead className="font-semibold">Joined</TableHead>
                  <TableHead className="font-semibold text-right">Salary (SAR)</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-muted/30 cursor-pointer transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{emp.empId}</TableCell>
                    <TableCell className="text-sm">{emp.department}</TableCell>
                    <TableCell className="text-sm">{emp.designation}</TableCell>
                    <TableCell className="text-sm">{new Date(emp.joiningDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">{emp.salary.toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={emp.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Employee List */}
            <div className="bg-card rounded-xl border p-4 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Select Employee</p>
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                    selectedEmployee === emp.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-muted-foreground">{emp.empId}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Documents Panel */}
            <div className="lg:col-span-2">
              {selectedEmployee ? (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Documents — {employees.find(e => e.id === selectedEmployee)?.firstName} {employees.find(e => e.id === selectedEmployee)?.lastName}
                    </CardTitle>
                    <Button size="sm" variant="outline">
                      <Upload className="h-4 w-4 mr-2" /> Upload Document
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(employeeDocs[selectedEmployee] || []).map((doc, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{doc.type} · Uploaded {doc.uploadedDate}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      ))}
                      {(!employeeDocs[selectedEmployee] || employeeDocs[selectedEmployee].length === 0) && (
                        <div className="text-center py-8">
                          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                          <p className="text-xs text-muted-foreground mt-1">Upload employee documents like ID, contracts, certificates.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Select an employee to view or manage documents.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
