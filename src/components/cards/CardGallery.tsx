import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cardTemplates, templateMeta, type CardTemplateProps, type CardOccasion } from "./CardTemplates";
import { useCards, occasionLabels, occasionEmojis } from "@/contexts/CardContext";
import { useClient } from "@/contexts/ClientContext";
import { toast } from "@/hooks/use-toast";
import { Eye, Send, X } from "lucide-react";

const allOccasions: CardOccasion[] = ["birthday", "anniversary", "new_year", "eid", "christmas", "holiday"];

export function CardGallery({ trigger }: { trigger?: React.ReactNode }) {
  const { settings } = useCards();
  const { client } = useClient();
  const [open, setOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [filterOccasion, setFilterOccasion] = useState<"all" | CardOccasion>("all");
  const currentYear = new Date().getFullYear();

  const companyName = client.companyName || "Your Company";
  const companyLogo = client.companyLogo;

  const sampleProps: CardTemplateProps = {
    name: "Jane Doe",
    occasion: "birthday",
    yearsOfService: 5,
    companyName,
    companyLogo,
    year: currentYear,
    message: settings.birthdayMessage,
  };

  const handleSendPreview = (designName: string) => {
    toast({ title: "Preview Sent!", description: `A preview of "${designName}" was sent to your email (simulated).` });
  };

  const filteredTemplates = templateMeta
    .map((meta, idx) => ({ ...meta, idx }))
    .filter(m => filterOccasion === "all" || m.type === filterOccasion);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1.5" />Preview All Designs</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Card Design Gallery</DialogTitle>
        </DialogHeader>

        {previewIndex !== null ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{templateMeta[previewIndex].name}</h3>
                <Badge variant="secondary">{occasionLabels[templateMeta[previewIndex].type]}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreviewIndex(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="max-w-md mx-auto">
              {(() => {
                const Template = cardTemplates[previewIndex];
                const meta = templateMeta[previewIndex];
                return (
                  <Template
                    {...sampleProps}
                    occasion={meta.type}
                    message={meta.type === "anniversary" ? settings.anniversaryMessage : settings.birthdayMessage}
                  />
                );
              })()}
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSendPreview(templateMeta[previewIndex].name)}>
                <Send className="h-4 w-4 mr-1.5" />Send Preview
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Select value={filterOccasion} onValueChange={(v) => setFilterOccasion(v as "all" | CardOccasion)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Occasions</SelectItem>
                {allOccasions.map(o => (
                  <SelectItem key={o} value={o}>{occasionEmojis[o]} {occasionLabels[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredTemplates.map(d => {
                const Template = cardTemplates[d.idx];
                return (
                  <div key={d.id} className="cursor-pointer group" onClick={() => setPreviewIndex(d.idx)}>
                    <div className="transform transition-transform group-hover:scale-[1.02]">
                      <div className="text-[0.55rem] origin-top-left" style={{ transform: "scale(0.85)", transformOrigin: "top center" }}>
                        <Template
                          {...sampleProps}
                          occasion={d.type}
                          message={d.type === "anniversary" ? settings.anniversaryMessage : settings.birthdayMessage}
                        />
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between px-1">
                      <span className="text-xs font-medium truncate">{d.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{occasionLabels[d.type]}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
