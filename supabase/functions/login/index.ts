import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor, jsonResponse as json } from "../_shared/http.ts";

const INVALID_CREDENTIALS = "نام کاربری / ایمیل یا رمز عبور اشتباه است.";

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400, corsHeaders);
    }

    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!identifier || !password) {
      return json(
        {
          error: "نام کاربری یا ایمیل و رمز عبور الزامی است.",
          fields: { identifier: "نام کاربری یا ایمیل را وارد کنید.", password: "رمز عبور را وارد کنید." },
        },
        400,
        corsHeaders,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing Supabase environment configuration");
      return json({ error: "ورود موقتاً در دسترس نیست." }, 500, corsHeaders);
    }

    const auth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let email: string;
    if (identifier.includes("@")) {
      email = identifier.toLowerCase();
    } else {
      const { data: profile, error: lookupError } = await admin
        .from("profiles")
        .select("id")
        .eq("username", identifier.toLowerCase())
        .maybeSingle();
      if (lookupError) {
        console.error("Username lookup failed", lookupError.code);
        return json({ error: INVALID_CREDENTIALS }, 401, corsHeaders);
      }
      if (!profile) {
        return json({ error: INVALID_CREDENTIALS }, 401, corsHeaders);
      }
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.id);
      if (authUserError || !authUser.user?.email) {
        return json({ error: INVALID_CREDENTIALS }, 401, corsHeaders);
      }
      email = authUser.user.email;
    }

    const { data, error } = await auth.auth.signInWithPassword({ email, password });

    if (error || !data.user || !data.session) {
      if (error?.code === "email_not_confirmed") {
        return json({ error: "ایمیل شما هنوز تأیید نشده است. لینک ارسال‌شده را بزنید." }, 403, corsHeaders);
      }
      return json({ error: INVALID_CREDENTIALS }, 401, corsHeaders);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, username, role, verified, banned, ban_reason, created_at")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return json({ error: "پروفایل کاربر پیدا نشد." }, 404, corsHeaders);
    }

    if (profile.banned) {
      await admin.auth.admin.signOut(data.session.access_token).catch(() => undefined);
      const reason = profile.ban_reason ? ` دلیل: ${profile.ban_reason}` : "";
      return json({ error: `حساب شما مسدود شده است.${reason}` }, 403, corsHeaders);
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
      corsHeaders,
    );
  } catch (error) {
    console.error("Login failed:", error);
    return json({ error: "خطای داخلی سرور" }, 500, corsHeaders);
  }
});

