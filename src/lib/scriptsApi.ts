import { supabase } from "./supabase";
import type {
  CommentItem,
  CommentResponse,
  CommentsResponse,
  MineScriptsResponse,
  ScriptItem,
  ScriptListResponse,
  ScriptResponse,
  ScriptStatus,
} from "../types/script";
import type { StatsData } from "../types";

export const THUMBNAIL_BUCKET = "thumbnails";
export const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;
export const THUMBNAIL_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const AUTHOR_EMBED = "author:profiles!author_id(id, username, verified)";
const SCRIPT_COLUMNS =
  "id, title, description, code, category, image_url, status, rejection_reason, likes_count, views_count, created_at, updated_at, author_id";
const SCRIPT_SELECT: string = `${SCRIPT_COLUMNS}, ${AUTHOR_EMBED}`;
const COMMENT_SELECT: string = `id, body, is_hidden, created_at, author_id, ${AUTHOR_EMBED}`;

interface AuthorRow {
  id: string;
  username: string;
  verified: boolean;
}

interface ScriptRow {
  id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  image_url: string | null;
  status: ScriptStatus;
  rejection_reason: string | null;
  likes_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  author_id: string;
  author: AuthorRow | null;
}

interface CommentRow {
  id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
  author_id: string;
  author: AuthorRow | null;
}

const DELETED_AUTHOR: AuthorRow = { id: "", username: "کاربر حذف‌شده", verified: false };

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function likedSet(userId: string | null, scriptIds: string[]): Promise<Set<string>> {
  if (!userId || scriptIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("script_likes")
    .select("script_id")
    .eq("user_id", userId)
    .in("script_id", scriptIds);
  if (error) throw error;
  return new Set((data ?? []).map((row: { script_id: string }) => row.script_id));
}

function toScriptItem(row: ScriptRow, userId: string | null, liked: Set<string>): ScriptItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    code: row.code,
    category: row.category,
    image_url: row.image_url,
    likes_count: row.likes_count,
    views_count: row.views_count,
    status: row.status,
    pending: row.status === "pending",
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: row.author ?? DELETED_AUTHOR,
    liked_by_me: liked.has(row.id),
    is_mine: userId !== null && row.author_id === userId,
  };
}

