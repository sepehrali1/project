import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";

export const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-change-in-production";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "نیاز به احراز هویت" });
    return;
  }

  const token = header.slice(7);
  let payload: { sub: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { sub: string };
  } catch {
    res.status(401).json({ error: "توکن نامعتبر یا منقضی شده" });
    return;
  }

  const database = await db.load();
  const user = database.users.find((u) => u.id === payload.sub);

  if (!user) {
    res.status(401).json({ error: "کاربر یافت نشد" });
    return;
  }
  if (user.banned) {
    res.status(403).json({ error: "حساب شما مسدود شده است" });
    return;
  }

  req.userId = user.id;
  next();
}