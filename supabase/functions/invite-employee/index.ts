import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller and get their client_id
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = user.id;

    // Use service role for DB operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get caller's role and client_id
    const { data: callerData, error: callerError } = await adminClient
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", callerId)
      .in("role", ["admin", "hr", "super_admin"])
      .order("role", { ascending: true }) // admin first
      .limit(1)
      .single();

    if (callerError || !callerData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin, hr, or super_admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Super admins need to provide client_id; admins/hr use their own
    const body = await req.json();
    const { email, full_name, employee_id, role = "employee", client_id: providedClientId } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!full_name || full_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Full name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate role - only admin can assign admin/hr, all can assign employee
    if (!["employee", "hr", "admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role. Must be employee, hr, or admin" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only admins can assign admin/hr roles
    if (role !== "employee" && callerData.role !== "admin" && callerData.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Only admins can assign admin or hr roles" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine client_id
    let targetClientId: string;
    if (callerData.role === "super_admin") {
      if (!providedClientId) {
        return new Response(JSON.stringify({ error: "Super admin must provide client_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetClientId = providedClientId;
    } else {
      targetClientId = callerData.client_id;
      if (!targetClientId) {
        return new Response(JSON.stringify({ error: "Caller has no associated client" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get origin for redirect
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";

    // Invite user
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/reset-password`,
      data: {
        full_name: full_name.trim(),
        employee_id: employee_id || null,
      },
    });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = inviteData.user.id;

    // Insert user_roles with client_id
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: newUserId,
      role: role,
      client_id: targetClientId,
    });

    if (roleError) {
      // Log but don't fail - role might already be assigned by trigger
      console.error("Role assignment error:", roleError);
    }

    // Update profile with client_id
    await adminClient
      .from("profiles")
      .update({ client_id: targetClientId })
      .eq("id", newUserId);

    return new Response(JSON.stringify({
      success: true,
      user_id: newUserId,
      client_id: targetClientId,
      role: role,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
