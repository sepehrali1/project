import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authorization.slice(7);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment configuration");
      return json({ error: "Server misconfigured" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validates the JWT against Supabase Auth (signature, expiry, revocation).
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ error: "نشست شما منقضی شده است." }, 401);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, username, role, verified, banned, created_at")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return json({ error: "پروفایل کاربر پیدا نشد." }, 404);
    }

    return json(
      {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username: profile.username,
          role: profile.role,
          verified: profile.verified,
          banned: profile.banned,
          created_at: profile.created_at,
        },
      },
      200,
    );
  } catch (error) {
    console.error("Me function failed:", error);
    return json({ error: "خطای داخلی سرور" }, 500);
  }
});
