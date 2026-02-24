import { useCards, occasionLabels } from "@/contexts/CardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardGallery } from "./CardGallery";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Settings2 } from "lucide-react";

export function CardSettingsPanel() {
  const { settings, updateSettings, history } = useCards();

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" />Card Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Auto-Send Digital Cards</Label>
              <Switch checked={settings.globalEnabled} onCheckedChange={v => updateSettings({ globalEnabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Birthday Cards</Label>
              <Switch checked={settings.birthdayEnabled} onCheckedChange={v => updateSettings({ birthdayEnabled: v })} disabled={!settings.globalEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Anniversary Cards</Label>
              <Switch checked={settings.anniversaryEnabled} onCheckedChange={v => updateSettings({ anniversaryEnabled: v })} disabled={!settings.globalEnabled} />
            </div>
            <div className="space-y-1.5">
              <Label>Sender Name</Label>
              <Input value={settings.senderName} onChange={e => updateSettings({ senderName: e.target.value })} placeholder="HR Team" />
            </div>
            <div className="space-y-1.5">
              <Label>Company Name (on cards)</Label>
              <Input value={settings.companyName} onChange={e => updateSettings({ companyName: e.target.value })} placeholder="Company Name" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Custom Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Birthday Message</Label>
              <Textarea value={settings.birthdayMessage} onChange={e => updateSettings({ birthdayMessage: e.target.value })} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Anniversary Message</Label>
              <Textarea value={settings.anniversaryMessage} onChange={e => updateSettings({ anniversaryMessage: e.target.value })} rows={3} />
            </div>
            <CardGallery />
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Card History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employee</TableHead>
                  <TableHead>Occasion</TableHead>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Design</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length > 0 ? history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="text-sm font-medium">{h.employeeName}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{occasionLabels[h.occasion] || h.occasion}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(h.dateSent).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                    <TableCell className="text-sm">{h.designName}</TableCell>
                    <TableCell>
                      <Badge variant={h.status === "sent" ? "default" : "secondary"} className="capitalize">{h.status}</Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No cards sent yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
