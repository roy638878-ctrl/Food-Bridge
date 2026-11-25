import { Router } from "express";
import { z } from "zod";
import { authenticate, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { runTransaction } from "../../config/db.js";

const router = Router();

const createReviewSchema = z.object({
  claim_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  hygiene_issue_reported: z.boolean().default(false),
});

router.post("/", authenticate, authorizeRoles("ngo", "receiver"), validateBody(createReviewSchema), (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { claim_id, rating, comment, hygiene_issue_reported } = req.validatedBody;

    const review = runTransaction(db, () => {
      const claim = db
        .prepare(
          `SELECT fc.*, fl.donor_id, d.user_id AS donor_user_id, n.user_id AS ngo_user_id
           FROM food_claims fc
           JOIN food_listings fl ON fl.listing_id = fc.listing_id
           JOIN donors d ON d.donor_id = fl.donor_id
           JOIN ngos n ON n.ngo_id = fc.ngo_id
           WHERE fc.claim_id = ?`
        )
        .get(claim_id);

      if (!claim) throw new AppError("Claim not found.", 404);
      if (claim.ngo_user_id !== req.user.user_id) {
        throw new AppError("Only the claiming NGO can review this donation.", 403);
      }
      if (claim.status !== "completed") {
        throw new AppError("Reviews can only be submitted after completed handover.", 400);
      }

      const dup = db.prepare("SELECT review_id FROM reviews WHERE claim_id = ?").get(claim_id);
      if (dup) throw new AppError("You have already reviewed this donation.", 409);

      const ins = db
        .prepare(
          `INSERT INTO reviews (claim_id, reviewer_id, target_user_id, rating, comment, hygiene_issue_reported)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          claim_id,
          req.user.user_id,
          claim.donor_user_id,
          rating,
          comment || null,
          hygiene_issue_reported ? 1 : 0
        );

      const avgRow = db
        .prepare("SELECT AVG(rating) AS avg_r FROM reviews WHERE target_user_id = ?")
        .get(claim.donor_user_id);

      db.prepare("UPDATE donors SET avg_rating = ? WHERE donor_id = ?").run(
        Number((avgRow.avg_r || 5).toFixed(2)),
        claim.donor_id
      );

      return db.prepare("SELECT * FROM reviews WHERE review_id = ?").get(Number(ins.lastInsertRowid));
    });

    res.status(201).json({ success: true, message: "Thank you for your feedback.", data: review });
  } catch (err) {
    next(err);
  }
});

export default router;
