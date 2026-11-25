import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { uploadMiddleware } from "../../middlewares/uploadMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { createListingSchema } from "./listing.schema.js";
import {
  cancelListing,
  createListing,
  listAvailableListings,
  listDonorListings,
} from "./listing.service.js";

const router = Router();

router.get("/", (req, res) => {
  const items = listAvailableListings(req.app.locals.db, req.query);
  res.json({ success: true, data: items });
});

router.get("/mine", authenticate, authorizeRoles("donor"), (req, res, next) => {
  try {
    const items = listDonorListings(req.app.locals.db, req.user.user_id);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  authenticate,
  authorizeRoles("donor"),
  uploadMiddleware.single("image"),
  validateBody(createListingSchema),
  (req, res, next) => {
    try {
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
      const created = createListing(req.app.locals.db, req.user.user_id, req.validatedBody, imageUrl);
      res.status(201).json({
        success: true,
        message: "Surplus food listing published safely.",
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch("/:id/cancel", authenticate, authorizeRoles("donor", "admin"), (req, res, next) => {
  try {
    const updated = cancelListing(req.app.locals.db, Number(req.params.id), req.user);
    res.json({ success: true, message: "Listing cancelled.", data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
