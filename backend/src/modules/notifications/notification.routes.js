import { Router } from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { getUserNotifications, markAllNotificationsRead } from "./notification.service.js";

const router = Router();

router.get("/", authenticate, (req, res) => {
  const db = req.app.locals.db;
  const items = getUserNotifications(db, req.user.user_id);
  const unreadCount = items.filter((n) => n.is_read === 0).length;
  res.json({ success: true, data: { items, unreadCount } });
});

router.patch("/read-all", authenticate, (req, res) => {
  const db = req.app.locals.db;
  markAllNotificationsRead(db, req.user.user_id);
  res.json({ success: true, message: "All notifications marked as read." });
});

export default router;
