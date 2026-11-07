import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { db, type User } from "../db";
import { authenticate, JWT_SECRET, type AuthRequest } from "../middleware/auth";

const router = Router();

interface PublicUser {
  id: string;
  email: string;
  username: string;
  role: User["role"];
  verified: boolean;
  banned: boolean;
  created_at: string;
}

function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    verified: u.verified,
    banned: u.banned,
    created_at: u.created_at,
  };
}

function issueToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

// ---------- REGISTER ----------
router.post("/register", async (req, res): Promise<void> => {
  const { email, username, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof username !== "string" ||
    typeof password !== "string"
  ) {
    res.status(400).json({ error: "همه‌ی فیلدها الزامی هستند" });
    return;
  }

  const emailNorm = email.trim().toLowerCase();
  const usernameNorm = username.trim();

  if (emailNorm.length < 5 || !emailNorm.includes("@")) {
    res.status(400).json({ error: "ایمیل نامعتبر است" });
    return;
  }
  if (usernameNorm.length < 3 || usernameNorm.length > 30) {
    res.status(400).json({ error: "نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "رمز عبور باید حداقل ۶ کاراکتر باشد" });
    return;
  }

  const database = await db.load();

  if (database.users.some((u) => u.email === emailNorm)) {
    res.status(409).json({ error: "این ایمیل قبلاً ثبت شده است" });
    return;
  }
  if (
    database.users.some(
      (u) => u.username.toLowerCase() === usernameNorm.toLowerCase()
    )
  ) {
    res.status(409).json({ error: "این نام کاربری قبلاً گرفته شده است" });
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const isFirstUser = database.users.length === 0;

  const user: User = {
    id: randomUUID(),
    email: emailNorm,
    username: usernameNorm,
    password_hash,
    role: isFirstUser ? "owner" : "user",
    verified: isFirstUser,
    banned: false,
    created_at: now,
  };

  database.users.push(user);
  await db.save();

  const token = issueToken(user.id);
  res.status(201).json({ token, user: toPublicUser(user) });
});

// ---------- LOGIN ----------
router.post("/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "ایمیل و رمز عبور الزامی هستند" });
    return;
  }

  const emailNorm = email.trim().toLowerCase();
  const database = await db.load();
  const user = database.users.find((u) => u.email === emailNorm);

  if (!user) {
    res.status(401).json({ error: "ایمیل یا رمز عبور اشتباه است" });
    return;
  }
  if (user.banned) {
    res.status(403).json({ error: "حساب شما مسدود شده است" });
    return;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "ایمیل یا رمز عبور اشتباه است" });
    return;
  }

  const token = issueToken(user.id);
  res.json({ token, user: toPublicUser(user) });
});

// ---------- ME ----------
router.get("/me", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const database = await db.load();
  const user = database.users.find((u) => u.id === req.userId);
  if (!user) {
    res.status(401).json({ error: "کاربر یافت نشد" });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

export default router;