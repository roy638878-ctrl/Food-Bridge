import { Router } from "express";
import { z } from "zod";
import { authenticate, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { createNotification } from "../notifications/notification.service.js";

const router = Router();

const schedulePickupSchema = z.object({
  claim_id: z.coerce.number().int().positive(),
  scheduled_pickup_at: z.string().min(1),
  volunteer_name: z.string().trim().min(2),
  volunteer_phone: z.string().trim().min(7).max(20),
  dropoff_address: z.string().trim().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["scheduled", "en_route", "arrived", "collected", "failed", "cancelled"]),
});

router.post("/", authenticate, authorizeRoles("ngo", "receiver"), validateBody(schedulePickupSchema), (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { claim_id, scheduled_pickup_at, volunteer_name, volunteer_phone, dropoff_address } =
      req.validatedBody;

    const claim = db
      .prepare(
        `SELECT fc.*, fl.pickup_address, fl.title, d.user_id AS donor_user_id, n.user_id AS ngo_user_id, n.address AS ngo_address
         FROM food_claims fc
         JOIN food_listings fl ON fl.listing_id = fc.listing_id
         JOIN donors d ON d.donor_id = fl.donor_id
         JOIN ngos n ON n.ngo_id = fc.ngo_id
         WHERE fc.claim_id = ?`
      )
      .get(claim_id);

    if (!claim) throw new AppError("Claim not found.", 404);
    if (claim.ngo_user_id !== req.user.user_id) {
      throw new AppError("You can only schedule pickups for your own claims.", 403);
    }
    if (claim.status !== "approved") {
      throw new AppError("Claim must be approved before scheduling pickup.", 400);
    }

    const existing = db.prepare("SELECT pickup_id FROM pickup_requests WHERE claim_id = ?").get(claim_id);
    if (existing) {
      throw new AppError("Pickup has already been scheduled for this claim.", 409);
    }

    const pickupRes = db
      .prepare(
        `INSERT INTO pickup_requests (claim_id, pickup_address, scheduled_pickup_at, volunteer_name, volunteer_phone, status)
         VALUES (?, ?, ?, ?, ?, 'scheduled')`
      )
      .run(
        claim_id,
        claim.pickup_address,
        new Date(scheduled_pickup_at).toISOString(),
        volunteer_name,
        volunteer_phone
      );

    const pickupId = Number(pickupRes.lastInsertRowid);
    if (claim.fulfillment_type === "delivery" || dropoff_address) {
      db.prepare(
        `INSERT INTO delivery_details (pickup_id, dropoff_address, delivery_partner, delivery_status)
         VALUES (?, ?, 'in_house_volunteer', 'assigned')`
      ).run(pickupId, dropoff_address || claim.ngo_address);
    }

    createNotification(db, {
      userId: claim.donor_user_id,
      title: "Pickup Scheduled",
      message: `${volunteer_name} (${volunteer_phone}) will pick up "${claim.title}".`,
      type: "pickup_scheduled",
    });

    const created = db.prepare("SELECT * FROM pickup_requests WHERE pickup_id = ?").get(pickupId);
    res.status(201).json({ success: true, message: "Pickup scheduled.", data: created });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/status", authenticate, authorizeRoles("ngo", "receiver", "donor"), validateBody(updateStatusSchema), (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const pickupId = Number(req.params.id);
    const pickup = db.prepare("SELECT * FROM pickup_requests WHERE pickup_id = ?").get(pickupId);
    if (!pickup) throw new AppError("Pickup request not found.", 404);

    db.prepare("UPDATE pickup_requests SET status = ? WHERE pickup_id = ?").run(
      req.validatedBody.status,
      pickupId
    );
    const updated = db.prepare("SELECT * FROM pickup_requests WHERE pickup_id = ?").get(pickupId);
    res.json({ success: true, message: "Pickup status updated.", data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
