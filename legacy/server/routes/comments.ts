import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, type Comment } from "../db";
import { authenticate, type AuthRequest } from "../middleware/auth";

const router = Router();

interface PublicComment {
  id: string;
  content: string;
  created_at: string;
  author: { id: string; username: string; verified: boolean };
  is_mine: boolean;
}

async function toPublicComment(
  c: Comment,
  currentUserId: string | null
): Promise<PublicComment> {
  const database = await db.load();
  const author = database.users.find((u) => u.id === c.user_id);
  return {
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    author: {
      id: author?.id ?? "",
      username: author?.username ?? "نامشخص",
      verified: author?.verified ?? false,
    },
    is_mine: currentUserId === c.user_id,
  };
}

router.get("/scripts/:id/comments", async (req: AuthRequest, res): Promise<void> => {
  const database = await db.load();
  const script = database.scripts.find((s) => s.id === req.params.id);
  if (!script) {
    res.status(404).json({ error: "اسکریپت یافت نشد" });
    return;
  }

  const comments = database.comments
    .filter((c) => c.script_id === script.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const publicComments = await Promise.all(
    comments.map((c) => toPublicComment(c, req.userId ?? null))
  );
  res.json({ comments: publicComments });
});

router.post(
  "/scripts/:id/comments",
  authenticate,
  async (req: AuthRequest, res): Promise<void> => {
    const database = await db.load();
    const script = database.scripts.find((s) => s.id === req.params.id);
    if (!script) {
      res.status(404).json({ error: "اسکریپت یافت نشد" });
      return;
    }

    const { content } = req.body ?? {};
    if (typeof content !== "string" || content.trim().length < 2) {
      res.status(400).json({ error: "متن کامنت حداقل ۲ کاراکتر" });
      return;
    }
    if (content.length > 1000) {
      res.status(400).json({ error: "متن کامنت حداکثر ۱۰۰۰ کاراکتر" });
      return;
    }

    const comment: Comment = {
      id: randomUUID(),
      script_id: script.id,
      user_id: req.userId!,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    database.comments.push(comment);
    await db.save();

    const publicComment = await toPublicComment(comment, req.userId ?? null);
    res.status(201).json({ comment: publicComment });
  }
);

router.delete("/comments/:id", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const database = await db.load();
  const idx = database.comments.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "کامنت یافت نشد" });
    return;
  }

  const comment = database.comments[idx];
  const user = database.users.find((u) => u.id === req.userId);
  if (!user) {
    res.status(401).json({ error: "کاربر یافت نشد" });
    return;
  }

  const isOwner = comment.user_id === user.id;
  const isAdmin = user.role === "owner" || user.role === "moderator";
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "دسترسی ندارید" });
    return;
  }

  database.comments.splice(idx, 1);
  await db.save();
  res.json({ ok: true });
});

export default router;