import { Router } from "express";
import { db, type UserRole } from "../db";
import { authenticate, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.get(
  "/users",
  authenticate,
  requireRole("owner"),
  async (_req, res): Promise<void> => {
    const database = await db.load();
    const items = database.users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      verified: u.verified,
      banned: u.banned,
      created_at: u.created_at,
    }));
    res.json({ items });
  }
);

router.put(
  "/users/:id/verified",
  authenticate,
  requireRole("owner"),
  async (req: AuthRequest, res): Promise<void> => {
    const { verified } = req.body ?? {};
    if (typeof verified !== "boolean") {
      res.status(400).json({ error: "مقدار verified باید boolean باشد" });
      return;
    }
    const database = await db.load();
    const user = database.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: "کاربر یافت نشد" });
      return;
    }
    if (user.id === req.userId && !verified) {
      res.status(400).json({ error: "نمی‌توانید تیک آبی خودتان را بردارید" });
      return;
    }
    user.verified = verified;
    await db.save();
    res.json({ ok: true });
  }
);

router.put(
  "/users/:id/role",
  authenticate,
  requireRole("owner"),
  async (req: AuthRequest, res): Promise<void> => {
    const { role } = req.body ?? {};
    const validRoles: UserRole[] = ["user", "moderator", "owner"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: "نقش نامعتبر" });
      return;
    }
    const database = await db.load();
    const user = database.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: "کاربر یافت نشد" });
      return;
    }
    if (user.id === req.userId) {
      res.status(400).json({ error: "نمی‌توانید نقش خودتان را تغییر دهید" });
      return;
    }
    user.role = role;
    await db.save();
    res.json({ ok: true });
  }
);

export default router;