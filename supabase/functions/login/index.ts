import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400);
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return json({ error: "ایمیل و رمز عبور الزامی است." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing Supabase environment configuration");
      return json({ error: "ورود موقتاً در دسترس نیست." }, 500);
    }

    const auth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await auth.auth.signInWithPassword({ email, password });

    if (error || !data.user || !data.session) {
      if (error?.code === "email_not_confirmed") {
        return json({ error: "ایمیل شما هنوز تأیید نشده است. لینک ارسال‌شده را بزنید." }, 403);
      }
      return json({ error: "ایمیل یا رمز عبور اشتباه است." }, 401);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, username, role, verified, banned, ban_reason, created_at")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return json({ error: "پروفایل کاربر پیدا نشد." }, 404);
    }

    if (profile.banned) {
      await admin.auth.admin.signOut(data.session.access_token).catch(() => undefined);
      return json({ error: "حساب شما مسدود شده است." + (profile.ban_reason ? " دلیل: " + profile.ban_reason : "") }, 403);
    }

    return json(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        user: {
          id: data.user.id,
          email: data.user.email,
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
    console.error("Login failed:", error);
    return json({ error: "خطای داخلی سرور" }, 500);
  }
});
