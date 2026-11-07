import { Router } from "express";
import { db } from "../db.ts";

const router = Router();

router.get("/", async (_req, res): Promise<void> => {
  const database = await db.load();
  const published = database.scripts.filter((s) => !s.pending);

  const totalViews = published.reduce((sum, s) => sum + s.views_count, 0);
  const totalLikes = published.reduce((sum, s) => sum + s.likes_count, 0);

  const byCategory: Record<string, number> = {};
  for (const s of published) {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  }

  res.json({
    users: database.users.length,
    scripts: published.length,
    views: totalViews,
    likes: totalLikes,
    by_category: byCategory,
  });
});

export default router;