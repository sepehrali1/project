import { supabase } from "./supabase";
import type { UserRole } from "../types/auth";

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  verified: boolean;
  banned: boolean;
  ban_reason: string | null;
  created_at: string;
  scripts_count: number;
  warnings_count: number;
}

export interface PendingScript {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
  author_username: string;
}

export interface ReportItem {
  id: string;
  reason: string;
  details: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  reporter_username: string;
  script_id: string | null;
  comment_id: string | null;
  target_label: string;
}

export interface AdminComment {
  id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
  author_username: string;
  script_id: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  target_type: string;
  details: Record<string, unknown>;
  created_at: string;
  actor_username: string;
}

export interface ModerationCounts {
  pending: number;
  openReports: number;
  users: number;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw error;
  return ((data ?? []) as AdminUser[]).map((u) => ({
    ...u,
    scripts_count: Number(u.scripts_count),
    warnings_count: Number(u.warnings_count),
  }));
}

export async function fetchPendingScripts(): Promise<PendingScript[]> {
  const { data, error } = await supabase
    .from("scripts")
    .select("id, title, description, category, created_at, author:profiles!author_id(username)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  type Row = { id: string; title: string; description: string; category: string; created_at: string; author: { username: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    created_at: r.created_at,
    author_username: r.author?.username ?? "—",
  }));
}

export async function fetchReports(): Promise<ReportItem[]> {
  const { data, error } = await supabase
    .from("script_reports")
    .select(
      "id, reason, details, status, created_at, script_id, comment_id, reporter:profiles!reporter_id(username), script:scripts!script_id(title), comment:script_comments!comment_id(body, script_id)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  type Row = {
    id: string; reason: string; details: string; status: ReportItem["status"]; created_at: string;
    script_id: string | null; comment_id: string | null;
    reporter: { username: string } | null;
    script: { title: string } | null;
    comment: { body: string; script_id: string } | null;
  };
  const order = { open: 0, resolved: 1, dismissed: 2 } as const;
  return ((data ?? []) as unknown as Row[]).sort((a, b) => order[a.status] - order[b.status]).map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    created_at: r.created_at,
    reporter_username: r.reporter?.username ?? "—",
    script_id: r.script_id ?? r.comment?.script_id ?? null,
    comment_id: r.comment_id,
    target_label: r.script_id ? `اسکریپت: ${r.script?.title ?? "—"}` : `نظر: ${(r.comment?.body ?? "حذف‌شده").slice(0, 80)}`,
  }));
}

export async function fetchRecentComments(): Promise<AdminComment[]> {
  const { data, error } = await supabase
    .from("script_comments")
    .select("id, body, is_hidden, created_at, script_id, author:profiles!author_id(username)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  type Row = { id: string; body: string; is_hidden: boolean; created_at: string; script_id: string; author: { username: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    body: r.body,
    is_hidden: r.is_hidden,
    created_at: r.created_at,
    script_id: r.script_id,
    author_username: r.author?.username ?? "—",
  }));
}

export async function fetchActivityLogs(): Promise<ActivityLogItem[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, target_type, details, created_at, actor:profiles!actor_id(username)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  type Row = { id: string; action: string; target_type: string; details: Record<string, unknown>; created_at: string; actor: { username: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    action: r.action,
    target_type: r.target_type,
    details: r.details ?? {},
    created_at: r.created_at,
    actor_username: r.actor?.username ?? "سیستم",
  }));
}

export async function rejectScript(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("reject_script", { p_script_id: id, p_reason: reason });
  if (error) throw error;
}

export async function adminDeleteScript(id: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_script", { p_script_id: id });
  if (error) throw error;
}

export async function setUserBanned(userId: string, banned: boolean, reason: string): Promise<void> {
  const { error } = await supabase.rpc("set_user_banned", { p_user_id: userId, p_banned: banned, p_reason: reason });
  if (error) throw error;
}

export async function warnUser(userId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("warn_user", { p_user_id: userId, p_reason: reason });
  if (error) throw error;
}

export async function setCommentHidden(commentId: string, hidden: boolean): Promise<void> {
  const { error } = await supabase.rpc("moderate_comment", { p_comment_id: commentId, p_hidden: hidden });
  if (error) throw error;
}

export async function resolveReport(reportId: string, decision: "dismiss" | "action"): Promise<void> {
  const { error } = await supabase.rpc("resolve_report", { p_report_id: reportId, p_decision: decision });
  if (error) throw error;
}

export async function setUserVerified(userId: string, verified: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_user_verified", { p_user_id: userId, p_verified: verified });
  if (error) throw error;
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
  if (error) throw error;
}
