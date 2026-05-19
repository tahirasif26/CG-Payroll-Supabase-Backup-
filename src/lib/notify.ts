/**
 * Notification dispatcher. Notifications are now created server-side from
 * domain actions. These exports are kept as no-ops so legacy callers compile.
 */

export interface NotifyInput {
  userId: string;
  title: string;
  body?: string;
  category: string;
  link?: string;
  severity?: "info" | "warning" | "urgent";
  entityType?: string;
  entityId?: string;
}

export async function notifyUser(_input: NotifyInput): Promise<void> {}
export async function notifyClientAdmins(_input: Omit<NotifyInput, "userId">): Promise<void> {}

/** Stub — used to be a Supabase lookup. Returns null; pages must use their
 *  own resolution (e.g. `useEmployee(id).data.user_id`) until ported. */
export async function getEmployeeUserId(_employeeId: string): Promise<string | null> {
  return null;
}
