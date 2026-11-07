import { THUMBNAIL_EXTENSIONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { ScriptDetail, ScriptSummary } from '@/lib/types';

const SCRIPT_SUMMARY_SELECT =
  'id, title, description, category, thumbnail_url, status, likes_count, views_count, created_at, author:profiles!author_id(id, username, display_name, is_verified)';

const SCRIPT_DETAIL_SELECT =
  '*, author:profiles!author_id(id, username, display_name, is_verified)';

const THUMBNAIL_BUCKET = 'thumbnails';

export type ScriptSort = 'newest' | 'likes' | 'views';

export interface ScriptFilters {
  query: string;
  category: string;
  sort: ScriptSort;
}

export async function fetchApprovedScripts(filters: ScriptFilters): Promise<ScriptSummary[]> {
  const term = filters.query.trim().replace(/[^\p{L}\p{N}\s]/gu, '').slice(0, 60);
  let request = supabase.from('scripts').select(SCRIPT_SUMMARY_SELECT).eq('status', 'approved');

  if (filters.category !== 'all') {
    request = request.eq('category', filters.category);
  }
  if (term) {
    request = request.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const orderColumn =
    filters.sort === 'likes' ? 'likes_count' : filters.sort === 'views' ? 'views_count' : 'created_at';
  const { data, error } = await request.order(orderColumn, { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []) as ScriptSummary[];
}

export async function fetchScriptById(scriptId: string): Promise<ScriptDetail | null> {
  const { data, error } = await supabase
    .from('scripts')
    .select(SCRIPT_DETAIL_SELECT)
    .eq('id', scriptId)
    .maybeSingle();
  if (error) throw error;
  return data as ScriptDetail | null;
}

export async function fetchScriptsByAuthor(authorId: string): Promise<ScriptSummary[]> {
  const { data, error } = await supabase
    .from('scripts')
    .select(SCRIPT_SUMMARY_SELECT)
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ScriptSummary[];
}

export interface NewScriptInput {
  title: string;
  description: string;
  information: string;
  code: string;
  category: string;
  thumbnail: File | null;
}

export async function createScript(input: NewScriptInput, userId: string): Promise<void> {
  let thumbnailUrl: string | null = null;
  let thumbnailPath: string | null = null;

  if (input.thumbnail) {
    const extension = THUMBNAIL_EXTENSIONS[input.thumbnail.type];
    thumbnailPath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(thumbnailPath, input.thumbnail, { contentType: input.thumbnail.type, cacheControl: '3600' });
    if (uploadError) throw uploadError;
    thumbnailUrl = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(thumbnailPath).data.publicUrl;
  }

  const { error } = await supabase.from('scripts').insert({
    title: input.title,
    description: input.description,
    information: input.information,
    code: input.code,
    category: input.category,
    thumbnail_url: thumbnailUrl,
  });

  if (error) {
    if (thumbnailPath) {
      await supabase.storage.from(THUMBNAIL_BUCKET).remove([thumbnailPath]);
    }
    throw error;
  }
}

export async function deleteScript(scriptId: string): Promise<void> {
  const { error } = await supabase.from('scripts').delete().eq('id', scriptId);
  if (error) throw error;
}

export async function fetchMyLike(scriptId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('script_likes')
    .select('script_id')
    .eq('script_id', scriptId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function toggleScriptLike(scriptId: string): Promise<{ liked: boolean; likes_count: number }> {
  const { data, error } = await supabase.rpc('toggle_script_like', { p_script_id: scriptId });
  if (error) throw error;
  return data as { liked: boolean; likes_count: number };
}

export async function recordScriptView(scriptId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('record_script_view', { p_script_id: scriptId });
  if (error) throw error;
  return typeof data === 'number' ? data : null;
}
