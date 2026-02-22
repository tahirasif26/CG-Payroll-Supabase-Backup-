import { createContext, useContext, useState, ReactNode } from "react";

export interface PerformanceCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "active" | "closed";
  createdAt: string;
}

export interface AssessmentRating {
  id: string;
  name: string;
  value: number;
  description: string;
  color: string;
}

const defaultRatings: AssessmentRating[] = [
  { id: "1", name: "Outstanding", value: 5, description: "Consistently exceeds all expectations", color: "bg-success/10 text-success" },
  { id: "2", name: "Exceeds Expectations", value: 4, description: "Frequently exceeds expectations", color: "bg-info/10 text-info" },
  { id: "3", name: "Meets Expectations", value: 3, description: "Consistently meets expectations", color: "bg-primary/10 text-primary" },
  { id: "4", name: "Below Expectations", value: 2, description: "Partially meets expectations", color: "bg-warning/10 text-warning" },
  { id: "5", name: "Unsatisfactory", value: 1, description: "Does not meet expectations", color: "bg-destructive/10 text-destructive" },
];

interface PerformanceCycleContextType {
  cycles: PerformanceCycle[];
  addCycle: (cycle: PerformanceCycle) => void;
  updateCycle: (id: string, data: Partial<PerformanceCycle>) => void;
  deleteCycle: (id: string) => void;
  ratings: AssessmentRating[];
  addRating: (rating: AssessmentRating) => void;
  updateRating: (id: string, data: Partial<AssessmentRating>) => void;
  deleteRating: (id: string) => void;
}

const PerformanceCycleContext = createContext<PerformanceCycleContextType | undefined>(undefined);

export function PerformanceCycleProvider({ children }: { children: ReactNode }) {
  const [cycles, setCycles] = useState<PerformanceCycle[]>([
    { id: "1", name: "2025-H1", startDate: "2025-01-01", endDate: "2025-06-30", status: "active", createdAt: "2025-01-01" },
  ]);
  const [ratings, setRatings] = useState<AssessmentRating[]>(defaultRatings);

  const addCycle = (cycle: PerformanceCycle) => setCycles(prev => [...prev, cycle]);
  const updateCycle = (id: string, data: Partial<PerformanceCycle>) => setCycles(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  const deleteCycle = (id: string) => setCycles(prev => prev.filter(c => c.id !== id));

  const addRating = (rating: AssessmentRating) => setRatings(prev => [...prev, rating]);
  const updateRating = (id: string, data: Partial<AssessmentRating>) => setRatings(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  const deleteRating = (id: string) => setRatings(prev => prev.filter(r => r.id !== id));

  return (
    <PerformanceCycleContext.Provider value={{ cycles, addCycle, updateCycle, deleteCycle, ratings, addRating, updateRating, deleteRating }}>
      {children}
    </PerformanceCycleContext.Provider>
  );
}

export function usePerformanceCycles() {
  const ctx = useContext(PerformanceCycleContext);
  if (!ctx) throw new Error("usePerformanceCycles must be used within PerformanceCycleProvider");
  return ctx;
}
