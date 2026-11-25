import { Router } from "express";
import { z } from "zod";
import { authenticate, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";

const router = Router();

const updateDonorSchema = z.object({
  organization_name: z.string().trim().min(2).max(150).optional(),
  donor_type: z.enum(["individual", "restaurant", "college_mess", "marriage_hall", "caterer"]).optional(),
  address: z.string().trim().min(4).optional(),
  city: z.string().trim().min(2).optional(),
  postal_code: z.string().trim().max(20).optional(),
});

router.get("/me", authenticate, authorizeRoles("donor"), (req, res) => {
  const db = req.app.locals.db;
  const donor = db.prepare("SELECT * FROM donors WHERE user_id = ?").get(req.user.user_id);
  res.json({ success: true, data: donor });
});

router.patch("/me", authenticate, authorizeRoles("donor"), validateBody(updateDonorSchema), (req, res) => {
  const db = req.app.locals.db;
  const current = db.prepare("SELECT * FROM donors WHERE user_id = ?").get(req.user.user_id);
  const body = req.validatedBody;

  db.prepare(
    `UPDATE donors
     SET organization_name = ?, donor_type = ?, address = ?, city = ?, postal_code = ?
     WHERE user_id = ?`
  ).run(
    body.organization_name ?? current.organization_name,
    body.donor_type ?? current.donor_type,
    body.address ?? current.address,
    body.city ?? current.city,
    body.postal_code ?? current.postal_code,
    req.user.user_id
  );

  const updated = db.prepare("SELECT * FROM donors WHERE user_id = ?").get(req.user.user_id);
  res.json({ success: true, message: "Donor profile updated.", data: updated });
});

export default router;
