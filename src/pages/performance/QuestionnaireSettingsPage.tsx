import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Question {
  id: string;
  text: string;
  type: "rating" | "text" | "multiple-choice";
  category: "self" | "peer" | "manager" | "all";
  required: boolean;
  options?: string[];
  isActive: boolean;
}

const initialQuestions: Question[] = [
  { id: "1", text: "How well did you meet your goals for this period?", type: "rating", category: "self", required: true, isActive: true },
  { id: "2", text: "Describe your key accomplishments this cycle.", type: "text", category: "self", required: true, isActive: true },
  { id: "3", text: "What areas do you want to develop?", type: "text", category: "self", required: false, isActive: true },
  { id: "4", text: "How effectively does this person collaborate with the team?", type: "rating", category: "peer", required: true, isActive: true },
  { id: "5", text: "Rate this person's communication skills.", type: "rating", category: "peer", required: true, isActive: true },
  { id: "6", text: "Provide constructive feedback for this colleague.", type: "text", category: "peer", required: false, isActive: true },
  { id: "7", text: "How well does this employee meet performance expectations?", type: "rating", category: "manager", required: true, isActive: true },
  { id: "8", text: "Assess the employee's leadership potential.", type: "multiple-choice", category: "manager", required: true, options: ["High Potential", "Developing", "Meets Current Role", "Needs Support"], isActive: true },
  { id: "9", text: "What development plan do you recommend?", type: "text", category: "manager", required: true, isActive: true },
  { id: "10", text: "Rate overall job performance.", type: "rating", category: "all", required: true, isActive: true },
];

const categoryLabels: Record<string, string> = { self: "Self Assessment", peer: "Peer Assessment", manager: "Manager Assessment", all: "All Types" };
const typeLabels: Record<string, string> = { rating: "Rating Scale", text: "Free Text", "multiple-choice": "Multiple Choice" };

export default function QuestionnaireSettingsPage() {
  const [questions, setQuestions] = useState(initialQuestions);
  const [showAdd, setShowAdd] = useState(false);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [form, setForm] = useState({ text: "", type: "rating" as Question["type"], category: "all" as Question["category"], required: true, options: "" });
  const [categoryFilter, setCategoryFilter] = useState("all-filter");
  const { toast } = useToast();

  const filtered = categoryFilter === "all-filter" ? questions : questions.filter(q => q.category === categoryFilter || q.category === "all");

  const handleSave = () => {
    if (!form.text.trim()) { toast({ title: "Error", description: "Question text is required.", variant: "destructive" }); return; }
    const newQ: Question = {
      id: editQuestion?.id || String(Date.now()),
      text: form.text,
      type: form.type,
      category: form.category,
      required: form.required,
      options: form.type === "multiple-choice" ? form.options.split(",").map(o => o.trim()).filter(Boolean) : undefined,
      isActive: true,
    };
    if (editQuestion) {
      setQuestions(prev => prev.map(q => q.id === editQuestion.id ? newQ : q));
      toast({ title: "Updated", description: "Question updated." });
    } else {
      setQuestions(prev => [...prev, newQ]);
      toast({ title: "Added", description: "Question added to questionnaire." });
    }
    setShowAdd(false);
    setEditQuestion(null);
    setForm({ text: "", type: "rating", category: "all", required: true, options: "" });
  };

  const handleDelete = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    toast({ title: "Deleted", description: "Question removed." });
  };

  const toggleActive = (id: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, isActive: !q.isActive } : q));
  };

  const openEdit = (q: Question) => {
    setEditQuestion(q);
    setForm({ text: q.text, type: q.type, category: q.category, required: q.required, options: q.options?.join(", ") || "" });
    setShowAdd(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Questionnaire Settings" description="Configure assessment questions for self, peer, and manager evaluations.">
        <Button onClick={() => { setEditQuestion(null); setForm({ text: "", type: "rating", category: "all", required: true, options: "" }); setShowAdd(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Question
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Questions</p><p className="text-2xl font-bold">{questions.length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Self</p><p className="text-2xl font-bold">{questions.filter(q => q.category === "self" || q.category === "all").length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Peer</p><p className="text-2xl font-bold">{questions.filter(q => q.category === "peer" || q.category === "all").length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Manager</p><p className="text-2xl font-bold">{questions.filter(q => q.category === "manager" || q.category === "all").length}</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all-filter">All Categories</SelectItem>
            <SelectItem value="self">Self Assessment</SelectItem>
            <SelectItem value="peer">Peer Assessment</SelectItem>
            <SelectItem value="manager">Manager Assessment</SelectItem>
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
                <TableHead>Category</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(q => (
                <TableRow key={q.id} className={!q.isActive ? "opacity-50" : ""}>
                  <TableCell className="text-sm">{q.text}</TableCell>
                  <TableCell><span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">{typeLabels[q.type]}</span></TableCell>
                  <TableCell><span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">{categoryLabels[q.category]}</span></TableCell>
                  <TableCell className="text-sm">{q.required ? "Yes" : "No"}</TableCell>
                  <TableCell><Switch checked={q.isActive} onCheckedChange={() => toggleActive(q.id)} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(q)}><Edit2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(q.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={showAdd} onOpenChange={open => { if (!open) { setShowAdd(false); setEditQuestion(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
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
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as Question["category"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="self">Self Assessment</SelectItem>
                    <SelectItem value="peer">Peer Assessment</SelectItem>
                    <SelectItem value="manager">Manager Assessment</SelectItem>
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
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditQuestion(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editQuestion ? "Update" : "Add"} Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
