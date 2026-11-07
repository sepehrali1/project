import { supabase } from '@/lib/supabase';
import type { ReportRow, ReportStatus, ScriptComment } from '@/lib/types';

const COMMENT_SELECT =
  'id, script_id, author_id, body, is_hidden, created_at, author:profiles!author_id(id, username, display_name, is_verified)';

const REPORT_SELECT =
  'id, reason, details, status, created_at, script_id, comment_id, reporter:profiles!reporter_id(username), script:scripts!script_id(id, title), comment:script_comments!comment_id(id, body, script_id)';

export async function fetchComments(scriptId: string): Promise<ScriptComment[]> {
  const { data, error } = await supabase
    .from('script_comments')
    .select(COMMENT_SELECT)
    .eq('script_id', scriptId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScriptComment[];
}

export async function addComment(scriptId: string, body: string): Promise<void> {
  const { error } = await supabase.from('script_comments').insert({ script_id: scriptId, body });
  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('script_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function setCommentHidden(commentId: string, hidden: boolean): Promise<void> {
  const { error } = await supabase.rpc('moderate_comment', { p_comment_id: commentId, p_hidden: hidden });
  if (error) throw error;
}

export interface ReportInput {
  scriptId?: string;
  commentId?: string;
  reason: string;
  details: string;
}

export async function createReport(input: ReportInput): Promise<void> {
  const { error } = await supabase.from('script_reports').insert({
    script_id: input.scriptId ?? null,
    comment_id: input.commentId ?? null,
    reason: input.reason,
    details: input.details,
  });
  if (error) throw error;
}

export async function fetchReports(status: ReportStatus): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from('script_reports')
    .select(REPORT_SELECT)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

export async function resolveReport(reportId: string, decision: 'dismiss' | 'action'): Promise<void> {
  const { error } = await supabase.rpc('resolve_report', { p_report_id: reportId, p_decision: decision });
  if (error) throw error;
}
