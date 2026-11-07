import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  "https://uusqaionrmbnanztoxco.supabase.co";

export const SUPABASE_ANON_KEY =
  "sb_publishable_vp1lupt6hDJ_p0Wj7wu7jw_nLfhcgyA";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);