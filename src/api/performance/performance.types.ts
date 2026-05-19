export type PerformanceCycleStatus = "draft" | "open" | "in_calibration" | "closed";
export type AssessmentType = "self" | "peer" | "manager";
export type AssessmentStatus = "pending" | "submitted";

export interface PerformanceCycle {
  id: string;
  clientId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PerformanceCycleStatus;
}

export interface PerformanceQuestionnaire {
  id: string;
  clientId: string;
  cycleId: string;
  name: string;
  questions: Record<string, unknown>[];
  audience: string | null;
}

export interface PerformanceAssessment {
  id: string;
  clientId: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  type: AssessmentType;
  responses: Record<string, unknown>;
  rating: string | null;
  status: AssessmentStatus;
  submittedAt: string | null;
  employee?: { id: string; firstName: string; lastName: string; empId: string };
}

export interface PerformanceCalibration {
  id: string;
  clientId: string;
  cycleId: string;
  employeeId: string;
  originalRating: string | null;
  calibratedRating: string | null;
  notes: string | null;
}

export interface CreateCycleRequest {
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpsertQuestionnaireRequest {
  cycleId: string;
  name: string;
  questions: Record<string, unknown>[];
  audience?: string | null;
}

export interface CreateAssessmentRequest {
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  type: AssessmentType;
}

export interface SubmitAssessmentRequest {
  responses: Record<string, unknown>;
  rating?: number;
}

export interface UpsertCalibrationRequest {
  cycleId: string;
  employeeId: string;
  calibratedRating: number;
  notes?: string | null;
}
