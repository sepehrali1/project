const PRODUCTION_ORIGIN = "https://sepehrali1-project-i-cc8b.bolt.host";

const isAllowedOrigin = (origin: string): boolean => {
  if (origin === PRODUCTION_ORIGIN) return true;
  if (/^https:\/\/[a-z0-9-]+\.bolt\.host$/.test(origin)) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
};

export const corsHeadersFor = (req: Request): Record<string, string> => {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
};

export const jsonResponse = (
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
