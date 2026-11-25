import { Router } from "express";
import { z } from "zod";
import { authenticate, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { createNotification } from "../notifications/notification.service.js";
import { expireStaleListings } from "../listings/listing.service.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

function logAdminAction(db, adminId, actionType, targetTable, targetId, details) {
  db.prepare(
    `INSERT INTO admin_logs (admin_id, action_type, target_table, target_id, details)
     VALUES (?, ?, ?, ?, ?)`
  ).run(adminId, actionType, targetTable, targetId, details);
}

router.get("/analytics", (req, res) => {
  const db = req.app.locals.db;
  expireStaleListings(db);

  const totals = {
    totalUsers: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
    verifiedNgos: db
      .prepare("SELECT COUNT(*) AS c FROM ngos WHERE verification_status = 'verified'")
      .get().c,
    pendingNgos: db
      .prepare("SELECT COUNT(*) AS c FROM ngos WHERE verification_status = 'pending'")
      .get().c,
    activeListings: db
      .prepare(
        "SELECT COUNT(*) AS c FROM food_listings WHERE status IN ('available', 'partially_claimed')"
      )
      .get().c,
    completedClaims: db
      .prepare("SELECT COUNT(*) AS c FROM food_claims WHERE status = 'completed'")
      .get().c,
    totalServingsRedistributed: db
      .prepare(
        "SELECT COALESCE(SUM(claimed_quantity), 0) AS s FROM food_claims WHERE status = 'completed'"
      )
      .get().s,
    flaggedUnsafeListings: db
      .prepare("SELECT COUNT(*) AS c FROM food_listings WHERE status = 'flagged_unsafe'")
      .get().c,
  };

  res.json({ success: true, data: totals });
});

router.get("/verifications", (req, res) => {
  const db = req.app.locals.db;
  const ngos = db
    .prepare(
      `SELECT n.*, u.full_name, u.email, u.phone, u.account_status
       FROM ngos n
       JOIN users u ON u.user_id = n.user_id
       ORDER BY CASE n.verification_status WHEN 'pending' THEN 0 ELSE 1 END, n.ngo_id DESC`
    )
    .all();

  const donors = db
    .prepare(
      `SELECT d.*, u.full_name, u.email, u.phone, u.account_status
       FROM donors d
       JOIN users u ON u.user_id = d.user_id
       ORDER BY d.donor_id DESC`
    )
    .all();

  res.json({ success: true, data: { ngos, donors } });
});

const verifySchema = z.object({
  status: z.enum(["verified", "rejected"]),
  reason: z.string().trim().max(300).optional(),
});

router.patch("/ngos/:id/verify", validateBody(verifySchema), (req, res, next) => {
  const db = req.app.locals.db;
  const ngoId = Number(req.params.id);
  const { status, reason } = req.validatedBody;

  const ngo = db.prepare("SELECT * FROM ngos WHERE ngo_id = ?").get(ngoId);
  if (!ngo) return next(new AppError("NGO not found.", 404));

  db.prepare(
    `UPDATE ngos
     SET verification_status = ?, verified_at = CASE WHEN ? = 'verified' THEN datetime('now') ELSE NULL END
     WHERE ngo_id = ?`
  ).run(status, status, ngoId);

  logAdminAction(
    db,
    req.user.user_id,
    `NGO_${status.toUpperCase()}`,
    "ngos",
    ngoId,
    reason || `Admin marked NGO ${ngo.ngo_name} as ${status}`
  );

  createNotification(db, {
    userId: ngo.user_id,
    title: status === "verified" ? "NGO Account Verified!" : "NGO Verification Rejected",
    message:
      status === "verified"
        ? `Your NGO "${ngo.ngo_name}" is now verified and can claim surplus food.`
        : `Your NGO verification was rejected. ${reason || "Please update your documents."}`,
    type: "verification",
  });

  res.json({ success: true, message: `NGO ${status}.` });
});

const accountStatusSchema = z.object({
  account_status: z.enum(["active", "suspended"]),
  reason: z.string().trim().max(300).optional(),
});

router.patch("/users/:id/status", validateBody(accountStatusSchema), (req, res, next) => {
  const db = req.app.locals.db;
  const targetUserId = Number(req.params.id);
  if (targetUserId === req.user.user_id) {
    return next(new AppError("You cannot suspend your own admin account.", 400));
  }

  const user = db.prepare("SELECT * FROM users WHERE user_id = ?").get(targetUserId);
  if (!user) return next(new AppError("User not found.", 404));

  db.prepare("UPDATE users SET account_status = ?, updated_at = datetime('now') WHERE user_id = ?").run(
    req.validatedBody.account_status,
    targetUserId
  );

  logAdminAction(
    db,
    req.user.user_id,
    `USER_${req.validatedBody.account_status.toUpperCase()}`,
    "users",
    targetUserId,
    req.validatedBody.reason || `Updated status to ${req.validatedBody.account_status}`
  );

  res.json({ success: true, message: `User account ${req.validatedBody.account_status}.` });
});

router.get("/listings", (req, res) => {
  const db = req.app.locals.db;
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status ? String(req.query.status) : null;

  const where = statusFilter ? "WHERE fl.status = ?" : "";
  const params = statusFilter ? [statusFilter] : [];

  const listings = db
    .prepare(
      `SELECT fl.*, fc.category_name, d.organization_name AS donor_name
       FROM food_listings fl
       JOIN food_categories fc ON fc.category_id = fl.category_id
       JOIN donors d ON d.donor_id = fl.donor_id
       ${where}
       ORDER BY CASE fl.status WHEN 'flagged_unsafe' THEN 0 ELSE 1 END, fl.listing_id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  res.json({ success: true, data: listings });
});

router.patch("/listings/:id/remove", (req, res, next) => {
  const db = req.app.locals.db;
  const listingId = Number(req.params.id);
  const listing = db.prepare("SELECT * FROM food_listings WHERE listing_id = ?").get(listingId);
  if (!listing) return next(new AppError("Listing not found.", 404));

  db.prepare("UPDATE food_listings SET status = 'cancelled' WHERE listing_id = ?").run(listingId);
  logAdminAction(db, req.user.user_id, "LISTING_REMOVED", "food_listings", listingId, "Removed by admin moderation");

  res.json({ success: true, message: "Listing removed by admin." });
});

router.get("/logs", (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;

  const logs = req.app.locals.db
    .prepare(
      `SELECT al.*, u.full_name AS admin_name
       FROM admin_logs al
       JOIN users u ON u.user_id = al.admin_id
       ORDER BY al.log_id DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);
  res.json({ success: true, data: logs });
});

export default router;
