import { Router } from "express";
import { z } from "zod";
import { authenticate, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { uploadMiddleware } from "../../middlewares/uploadMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { AppError } from "../../middlewares/errorHandler.js";

const router = Router();

const updateNgoSchema = z.object({
  ngo_name: z.string().trim().min(2).max(150).optional(),
  service_area: z.string().trim().min(2).max(150).optional(),
  daily_capacity_servings: z.coerce.number().int().positive().optional(),
  address: z.string().trim().min(4).optional(),
  city: z.string().trim().min(2).optional(),
});

router.get("/me", authenticate, authorizeRoles("ngo", "receiver"), (req, res) => {
  const ngo = req.app.locals.db
    .prepare("SELECT * FROM ngos WHERE user_id = ?")
    .get(req.user.user_id);
  res.json({ success: true, data: ngo });
});

router.patch("/me", authenticate, authorizeRoles("ngo", "receiver"), validateBody(updateNgoSchema), (req, res) => {
  const db = req.app.locals.db;
  const current = db.prepare("SELECT * FROM ngos WHERE user_id = ?").get(req.user.user_id);
  const body = req.validatedBody;

  db.prepare(
    `UPDATE ngos
     SET ngo_name = ?, service_area = ?, daily_capacity_servings = ?, address = ?, city = ?
     WHERE user_id = ?`
  ).run(
    body.ngo_name ?? current.ngo_name,
    body.service_area ?? current.service_area,
    body.daily_capacity_servings ?? current.daily_capacity_servings,
    body.address ?? current.address,
    body.city ?? current.city,
    req.user.user_id
  );

  const updated = db.prepare("SELECT * FROM ngos WHERE user_id = ?").get(req.user.user_id);
  res.json({ success: true, message: "NGO profile updated.", data: updated });
});

router.post(
  "/me/document",
  authenticate,
  authorizeRoles("ngo", "receiver"),
  uploadMiddleware.single("document"),
  (req, res, next) => {
    if (!req.file) {
      return next(new AppError("Please upload a valid PDF or image document.", 400));
    }
    const documentUrl = `/uploads/${req.file.filename}`;
    req.app.locals.db
      .prepare("UPDATE ngos SET document_url = ? WHERE user_id = ?")
      .run(documentUrl, req.user.user_id);

    res.json({
      success: true,
      message: "Verification document uploaded. Awaiting admin review.",
      data: { document_url: documentUrl },
    });
  }
);

export default router;
