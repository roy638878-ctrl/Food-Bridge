import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  const rows = req.app.locals.db
    .prepare("SELECT * FROM food_categories ORDER BY category_id ASC")
    .all();
  res.json({ success: true, data: rows });
});

export default router;
