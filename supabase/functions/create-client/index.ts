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

    // Verify caller is super_admin
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

    // Verify super_admin role
    const { data: callerData, error: callerError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "super_admin")
      .single();

    if (callerError || !callerData) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    const body = await req.json();
    const {
      company_name,
      company_slug,
      company_email,
      company_phone,
      country,
      timezone = "Asia/Riyadh",
      base_currency = "SAR",
      admin_email,
      admin_full_name,
    } = body;

    // Validate required fields
    if (!company_name || company_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Company name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!company_slug || !/^[a-z0-9-]+$/.test(company_slug)) {
      return new Response(JSON.stringify({ error: "Valid company slug is required (lowercase, hyphenated)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!admin_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email)) {
      return new Response(JSON.stringify({ error: "Valid admin email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!admin_full_name || admin_full_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Admin full name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if slug is already taken
    const { data: existingClient } = await adminClient
      .from("clients")
      .select("id")
      .eq("company_slug", company_slug.toLowerCase())
      .single();

    if (existingClient) {
      return new Response(JSON.stringify({ error: "Company slug is already taken" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the client company
    const { data: clientData, error: clientError } = await adminClient
      .from("clients")
      .insert({
        company_name: company_name.trim(),
        company_slug: company_slug.toLowerCase(),
        company_email: company_email || null,
        company_phone: company_phone || null,
        country: country || null,
        timezone,
        base_currency,
        status: "trial",
        subscription_plan: "starter",
        created_by: callerId,
      })
      .select()
      .single();

    if (clientError || !clientData) {
      console.error("Client creation error:", clientError);
      return new Response(JSON.stringify({ error: "Failed to create client company" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = clientData.id;

    // Get origin for redirect
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";

    // Invite the initial admin user
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(admin_email, {
      redirectTo: `${origin}/reset-password`,
      data: {
        full_name: admin_full_name.trim(),
        employee_id: "ADMIN001",
      },
    });

    if (inviteError) {
      // Rollback client creation by deleting
      await adminClient.from("clients").delete().eq("id", clientId);
      return new Response(JSON.stringify({ error: `Failed to invite admin: ${inviteError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminUserId = inviteData.user.id;

    // Assign admin role with client_id
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: adminUserId,
      role: "admin",
      client_id: clientId,
    });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    // Update profile with client_id
    await adminClient
      .from("profiles")
      .update({ client_id: clientId })
      .eq("id", adminUserId);

    return new Response(JSON.stringify({
      success: true,
      client: {
        id: clientId,
        company_name: company_name.trim(),
        company_slug: company_slug.toLowerCase(),
      },
      admin: {
        user_id: adminUserId,
        email: admin_email,
      },
    }), {
      status: 201,
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
