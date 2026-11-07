import { supabase } from "./supabase";

export interface OwnProfile {
  display_name: string;
  bio: string;
}

export interface MyStats {
  scripts: number;
  likes: number;
  comments: number;
}

export async function fetchOwnProfile(userId: string): Promise<OwnProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, bio")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return { display_name: data?.display_name ?? "", bio: data?.bio ?? "" };
}

export async function updateOwnProfile(userId: string, values: OwnProfile): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: values.display_name.trim(), bio: values.bio.trim() })
    .eq("id", userId);
  if (error) throw error;
}

export async function fetchMyStats(): Promise<MyStats> {
  const { data, error } = await supabase.rpc("my_stats");
  if (error) throw error;
  const s = data as Partial<MyStats> | null;
  return { scripts: Number(s?.scripts ?? 0), likes: Number(s?.likes ?? 0), comments: Number(s?.comments ?? 0) };
}
