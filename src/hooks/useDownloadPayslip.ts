/**
 * Stub — payslip PDF generation isn't yet implemented in the NestJS
 * Payroll module. Restore by adding a /payslips/:id/pdf endpoint that
 * generates via pdf-lib and uploads through StorageService.
 */
export function useDownloadPayslip() {
  return {
    mutate: () =>
      console.warn(
        "[useDownloadPayslip] PDF generation not implemented yet on the backend.",
      ),
    mutateAsync: async () => undefined,
    isPending: false,
  };
}
