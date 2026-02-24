import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cardTemplates, templateMeta, type CardTemplateProps } from "./CardTemplates";
import { useCards } from "@/contexts/CardContext";
import { toast } from "@/hooks/use-toast";
import { Eye, Send, X } from "lucide-react";

export function CardGallery({ trigger }: { trigger?: React.ReactNode }) {
  const { settings } = useCards();
  const [open, setOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  const sampleProps: CardTemplateProps = {
    name: "Jane Doe",
    occasion: "birthday",
    yearsOfService: 5,
    companyName: settings.companyName || "Your Company",
    year: currentYear,
    message: settings.birthdayMessage,
  };

  const handleSendPreview = (designName: string) => {
    toast({ title: "Preview Sent!", description: `A preview of "${designName}" was sent to your email (simulated).` });
  };

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
                <Badge variant="secondary">{templateMeta[previewIndex].type === "birthday" ? "Birthday" : "Anniversary"}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreviewIndex(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="max-w-md mx-auto">
              {(() => {
                const Template = cardTemplates[previewIndex];
                const isAnniversary = templateMeta[previewIndex].type === "anniversary";
                return (
                  <Template
                    {...sampleProps}
                    occasion={isAnniversary ? "anniversary" : "birthday"}
                    message={isAnniversary ? settings.anniversaryMessage : settings.birthdayMessage}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {cardTemplates.map((Template, i) => {
              const meta = templateMeta[i];
              const isAnniversary = meta.type === "anniversary";
              const yearAssigned = currentYear + (i % 3);
              return (
                <div key={meta.id} className="cursor-pointer group" onClick={() => setPreviewIndex(i)}>
                  <div className="transform transition-transform group-hover:scale-[1.02]">
                    <div className="text-[0.55rem] origin-top-left" style={{ transform: "scale(0.85)", transformOrigin: "top center" }}>
                      <Template
                        {...sampleProps}
                        occasion={isAnniversary ? "anniversary" : "birthday"}
                        message={isAnniversary ? settings.anniversaryMessage : settings.birthdayMessage}
                      />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between px-1">
                    <span className="text-xs font-medium truncate">{meta.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{yearAssigned}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
