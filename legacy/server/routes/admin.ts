import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, type Warning } from "../db";
import { authenticate, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.get(
  "/users",
  authenticate,
  requireRole("moderator"),
  async (_req, res): Promise<void> => {
    const database = await db.load();
    const users = database.users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      verified: u.verified,
      banned: u.banned,
      created_at: u.created_at,
      scripts_count: database.scripts.filter((s) => s.author_id === u.id).length,
      warnings_count: database.warnings.filter((w) => w.user_id === u.id).length,
    }));
    res.json({ items: users });
  }
);

router.post(
  "/users/:id/ban",
  authenticate,
  requireRole("moderator"),
  async (req: AuthRequest, res): Promise<void> => {
    const database = await db.load();
    const user = database.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: "کاربر یافت نشد" });
      return;
    }
    if (user.role === "owner") {
      res.status(403).json({ error: "مالک پلتفرم قابل مسدودسازی نیست" });
      return;
    }
    user.banned = true;
    await db.save();
    res.json({ ok: true });
  }
);

router.post(
  "/users/:id/unban",
  authenticate,
  requireRole("moderator"),
  async (req: AuthRequest, res): Promise<void> => {
    const database = await db.load();
    const user = database.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: "کاربر یافت نشد" });
      return;
    }
    user.banned = false;
    await db.save();
    res.json({ ok: true });
  }
);

router.post(
  "/users/:id/warn",
  authenticate,
  requireRole("moderator"),
  async (req: AuthRequest, res): Promise<void> => {
    const { reason } = req.body ?? {};
    if (typeof reason !== "string" || reason.trim().length < 3) {
      res.status(400).json({ error: "دلیل اخطار حداقل ۳ کاراکتر" });
      return;
    }

    const database = await db.load();
    const user = database.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: "کاربر یافت نشد" });
      return;
    }

    const warning: Warning = {
      id: randomUUID(),
      user_id: user.id,
      reason: reason.trim(),
      issued_by: req.userId!,
      created_at: new Date().toISOString(),
    };

    database.warnings.push(warning);
    await db.save();
    res.json({ ok: true });
  }
);

router.get(
  "/scripts/pending",
  authenticate,
  requireRole("moderator"),
  async (_req, res): Promise<void> => {
    const database = await db.load();
    const pending = database.scripts.filter((s) => s.pending);

    const items = pending.map((s) => {
      const author = database.users.find((u) => u.id === s.author_id);
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        created_at: s.created_at,
        author_username: author?.username ?? "نامشخص",
      };
    });

    res.json({ items });
  }
);

router.post(
  "/scripts/:id/approve",
  authenticate,
  requireRole("moderator"),
  async (req: AuthRequest, res): Promise<void> => {
    const database = await db.load();
    const script = database.scripts.find((s) => s.id === req.params.id);
    if (!script) {
      res.status(404).json({ error: "اسکریپت یافت نشد" });
      return;
    }
    script.pending = false;
    script.updated_at = new Date().toISOString();
    await db.save();
    res.json({ ok: true });
  }
);

router.delete(
  "/scripts/:id",
  authenticate,
  requireRole("moderator"),
  async (req: AuthRequest, res): Promise<void> => {
    const database = await db.load();
    const idx = database.scripts.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: "اسکریپت یافت نشد" });
      return;
    }
    database.scripts.splice(idx, 1);
    await db.save();
    res.json({ ok: true });
  }
);

export default router;