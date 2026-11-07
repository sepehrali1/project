export interface Category {
  id: string;
  name: string;
  description: string;
  icon: "sprout" | "zap" | "eye" | "swords" | "map-pin" | "layout" | "wrench" | "boxes";
  gradient: string;
}

export interface StatsData {
  users: number;
  scripts: number;
  views: number;
  likes: number;
  by_category: Record<string, number>;
}