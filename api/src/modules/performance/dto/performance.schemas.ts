import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/);

export const createCycleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  startDate: isoDate,
  endDate: isoDate,
});
export type CreateCycleDto = z.infer<typeof createCycleSchema>;

export const updateCycleStatusSchema = z.object({
  status: z.enum(['draft', 'open', 'in_calibration', 'closed']),
});
export type UpdateCycleStatusDto = z.infer<typeof updateCycleStatusSchema>;

export const upsertQuestionnaireSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  questions: z.array(z.record(z.unknown())).default([]),
  audience: z.string().trim().max(40).optional().nullable(),
});
export type UpsertQuestionnaireDto = z.infer<typeof upsertQuestionnaireSchema>;

export const createAssessmentSchema = z.object({
  cycleId: z.string().uuid(),
  employeeId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  type: z.enum(['self', 'peer', 'manager']),
});
export type CreateAssessmentDto = z.infer<typeof createAssessmentSchema>;

export const submitAssessmentSchema = z.object({
  responses: z.record(z.unknown()),
  rating: z.coerce.number().min(0).max(5).optional(),
});
export type SubmitAssessmentDto = z.infer<typeof submitAssessmentSchema>;

export const upsertCalibrationSchema = z.object({
  cycleId: z.string().uuid(),
  employeeId: z.string().uuid(),
  calibratedRating: z.coerce.number().min(0).max(5),
  notes: z.string().trim().max(1000).optional().nullable(),
});
export type UpsertCalibrationDto = z.infer<typeof upsertCalibrationSchema>;
