import { supabase } from "./supabase";
import type { UserRole } from "../types/auth";

export interface LeaderboardEntry {
  rank: number;
  username: string;
  display_name: string;
  role: UserRole;
  verified: boolean;
  scripts_count: number;
  likes_count: number;
  views_count: number;
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("leaderboard_top_authors", { p_limit: limit });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("Unexpected leaderboard response");
  return data as LeaderboardEntry[];
}
