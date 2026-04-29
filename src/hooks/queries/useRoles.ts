import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Role {
  id: string;
  client_id: string;
  name: string;
  is_system: boolean;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleFeature {
  role_id: string;
  feature_key: string;
  people_enabled: boolean;
}

export interface RoleMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  department: string | null;
  designation: string | null;
  emp_id: string;
}

export interface RoleWithRelations extends Role {
  employees: RoleMember[];
  role_features: RoleFeature[];
}

const ROLES_KEY = (clientId: string | null) => ["roles", clientId];
const ROLE_FEATURES_KEY = (roleId: string | null) => ["role_features", roleId];

export function useRoles(clientId: string | null) {
  return useQuery({
    queryKey: ROLES_KEY(clientId),
    enabled: !!clientId,
    queryFn: async (): Promise<RoleWithRelations[]> => {
      const { data, error } = await supabase
        .from("roles")
        .select(`
          id, client_id, name, is_system, description, color, created_at, updated_at,
          employees:employees!role_id ( id, first_name, last_name, avatar_url, department, designation, emp_id ),
          role_features ( role_id, feature_key, people_enabled )
        `)
        .eq("client_id", clientId!)
        .order("is_system", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as RoleWithRelations[];
    },
  });
}

export function useRoleFeatures(roleId: string | null) {
  return useQuery({
    queryKey: ROLE_FEATURES_KEY(roleId),
    enabled: !!roleId,
    queryFn: async (): Promise<RoleFeature[]> => {
      const { data, error } = await supabase
        .from("role_features")
        .select("role_id, feature_key, people_enabled")
        .eq("role_id", roleId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; name: string; description?: string; color?: string }): Promise<Role> => {
      const { data, error } = await supabase
        .from("roles")
        .insert({
          client_id: input.client_id,
          name: input.name.trim(),
          description: input.description ?? null,
          color: input.color ?? "#6c5ce7",
          is_system: false,
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("A role with this name already exists.");
        throw error;
      }
      return data as Role;
    },
    onSuccess: (role) => {
      qc.invalidateQueries({ queryKey: ["roles", role.client_id] });
      toast.success(`Role "${role.name}" created`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; client_id: string; name?: string; description?: string; color?: string }): Promise<Role> => {
      const patch: { name?: string; description?: string | null; color?: string } = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.description !== undefined) patch.description = input.description;
      if (input.color !== undefined) patch.color = input.color;
      const { data, error } = await supabase
        .from("roles")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("A role with this name already exists.");
        throw error;
      }
      return data as Role;
    },
    onSuccess: (role) => {
      qc.invalidateQueries({ queryKey: ["roles", role.client_id] });
      toast.success("Role updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; client_id: string; reassignToRoleId: string | null }) => {
      // Move all members of the deleted role to the fallback role (or NULL).
      const { error: moveErr } = await supabase
        .from("employees")
        .update({ role_id: input.reassignToRoleId })
        .eq("role_id", input.id);
      if (moveErr) throw moveErr;

      const { error } = await supabase.from("roles").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["roles", vars.client_id] });
      toast.success("Role deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSetRoleFeatures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      role_id: string;
      client_id: string;
      // Final desired state — all enabled features with their people flag.
      features: { feature_key: string; people_enabled: boolean }[];
    }) => {
      // Replace strategy: delete then insert. Atomic enough for admin UX.
      const { error: delErr } = await supabase
        .from("role_features")
        .delete()
        .eq("role_id", input.role_id);
      if (delErr) throw delErr;

      if (input.features.length > 0) {
        const rows = input.features.map((f) => ({
          role_id: input.role_id,
          feature_key: f.feature_key,
          people_enabled: f.people_enabled,
        }));
        const { error } = await supabase.from("role_features").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["roles", vars.client_id] });
      qc.invalidateQueries({ queryKey: ROLE_FEATURES_KEY(vars.role_id) });
      toast.success("Permissions saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAssignEmployeeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { employee_id: string; role_id: string | null; client_id: string }) => {
      const { error } = await supabase
        .from("employees")
        .update({ role_id: input.role_id })
        .eq("id", input.employee_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["roles", vars.client_id] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
