import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, type Script } from "../db";
import { authenticate, type AuthRequest } from "../middleware/auth";

const router = Router();

interface AuthorInfo {
  id: string;
  username: string;
  verified: boolean;
}

interface PublicScript {
  id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  image_url: string | null;
  likes_count: number;
  views_count: number;
  pending: boolean;
  created_at: string;
  updated_at: string;
  author: AuthorInfo;
  liked_by_me: boolean;
  is_mine: boolean;
}

async function toPublicScript(
  script: Script,
  currentUserId: string | null
): Promise<PublicScript> {
  const database = await db.load();
  const author = database.users.find((u) => u.id === script.author_id);
  const likedByMe = currentUserId
    ? database.likes.some(
        (l) => l.user_id === currentUserId && l.script_id === script.id
      )
    : false;

  return {
    id: script.id,
    title: script.title,
    description: script.description,
    code: script.code,
    category: script.category,
    image_url: script.image_url,
    likes_count: script.likes_count,
    views_count: script.views_count,
    pending: script.pending,
    created_at: script.created_at,
    updated_at: script.updated_at,
    author: {
      id: author?.id ?? "",
      username: author?.username ?? "نامشخص",
      verified: author?.verified ?? false,
    },
    liked_by_me: likedByMe,
    is_mine: currentUserId === script.author_id,
  };
}

router.get("/", async (req, res): Promise<void> => {
  const database = await db.load();

  const search = typeof req.query.search === "string" ? req.query.search : "";
  const category =
    typeof req.query.category === "string" ? req.query.category : "";
  const sort = typeof req.query.sort === "string" ? req.query.sort : "new";
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(String(req.query.pageSize ?? "12"), 10) || 12)
  );

  let filtered = database.scripts.filter((s) => !s.pending);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }

  if (category) {
    filtered = filtered.filter((s) => s.category === category);
  }

  if (sort === "new") {
    filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } else if (sort === "trending" || sort === "likes") {
    filtered.sort((a, b) => b.likes_count - a.likes_count);
  } else if (sort === "views") {
    filtered.sort((a, b) => b.views_count - a.views_count);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  const publicItems = await Promise.all(
    items.map((s) => toPublicScript(s, null))
  );

  res.json({ items: publicItems, total, page, totalPages });
});

router.get("/mine", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const database = await db.load();
  const mine = database.scripts
    .filter((s) => s.author_id === req.userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const items = await Promise.all(
    mine.map((s) => toPublicScript(s, req.userId ?? null))
  );
  res.json({ items });
});

router.get("/:id", async (req: AuthRequest, res): Promise<void> => {
  const database = await db.load();
  const script = database.scripts.find((s) => s.id === req.params.id);

  if (!script) {
    res.status(404).json({ error: "اسکریپت یافت نشد" });
    return;
  }

  if (!script.pending) {
    script.views_count += 1;
    await db.save();
  }

  const publicScript = await toPublicScript(script, req.userId ?? null);
  res.json({ script: publicScript });
});

router.post("/", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const { title, description, code, category, image_url } = req.body ?? {};

  if (
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof code !== "string" ||
    typeof category !== "string"
  ) {
    res.status(400).json({ error: "همه‌ی فیلدها الزامی هستند" });
    return;
  }

  if (title.trim().length < 3) {
    res.status(400).json({ error: "عنوان حداقل ۳ کاراکتر" });
    return;
  }
  if (description.trim().length < 10) {
    res.status(400).json({ error: "توضیحات حداقل ۱۰ کاراکتر" });
    return;
  }
  if (code.trim().length < 10) {
    res.status(400).json({ error: "کد حداقل ۱۰ کاراکتر" });
    return;
  }

  const database = await db.load();
  const user = database.users.find((u) => u.id === req.userId);
  if (!user) {
    res.status(401).json({ error: "کاربر یافت نشد" });
    return;
  }

  const now = new Date().toISOString();
  const isPrivileged = user.role === "owner" || user.role === "moderator";

  const script: Script = {
    id: randomUUID(),
    title: title.trim(),
    description: description.trim(),
    code: code,
    category: category,
    author_id: user.id,
    image_url:
      typeof image_url === "string" && image_url.trim() ? image_url.trim() : null,
    likes_count: 0,
    views_count: 0,
    pending: !isPrivileged,
    created_at: now,
    updated_at: now,
  };

  database.scripts.push(script);
  await db.save();

  const publicScript = await toPublicScript(script, user.id);
  res.status(201).json({ script: publicScript });
});

router.delete("/:id", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const database = await db.load();
  const idx = database.scripts.findIndex((s) => s.id === req.params.id);

  if (idx === -1) {
    res.status(404).json({ error: "اسکریپت یافت نشد" });
    return;
  }

  const script = database.scripts[idx];
  const user = database.users.find((u) => u.id === req.userId);
  if (!user) {
    res.status(401).json({ error: "کاربر یافت نشد" });
    return;
  }

  const isOwner = script.author_id === user.id;
  const isAdmin = user.role === "owner" || user.role === "moderator";

  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "دسترسی ندارید" });
    return;
  }

  database.scripts.splice(idx, 1);
  database.likes = database.likes.filter((l) => l.script_id !== script.id);
  database.comments = database.comments.filter((c) => c.script_id !== script.id);

  await db.save();
  res.json({ ok: true });
});

router.post("/:id/like", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const database = await db.load();
  const script = database.scripts.find((s) => s.id === req.params.id);

  if (!script) {
    res.status(404).json({ error: "اسکریپت یافت نشد" });
    return;
  }

  const existing = database.likes.findIndex(
    (l) => l.user_id === req.userId && l.script_id === script.id
  );

  let liked: boolean;
  if (existing >= 0) {
    database.likes.splice(existing, 1);
    script.likes_count = Math.max(0, script.likes_count - 1);
    liked = false;
  } else {
    database.likes.push({
      id: randomUUID(),
      user_id: req.userId!,
      script_id: script.id,
      created_at: new Date().toISOString(),
    });
    script.likes_count += 1;
    liked = true;
  }

  await db.save();
  res.json({ liked, likes_count: script.likes_count });
});

router.post("/:id/publish", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const database = await db.load();
  const script = database.scripts.find((s) => s.id === req.params.id);

  if (!script) {
    res.status(404).json({ error: "اسکریپت یافت نشد" });
    return;
  }

  if (script.author_id !== req.userId) {
    res.status(403).json({ error: "فقط صاحب اسکریپت می‌تواند منتشر کند" });
    return;
  }

  script.pending = false;
  script.updated_at = new Date().toISOString();
  await db.save();

  const publicScript = await toPublicScript(script, req.userId);
  res.json({ script: publicScript });
});

export default router;