/*
  One-off migration: legacy Express JSON database -> Supabase.

  Usage (run on YOUR machine, never in the browser):
    SUPABASE_URL=https://xxxx.supabase.co \
    SUPABASE_SERVICE_ROLE_KEY=... \
    node scripts/migrate-legacy-json.mjs legacy/server/data/db.json [--dry-run]

  - Users are created through the Auth admin API with their existing bcrypt hash
    (password_hash), so people keep their passwords. Roles/verified/banned are copied.
  - Scripts, comments, likes are re-linked to the new user ids. Re-running skips existing emails.
  - Requires the SQL migrations to be applied first. Needs @supabase/supabase-js (already a dependency).
  - NOT TESTED against a live project (no network in the environment this was written in).
*/
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const [, , file, flag] = process.argv;
const dryRun = flag === "--dry-run";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!file || !url || !key) {
  console.error("Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-legacy-json.mjs <db.json> [--dry-run]");
  process.exit(1);
}

const db = JSON.parse(await readFile(file, "utf8"));
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const idMap = new Map(); // old id -> new id

const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const byEmail = new Map((existing?.users ?? []).map((u) => [u.email?.toLowerCase(), u.id]));

for (const u of db.users ?? []) {
  const email = u.email.toLowerCase();
  const username = String(u.username).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20).padEnd(3, "_");
  console.log(`user ${email} (${username}) role=${u.role}`);
  if (dryRun) continue;

  let newId = byEmail.get(email);
  if (!newId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password_hash: u.password_hash,
      email_confirm: true,
    });
    if (error) { console.error("  create failed:", error.message); continue; }
    newId = data.user.id;
  }
  idMap.set(u.id, newId);

  const { error } = await admin.from("profiles").upsert(
    { id: newId, username, role: u.role, verified: !!u.verified, banned: !!u.banned, created_at: u.created_at },
    { onConflict: "id" },
  );
  if (error) console.error("  profile failed:", error.message);
}

for (const s of db.scripts ?? []) {
  const author = idMap.get(s.author_id);
  if (!author) continue;
  console.log(`script ${s.title}`);
  if (dryRun) continue;
  const { data, error } = await admin.from("scripts").insert({
    author_id: author, title: s.title, description: s.description, code: s.code,
    category: s.category, image_url: s.image_url, created_at: s.created_at,
  }).select("id").single();
  if (error) { console.error("  failed:", error.message); continue; }
  // trigger forces status by author role; keep the legacy publish state
  await admin.from("scripts").update({ status: s.pending ? "pending" : "approved", views_count: s.views_count ?? 0 }).eq("id", data.id);
  idMap.set("script:" + s.id, data.id);
}

for (const c of db.comments ?? []) {
  const author = idMap.get(c.user_id), script = idMap.get("script:" + c.script_id);
  if (!author || !script || dryRun) continue;
  await admin.from("script_comments").insert({ script_id: script, author_id: author, body: c.content, created_at: c.created_at });
}
for (const l of db.likes ?? []) {
  const user = idMap.get(l.user_id), script = idMap.get("script:" + l.script_id);
  if (!user || !script || dryRun) continue;
  await admin.from("script_likes").upsert({ user_id: user, script_id: script });
}
console.log(dryRun ? "dry run complete" : "migration complete");
