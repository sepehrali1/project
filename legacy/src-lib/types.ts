export type Role = 'owner' | 'member';
export type ScriptStatus = 'pending' | 'approved' | 'rejected';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface PublicAuthor {
  id: string;
  username: string;
  display_name: string;
  is_verified: boolean;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  role: Role;
  is_verified: boolean;
  is_banned: boolean;
  created_at: string;
}

export interface ScriptSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  status: ScriptStatus;
  likes_count: number;
  views_count: number;
  created_at: string;
  author: PublicAuthor | null;
}

export interface ScriptDetail extends ScriptSummary {
  author_id: string;
  information: string;
  code: string;
  rejection_reason: string | null;
  updated_at: string;
}

export interface ScriptComment {
  id: string;
  script_id: string;
  author_id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
  author: PublicAuthor | null;
}

export interface ReportRow {
  id: string;
  reason: string;
  details: string;
  status: ReportStatus;
  created_at: string;
  script_id: string | null;
  comment_id: string | null;
  reporter: { username: string } | null;
  script: { id: string; title: string } | null;
  comment: { id: string; body: string; script_id: string } | null;
}

export interface ActivityLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
  actor: { username: string } | null;
}

export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  is_verified: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  warning_count: number;
  created_at: string;
}

export interface AdminComment {
  id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
  author: { username: string } | null;
  script: { id: string; title: string } | null;
}
