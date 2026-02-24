import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useCards, occasionLabels, occasionEmojis } from "@/contexts/CardContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { cardTemplates, templateMeta, type CardOccasion } from "./CardTemplates";
import { Send, Search, Mail, Users } from "lucide-react";

const holidayOccasions: CardOccasion[] = ["new_year", "eid", "christmas", "holiday"];

export function HolidayCardSender() {
  const { settings, addHistory } = useCards();
  const activeEmployees = useActiveEmployees();

  const [occasion, setOccasion] = useState<CardOccasion>("new_year");
  const [selectedDesign, setSelectedDesign] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const availableDesigns = useMemo(() => {
    return templateMeta
      .map((meta, idx) => ({ ...meta, idx }))
      .filter(m => m.type === occasion);
  }, [occasion]);

  // Reset design when occasion changes
  const handleOccasionChange = (val: CardOccasion) => {
    setOccasion(val);
    setSelectedDesign(null);
  };

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return activeEmployees.filter(e =>
      !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
    );
  }, [activeEmployees, search]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(e => e.id)));
    }
  };

  const handleSend = () => {
    if (selectedDesign === null) {
      toast({ title: "Select a card design", variant: "destructive" });
      return;
    }
    if (selectedEmployees.size === 0) {
      toast({ title: "Select at least one recipient", variant: "destructive" });
      return;
    }

    const meta = templateMeta[selectedDesign];
    const count = selectedEmployees.size;

    selectedEmployees.forEach(empId => {
      const emp = activeEmployees.find(e => e.id === empId);
      if (emp) {
        addHistory({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          occasion,
          dateSent: new Date().toISOString().split("T")[0],
          designIndex: selectedDesign,
          designName: meta.name,
          status: "sent",
        });
      }
    });

    toast({
      title: `${occasionEmojis[occasion]} Cards Sent!`,
      description: `${count} ${occasionLabels[occasion]} card${count !== 1 ? "s" : ""} sent${sendEmail ? " via email" : ""} using "${meta.name}" design.`,
    });

    setSelectedEmployees(new Set());
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Occasion & Design */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />Send Holiday Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Occasion</Label>
                <Select value={occasion} onValueChange={(v) => handleOccasionChange(v as CardOccasion)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {holidayOccasions.map(o => (
                      <SelectItem key={o} value={o}>{occasionEmojis[o]} {occasionLabels[o]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Custom Message (optional)</Label>
                <Textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Leave blank to use the default message for this design"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(v) => setSendEmail(!!v)}
                />
                <Label htmlFor="sendEmail" className="cursor-pointer">Send via email</Label>
              </div>
            </CardContent>
          </Card>

          {/* Design picker */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Choose Design</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {availableDesigns.map(d => {
                  const Template = cardTemplates[d.idx];
                  const isSelected = selectedDesign === d.idx;
                  return (
                    <div
                      key={d.id}
                      className={`cursor-pointer rounded-lg overflow-hidden transition-all ${isSelected ? "ring-2 ring-primary ring-offset-2" : "hover:ring-1 hover:ring-muted-foreground/30"}`}
                      onClick={() => setSelectedDesign(d.idx)}
                    >
                      <div style={{ transform: "scale(0.65)", transformOrigin: "top center", marginBottom: -80 }}>
                        <Template
                          name="Preview"
                          occasion={occasion}
                          companyName={settings.companyName}
                          year={currentYear}
                          message={customMessage || undefined}
                        />
                      </div>
                      <div className="p-2 text-center">
                        <span className="text-xs font-medium">{d.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Recipients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recipients
              {selectedEmployees.size > 0 && (
                <Badge variant="secondary" className="ml-auto">{selectedEmployees.size} selected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedEmployees.size === filteredEmployees.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <ScrollArea className="h-[420px]">
              <div className="space-y-1">
                {filteredEmployees.map(emp => (
                  <div
                    key={emp.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedEmployees.has(emp.id) ? "bg-primary/5" : "hover:bg-muted/50"}`}
                    onClick={() => toggleEmployee(emp.id)}
                  >
                    <Checkbox checked={selectedEmployees.has(emp.id)} />
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.department} • {emp.designation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button className="w-full" onClick={handleSend} disabled={selectedDesign === null || selectedEmployees.size === 0}>
              <Send className="h-4 w-4 mr-2" />
              Send {selectedEmployees.size > 0 ? `${selectedEmployees.size} Card${selectedEmployees.size !== 1 ? "s" : ""}` : "Cards"}
              {sendEmail && " via Email"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
