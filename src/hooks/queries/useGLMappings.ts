/** Stub — GL mappings table not yet on NestJS. */
export interface GLMappingRow {
  id: string;
  client_id: string;
  entry_name: string;
  gl_code: string;
}
export function useGLMappings() { return { data: [] as GLMappingRow[], isLoading: false }; }
export function useSaveGLMappings() {
  return {
    mutate: () => console.warn("[useGLMappings] not yet on NestJS"),
    mutateAsync: async () => undefined,
    isPending: false,
  };
}
