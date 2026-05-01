import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePerformanceQuestionnaires, useUpsertQuestionnaire, useDeleteQuestionnaire } from "@/hooks/queries/usePerformance";

interface Question {
  id: string;
  text: string;
  type: "rating" | "text" | "multiple-choice";
  required: boolean;
  options?: string[];
  isActive: boolean;
}

const audienceLabels: Record<string, string> = { self: "Self", peer: "Peer", manager: "Manager", all: "All Types" };
const typeLabels: Record<string, string> = { rating: "Rating Scale", text: "Free Text", "multiple-choice": "Multiple Choice" };

export default function QuestionnaireSettingsPage() {
  const { data: questionnaires = [], isLoading } = usePerformanceQuestionnaires();
  const upsert = useUpsertQuestionnaire();
  const del = useDeleteQuestionnaire();
  const { toast } = useToast();

  const [audienceFilter, setAudienceFilter] = useState<string>("all-filter");
  const [showAdd, setShowAdd] = useState(false);
  const [editCtx, setEditCtx] = useState<{ qnId: string; question?: Question } | null>(null);
  const [form, setForm] = useState({ text: "", type: "rating" as Question["type"], audience: "all", required: true, options: "" });

  // Flatten questionnaire questions with audience grouping
  type FlatQ = Question & { qnId: string; audience: string };
  const flat: FlatQ[] = useMemo(() => {
    const result: FlatQ[] = [];
    questionnaires.forEach(qn => {
      const list: Question[] = Array.isArray(qn.questions) ? qn.questions : [];
      list.forEach(q => result.push({ ...q, qnId: qn.id, audience: qn.audience }));
    });
    return result;
  }, [questionnaires]);

  const filtered = audienceFilter === "all-filter" ? flat : flat.filter(q => q.audience === audienceFilter || q.audience === "all");

  const ensureQuestionnaireForAudience = async (audience: string): Promise<string> => {
    const existing = questionnaires.find(qn => qn.audience === audience);
    if (existing) return existing.id;
    const created = await upsert.mutateAsync({
      name: `${audienceLabels[audience] || audience} Questionnaire`,
      audience,
      questions: [],
    });
    return created.id;
  };

  const handleSave = async () => {
    if (!form.text.trim()) {
      toast({ title: "Error", description: "Question text is required.", variant: "destructive" });
      return;
    }
    const newQ: Question = {
      id: editCtx?.question?.id || String(Date.now()),
      text: form.text,
      type: form.type,
      required: form.required,
      options: form.type === "multiple-choice" ? form.options.split(",").map(o => o.trim()).filter(Boolean) : undefined,
      isActive: editCtx?.question?.isActive ?? true,
    };

    let targetQnId: string;
    if (editCtx?.question) {
      targetQnId = editCtx.qnId;
      const qn = questionnaires.find(q => q.id === targetQnId);
      if (!qn) return;
      const updatedList = (qn.questions as Question[]).map(q => q.id === newQ.id ? newQ : q);
      await upsert.mutateAsync({ id: qn.id, name: qn.name, audience: qn.audience, questions: updatedList });
    } else {
      targetQnId = await ensureQuestionnaireForAudience(form.audience);
      const qn = questionnaires.find(q => q.id === targetQnId);
      const list = qn ? (qn.questions as Question[]) : [];
      await upsert.mutateAsync({ id: targetQnId, name: qn?.name || `${audienceLabels[form.audience]} Questionnaire`, audience: form.audience, questions: [...list, newQ] });
    }
    setShowAdd(false);
    setEditCtx(null);
    setForm({ text: "", type: "rating", audience: "all", required: true, options: "" });
  };

  const handleDelete = async (qnId: string, qid: string) => {
    const qn = questionnaires.find(q => q.id === qnId);
    if (!qn) return;
    const updated = (qn.questions as Question[]).filter(q => q.id !== qid);
    await upsert.mutateAsync({ id: qn.id, name: qn.name, audience: qn.audience, questions: updated });
  };

  const toggleActive = async (qnId: string, qid: string) => {
    const qn = questionnaires.find(q => q.id === qnId);
    if (!qn) return;
    const updated = (qn.questions as Question[]).map(q => q.id === qid ? { ...q, isActive: !q.isActive } : q);
    await upsert.mutateAsync({ id: qn.id, name: qn.name, audience: qn.audience, questions: updated });
  };

  const openEdit = (q: FlatQ) => {
    setEditCtx({ qnId: q.qnId, question: q });
    setForm({ text: q.text, type: q.type, audience: q.audience, required: q.required, options: q.options?.join(", ") || "" });
    setShowAdd(true);
  };

  const counts = {
    total: flat.length,
    self: flat.filter(q => q.audience === "self" || q.audience === "all").length,
    peer: flat.filter(q => q.audience === "peer" || q.audience === "all").length,
    manager: flat.filter(q => q.audience === "manager" || q.audience === "all").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Questionnaire Settings" description="Configure assessment questions for self, peer, and manager evaluations.">
        <Button onClick={() => { setEditCtx(null); setForm({ text: "", type: "rating", audience: "all", required: true, options: "" }); setShowAdd(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Question
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Questions</p><p className="text-2xl font-bold">{counts.total}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Self</p><p className="text-2xl font-bold">{counts.self}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Peer</p><p className="text-2xl font-bold">{counts.peer}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Manager</p><p className="text-2xl font-bold">{counts.manager}</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={audienceFilter} onValueChange={setAudienceFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all-filter">All Categories</SelectItem>
            <SelectItem value="self">Self</SelectItem>
            <SelectItem value="peer">Peer</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="all">All Types</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40%]">Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows colSpan={6} />}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No questions yet.</TableCell></TableRow>
              )}
              {filtered.map(q => (
                <TableRow key={`${q.qnId}-${q.id}`} className={!q.isActive ? "opacity-50" : ""}>
                  <TableCell className="text-sm">{q.text}</TableCell>
                  <TableCell><span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">{typeLabels[q.type]}</span></TableCell>
                  <TableCell><span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">{audienceLabels[q.audience] || q.audience}</span></TableCell>
                  <TableCell className="text-sm">{q.required ? "Yes" : "No"}</TableCell>
                  <TableCell><Switch checked={q.isActive} onCheckedChange={() => toggleActive(q.qnId, q.id)} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(q)}><Edit2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(q.qnId, q.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={showAdd} onOpenChange={open => { if (!open) { setShowAdd(false); setEditCtx(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCtx?.question ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>Configure the assessment question details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Question Text</Label><Textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} rows={3} placeholder="Enter the question..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as Question["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Rating Scale</SelectItem>
                    <SelectItem value="text">Free Text</SelectItem>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={v => setForm({ ...form, audience: v })} disabled={!!editCtx?.question}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="self">Self</SelectItem>
                    <SelectItem value="peer">Peer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === "multiple-choice" && (
              <div className="space-y-2"><Label>Options (comma separated)</Label><Input value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} placeholder="Option 1, Option 2, Option 3" /></div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.required} onCheckedChange={v => setForm({ ...form, required: v })} />
              <Label>Required</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditCtx(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>{editCtx?.question ? "Update" : "Add"} Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
