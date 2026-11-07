import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, type Report } from "../db";
import { authenticate, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.post("/", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const { target_type, target_id, reason } = req.body ?? {};

  if (
    typeof target_type !== "string" ||
    typeof target_id !== "string" ||
    typeof reason !== "string"
  ) {
    res.status(400).json({ error: "همه‌ی فیلدها الزامی هستند" });
    return;
  }
  if (!["script", "comment", "user"].includes(target_type)) {
    res.status(400).json({ error: "نوع هدف نامعتبر" });
    return;
  }
  if (reason.trim().length < 5) {
    res.status(400).json({ error: "دلیل گزارش حداقل ۵ کاراکتر" });
    return;
  }

  const database = await db.load();
  const report: Report = {
    id: randomUUID(),
    target_type: target_type as Report["target_type"],
    target_id: target_id,
    reporter_id: req.userId!,
    reason: reason.trim(),
    status: "pending",
    created_at: new Date().toISOString(),
  };

  database.reports.push(report);
  await db.save();
  res.status(201).json({ ok: true, id: report.id });
});

router.get(
  "/",
  authenticate,
  requireRole("moderator"),
  async (_req, res): Promise<void> => {
    const database = await db.load();
    const items = database.reports
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const enriched = items.map((r) => {
      const reporter = database.users.find((u) => u.id === r.reporter_id);
      return { ...r, reporter_username: reporter?.username ?? "نامشخص" };
    });

    res.json({ items: enriched });
  }
);

router.put(
  "/:id",
  authenticate,
  requireRole("moderator"),
  async (req, res): Promise<void> => {
    const { status } = req.body ?? {};
    if (!["pending", "reviewed", "dismissed"].includes(status)) {
      res.status(400).json({ error: "وضعیت نامعتبر" });
      return;
    }
    const database = await db.load();
    const report = database.reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: "گزارش یافت نشد" });
      return;
    }
    report.status = status;
    await db.save();
    res.json({ ok: true });
  }
);

export default router;