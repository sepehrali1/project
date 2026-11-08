import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = [
  "https://sepehrali1-project-i-cc8b.bolt.host",
  "https://stackblitz.com",
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
};

const json = (
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const encoder = new TextEncoder();

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return json(
      { error: "Request body must be valid JSON" },
      400,
      corsHeaders,
    );
  }

  const input =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  const email =
    typeof input.email === "string"
      ? input.email.trim().toLowerCase()
      : "";

  const username =
    typeof input.username === "string"
      ? input.username.trim().toLowerCase()
      : "";

  const password =
    typeof input.password === "string"
      ? input.password
      : "";

  const fields: Record<string, string> = {};

  if (
    !email ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email)
  ) {
    fields.email = "ایمیل معتبر وارد کنید.";
  }

  if (!USERNAME_PATTERN.test(username)) {
    fields.username =
      "نام کاربری باید ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، عدد یا _ باشد.";
  }

  if (password.length < 8) {
    fields.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  } else if (encoder.encode(password).length > 72) {
    fields.password = "رمز عبور بیش از حد طولانی است.";
  }

  if (Object.keys(fields).length > 0) {
    return json(
      {
        error: Object.values(fields)[0],
        fields,
      },
      400,
      corsHeaders,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase environment configuration");

    return json(
      { error: "ثبت‌نام موقتاً در دسترس نیست." },
      500,
      corsHeaders,
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const {
      data: available,
      error: availabilityError,
    } = await admin.rpc("is_username_available", {
      p_username: username,
    });

    if (availabilityError) {
      console.error(
        "Username availability check failed",
        availabilityError.code,
      );

      return json(
        { error: "بررسی نام کاربری ناموفق بود." },
        500,
        corsHeaders,
      );
    }

    if (available === false) {
      return json(
        {
          error: "این نام کاربری قبلاً گرفته شده است.",
          fields: {
            username: "این نام کاربری قبلاً گرفته شده است.",
          },
        },
        409,
        corsHeaders,
      );
    }

    const requireConfirmation =
      Deno.env.get("REQUIRE_EMAIL_CONFIRMATION") === "true";

    const {
      data: created,
      error: createError,
    } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: !requireConfirmation,
    });

    if (createError || !created?.user) {
      if (createError?.code === "email_exists") {
        return json(
          {
            error: "با این ایمیل قبلاً حساب ساخته شده است.",
            fields: {
              email: "این ایمیل قبلاً ثبت شده است.",
            },
          },
          409,
          corsHeaders,
        );
      }

      console.error(
        "Auth account creation failed",
        createError?.code,
        createError?.message,
      );

      return json(
        { error: "ساخت حساب ناموفق بود. دوباره تلاش کنید." },
        500,
        corsHeaders,
      );
    }

    const userId = created.user.id;

    const {
      data: role,
      error: profileError,
    } = await admin.rpc("register_profile", {
      p_user_id: userId,
      p_username: username,
    });

    if (profileError) {
      const { error: cleanupError } =
        await admin.auth.admin.deleteUser(userId);

      if (cleanupError) {
        console.error(
          "Could not remove auth account after failed registration",
          userId,
          cleanupError.code,
        );
      }

      if (
        profileError.code === "23505" ||
        profileError.message?.includes("username_taken")
      ) {
        return json(
          {
            error: "این نام کاربری قبلاً گرفته شده است.",
            fields: {
              username: "این نام کاربری قبلاً گرفته شده است.",
            },
          },
          409,
          corsHeaders,
        );
      }

      console.error(
        "Profile creation failed",
        profileError.code,
        profileError.message,
      );

      return json(
        { error: "ساخت حساب ناموفق بود. دوباره تلاش کنید." },
        500,
        corsHeaders,
      );
    }

    return json(
      {
        user: {
          id: userId,
          email,
          username,
          role,
        },
        email_confirmation_required: requireConfirmation,
      },
      201,
      corsHeaders,
    );
  } catch (err) {
    console.error("Registration failed", err);

    return json(
      { error: "ساخت حساب ناموفق بود. دوباره تلاش کنید." },
      500,
      corsHeaders,
    );
  }
});