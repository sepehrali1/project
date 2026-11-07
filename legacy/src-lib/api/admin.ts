import { supabase } from '@/lib/supabase';
import type { ActivityLog, AdminComment, AdminUser, ScriptDetail } from '@/lib/types';

const SCRIPT_REVIEW_SELECT =
  '*, author:profiles!author_id(id, username, display_name, is_verified)';

export async function fetchPendingScripts(): Promise<ScriptDetail[]> {
  const { data, error } = await supabase
    .from('scripts')
    .select(SCRIPT_REVIEW_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScriptDetail[];
}

export async function approveScript(scriptId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_script', { p_script_id: scriptId });
  if (error) throw error;
}

export async function rejectScript(scriptId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_script', { p_script_id: scriptId, p_reason: reason });
  if (error) throw error;
}

export interface ModerationCounts {
  pendingScripts: number;
  openReports: number;
  approvedScripts: number;
  members: number;
}

export async function fetchModerationCounts(): Promise<ModerationCounts> {
  const [pending, reports, approved, members] = await Promise.all([
    supabase.from('scripts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('script_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('scripts').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);
  const failed = [pending, reports, approved, members].find((result) => result.error);
  if (failed?.error) throw failed.error;
  return {
    pendingScripts: pending.count ?? 0,
    openReports: reports.count ?? 0,
    approvedScripts: approved.count ?? 0,
    members: members.count ?? 0,
  };
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

export async function setUserVerified(userId: string, verified: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_user_verified', { p_user_id: userId, p_verified: verified });
  if (error) throw error;
}

export async function warnUser(userId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('warn_user', { p_user_id: userId, p_reason: reason });
  if (error) throw error;
}

export async function setUserBanned(userId: string, banned: boolean, reason: string): Promise<void> {
  const { error } = await supabase.rpc('set_user_banned', {
    p_user_id: userId,
    p_banned: banned,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function fetchRecentComments(): Promise<AdminComment[]> {
  const { data, error } = await supabase
    .from('script_comments')
    .select('id, body, is_hidden, created_at, author:profiles!author_id(username), script:scripts!script_id(id, title)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as AdminComment[];
}

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, target_type, target_id, details, created_at, actor:profiles!actor_id(username)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}
