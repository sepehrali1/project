import type { Response, NextFunction } from "express";
import { db } from "../db";
import type { AuthRequest } from "./auth";
import type { UserRole } from "../db";

const HIERARCHY: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  owner: 2,
};

export function requireRole(minRole: UserRole) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "نیاز به احراز هویت" });
      return;
    }

    const database = await db.load();
    const user = database.users.find((u) => u.id === req.userId);

    if (!user) {
      res.status(401).json({ error: "کاربر یافت نشد" });
      return;
    }

    if (HIERARCHY[user.role] < HIERARCHY[minRole]) {
      res.status(403).json({ error: "دسترسی ندارید" });
      return;
    }

    next();
  };
}