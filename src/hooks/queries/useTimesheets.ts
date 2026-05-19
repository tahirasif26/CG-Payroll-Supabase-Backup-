/** Stub — timesheets / projects not on NestJS yet. */
const noopMut = {
  mutate: () => console.warn("[useTimesheets] not yet on NestJS"),
  mutateAsync: async () => undefined,
  isPending: false,
};
export interface TimesheetRow {
  id: string;
  client_id: string;
  employee_id: string;
  project_id: string;
  week_starting: string;
  hours: number;
  status: string;
}
export function useTimesheets() { return { data: [] as TimesheetRow[], isLoading: false }; }
export function useCreateTimesheet() { return noopMut; }
export function useSubmitTimesheet() { return noopMut; }
export function useApproveTimesheet() { return noopMut; }
export function useRejectTimesheet() { return noopMut; }
