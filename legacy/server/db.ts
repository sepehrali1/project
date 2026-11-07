import { promises as fs } from "node:fs";
import path from "node:path";

export type UserRole = "user" | "moderator" | "owner";

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: UserRole;
  verified: boolean;
  banned: boolean;
  created_at: string;
}

export interface Script {
  id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  author_id: string;
  image_url: string | null;
  likes_count: number;
  views_count: number;
  pending: boolean;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  script_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  script_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Report {
  id: string;
  target_type: "script" | "comment" | "user";
  target_id: string;
  reporter_id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
}

export interface Warning {
  id: string;
  user_id: string;
  reason: string;
  issued_by: string;
  created_at: string;
}

export interface Database {
  users: User[];
  scripts: Script[];
  likes: Like[];
  comments: Comment[];
  reports: Report[];
  warnings: Warning[];
}

const DB_PATH = path.join(process.cwd(), "server", "data", "db.json");

let cache: Database | null = null;

const EMPTY_DB: Database = {
  users: [],
  scripts: [],
  likes: [],
  comments: [],
  reports: [],
  warnings: [],
};

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
}

export const db = {
  async load(): Promise<Database> {
    if (cache) return cache;
    await ensureDir();
    try {
      const raw = await fs.readFile(DB_PATH, "utf-8");
      cache = JSON.parse(raw) as Database;
    } catch {
      cache = { ...EMPTY_DB };
      await db.save();
    }
    return cache;
  },

  async save(): Promise<void> {
    if (!cache) return;
    await ensureDir();
    await fs.writeFile(DB_PATH, JSON.stringify(cache, null, 2), "utf-8");
  },
};