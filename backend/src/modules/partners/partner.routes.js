import crypto from "crypto";
import { Router } from "express";
import { AppError } from "../../middlewares/errorHandler.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { createListingSchema } from "../listings/listing.schema.js";
import { createListing } from "../listings/listing.service.js";

const router = Router();

/**
 * Middleware authenticating external startup partners (Restaurants, Messes, Marriage Halls, Logistics)
 * via a scoped `x-partner-key` header without altering core user auth.
 */
function authenticatePartner(req, _res, next) {
  const rawKey = req.headers["x-partner-key"];
  if (!rawKey) {
    return next(new AppError("Missing x-partner-key header.", 401));
  }
  const keyHash = crypto.createHash("sha256").update(String(rawKey)).digest("hex");
  const partner = req.app.locals.db
    .prepare("SELECT * FROM partner_integrations WHERE api_key_hash = ? AND is_active = 1")
    .get(keyHash);

  if (!partner) {
    return next(new AppError("Invalid or inactive partner API key.", 403));
  }
  req.partner = partner;
  next();
}

router.post(
  "/listings",
  authenticatePartner,
  validateBody(createListingSchema),
  (req, res, next) => {
    try {
      const db = req.app.locals.db;
      const scopes = req.partner.scopes.split(",");
      if (!scopes.includes("listings:write") || !req.partner.donor_id) {
        return next(new AppError("Partner lacks listings:write scope or linked donor profile.", 403));
      }
      const donor = db
        .prepare("SELECT user_id FROM donors WHERE donor_id = ?")
        .get(req.partner.donor_id);
      if (!donor) {
        return next(new AppError("Linked donor profile not found.", 404));
      }

      const listing = createListing(db, donor.user_id, req.validatedBody);
      res.status(201).json({
        success: true,
        message: "Partner surplus listing ingested.",
        data: listing,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