/** Removes characters that could break the PostgREST `or()` filter or act as LIKE wildcards. */
function sanitizeSearch(term: string): string {
  return term.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function fetchScripts(params: {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}): Promise<ScriptListResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 12));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("scripts")
    .select(SCRIPT_SELECT, { count: "exact" })
    .eq("status", "approved");

  if (params.category) query = query.eq("category", params.category);

  const term = sanitizeSearch(params.search ?? "");
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);

  if (params.sort === "trending") {
    query = query.order("likes_count", { ascending: false }).order("views_count", { ascending: false });
  } else if (params.sort === "views") {
    query = query.order("views_count", { ascending: false });
  }
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as ScriptRow[];
  const userId = await currentUserId();
  const liked = await likedSet(userId, rows.map((r) => r.id));
  const total = count ?? rows.length;

  return {
    items: rows.map((r) => toScriptItem(r, userId, liked)),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function fetchScript(id: string): Promise<ScriptResponse> {
  const { data, error } = await supabase.from("scripts").select(SCRIPT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("اسکریپت یافت نشد");
  const row = data as unknown as ScriptRow;
  const userId = await currentUserId();
  const liked = await likedSet(userId, [row.id]);
  return { script: toScriptItem(row, userId, liked) };
}

export async function fetchMyScripts(): Promise<MineScriptsResponse> {
  const userId = await currentUserId();
  if (!userId) throw new Error("برای مشاهده اسکریپت‌ها وارد شوید");
  const { data, error } = await supabase
    .from("scripts")
    .select(SCRIPT_SELECT)
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as ScriptRow[];
  return { items: rows.map((r) => toScriptItem(r, userId, new Set())) };
}

export interface ScriptInput {
  title: string;
  description: string;
  code: string;
  category: string;
  image_url: string | null;
}

export async function uploadThumbnail(file: File, userId: string): Promise<string> {
  const extension = THUMBNAIL_TYPES[file.type];
  if (!extension) throw new Error("فقط تصویر PNG، JPG یا WEBP مجاز است.");
  if (file.size > THUMBNAIL_MAX_BYTES) throw new Error("حجم تصویر باید کمتر از ۲ مگابایت باشد.");
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (error) throw error;
  return supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Deletes an uploaded thumbnail when it belongs to our bucket (used to drop unused uploads). */
export async function removeThumbnailByUrl(url: string | null): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${THUMBNAIL_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  await supabase.storage.from(THUMBNAIL_BUCKET).remove([url.slice(index + marker.length)]);
}

export async function createScript(payload: ScriptInput): Promise<ScriptResponse> {
  const { data, error } = await supabase
    .from("scripts")
    .insert({
      title: payload.title.trim(),
      description: payload.description.trim(),
      code: payload.code,
      category: payload.category,
      image_url: payload.image_url,
    })
    .select(SCRIPT_SELECT)
    .single();
  if (error) throw error;
  const userId = await currentUserId();
  return { script: toScriptItem(data as unknown as ScriptRow, userId, new Set()) };
}

export async function updateScript(id: string, payload: ScriptInput): Promise<ScriptResponse> {
  const { data, error } = await supabase
    .from("scripts")
    .update({
      title: payload.title.trim(),
      description: payload.description.trim(),
      code: payload.code,
      category: payload.category,
      image_url: payload.image_url,
    })
    .eq("id", id)
    .select(SCRIPT_SELECT)
    .single();
  if (error) throw error;
  const userId = await currentUserId();
  return { script: toScriptItem(data as unknown as ScriptRow, userId, new Set()) };
}

export async function deleteScript(id: string): Promise<void> {
  const { error } = await supabase.from("scripts").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleLike(id: string): Promise<{ liked: boolean; likes_count: number }> {
  const { data, error } = await supabase.rpc("toggle_script_like", { p_script_id: id });
  if (error) throw error;
  return data as { liked: boolean; likes_count: number };
}

export async function recordView(id: string): Promise<number | null> {
  const key = `ssblox_viewed_${id}`;
  if (sessionStorage.getItem(key)) return null;
  sessionStorage.setItem(key, "1");
  const { data, error } = await supabase.rpc("record_script_view", { p_script_id: id });
  if (error) return null;
  return typeof data === "number" ? data : null;
}

export async function approveScript(id: string): Promise<void> {
  const { error } = await supabase.rpc("approve_script", { p_script_id: id });
  if (error) throw error;
}

function toCommentItem(row: CommentRow, userId: string | null): CommentItem {
  return {
    id: row.id,
    content: row.body,
    is_hidden: row.is_hidden,
    created_at: row.created_at,
    author: row.author ?? DELETED_AUTHOR,
    is_mine: userId !== null && row.author_id === userId,
  };
}

export async function fetchComments(id: string): Promise<CommentsResponse> {
  const { data, error } = await supabase
    .from("script_comments")
    .select(COMMENT_SELECT)
    .eq("script_id", id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const userId = await currentUserId();
  return { comments: ((data ?? []) as unknown as CommentRow[]).map((r) => toCommentItem(r, userId)) };
}

export async function postComment(id: string, content: string): Promise<CommentResponse> {
  const body = content.trim();
  if (!body) throw new Error("متن نظر خالی است");
  if (body.length > 1000) throw new Error("نظر نباید بیشتر از ۱۰۰۰ کاراکتر باشد");
  const { data, error } = await supabase
    .from("script_comments")
    .insert({ script_id: id, body })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  const userId = await currentUserId();
  return { comment: toCommentItem(data as unknown as CommentRow, userId) };
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("script_comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function reportTarget(input: {
  scriptId?: string;
  commentId?: string;
  reason: string;
  details: string;
}): Promise<void> {
  const { error } = await supabase.rpc("create_report", {
    p_script_id: input.scriptId ?? null,
    p_comment_id: input.commentId ?? null,
    p_reason: input.reason,
    p_details: input.details,
  });
  if (error) throw error;
}

export async function fetchStats(): Promise<StatsData> {
  const { data, error } = await supabase.rpc("site_stats");
  if (error) throw error;
  const stats = data as Partial<StatsData> | null;
  return {
    users: Number(stats?.users ?? 0),
    scripts: Number(stats?.scripts ?? 0),
    views: Number(stats?.views ?? 0),
    likes: Number(stats?.likes ?? 0),
    by_category: (stats?.by_category as Record<string, number> | undefined) ?? {},
  };
}
