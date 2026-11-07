import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "./supabase";

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

interface CallOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** send the current user's access token (default true when a session exists) */
  authenticated?: boolean;
}

/** Calls a Supabase Edge Function (register / login / me). */
export async function callFunction<T>(name: string, options: CallOptions = {}): Promise<T> {
  const { method = "POST", body, authenticated = true } = options;

  let token = SUPABASE_ANON_KEY as string;
  if (authenticated) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) token = data.session.access_token;
  }

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید.", 0);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const err = data as { error?: string; fields?: Record<string, string> } | null;
    throw new ApiError(err?.error ?? "خطای ناشناخته رخ داد", response.status, err?.fields);
  }

  return data as T;
}

const KNOWN_ERRORS: Record<string, string> = {
  not_allowed: "اجازه‌ی انجام این کار را ندارید.",
  script_not_found: "اسکریپت پیدا نشد.",
  comment_not_found: "نظر پیدا نشد.",
  report_not_found: "گزارش پیدا نشد یا قبلاً رسیدگی شده است.",
  user_not_found: "کاربر پیدا نشد.",
  already_reported: "شما قبلاً این مورد را گزارش کرده‌اید.",
  invalid_target: "این مورد قابل گزارش نیست.",
  reason_required: "دلیل را بنویسید (حداقل ۳ کاراکتر).",
  cannot_change_self: "نمی‌توانید نقش خودتان را تغییر دهید.",
  invalid_role: "نقش نامعتبر است.",
};

/** Turns Supabase / PostgREST errors into a readable Persian message. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  const e = err as { message?: string; code?: string; details?: string } | null;
  const message = e?.message ?? "";
  for (const key of Object.keys(KNOWN_ERRORS)) {
    if (message.includes(key)) return KNOWN_ERRORS[key];
  }
  if (e?.code === "42501" || message.includes("row-level security")) {
    return "اجازه‌ی انجام این کار را ندارید.";
  }
  if (e?.code === "23514") return "اطلاعات واردشده معتبر نیست. طول و فرمت فیلدها را بررسی کنید.";
  if (e?.code === "PGRST301" || message.toLowerCase().includes("jwt")) {
    return "نشست شما منقضی شده است. دوباره وارد شوید.";
  }
  if (message.toLowerCase().includes("failed to fetch")) {
    return "ارتباط با سرور برقرار نشد.";
  }
  return message || "خطا";
}
