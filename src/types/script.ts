export type ScriptStatus = "pending" | "approved" | "rejected";

export interface ScriptAuthor {
  id: string;
  username: string;
  verified: boolean;
}

export interface ScriptItem {
  id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  image_url: string | null;
  likes_count: number;
  views_count: number;
  status: ScriptStatus;
  pending: boolean;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  author: ScriptAuthor;
  liked_by_me: boolean;
  is_mine: boolean;
}

export interface ScriptListResponse {
  items: ScriptItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ScriptResponse {
  script: ScriptItem;
}

export interface MineScriptsResponse {
  items: ScriptItem[];
}

export interface CommentItem {
  id: string;
  content: string;
  is_hidden: boolean;
  created_at: string;
  author: ScriptAuthor;
  is_mine: boolean;
}

export interface CommentsResponse {
  comments: CommentItem[];
}

export interface CommentResponse {
  comment: CommentItem;
}
