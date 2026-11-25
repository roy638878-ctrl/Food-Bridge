import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import {
  createClaimSchema,
  decideClaimSchema,
  reportUnsafeSchema,
  verifyHandoverSchema,
} from "./claim.schema.js";
import {
  createFoodClaim,
  decideClaim,
  listDonorClaims,
  listNgoClaims,
  reportUnsafeFood,
  verifyHandoverOtp,
} from "./claim.service.js";

const router = Router();

router.post("/", authenticate, authorizeRoles("ngo", "receiver"), validateBody(createClaimSchema), (req, res, next) => {
  try {
    const claim = createFoodClaim(req.app.locals.db, req.user.user_id, req.validatedBody);
    res.status(201).json({
      success: true,
      message: "Food claim submitted. Waiting for donor approval.",
      data: claim,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/donor", authenticate, authorizeRoles("donor"), (req, res, next) => {
  try {
    const items = listDonorClaims(req.app.locals.db, req.user.user_id);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.get("/ngo", authenticate, authorizeRoles("ngo", "receiver"), (req, res, next) => {
  try {
    const items = listNgoClaims(req.app.locals.db, req.user.user_id);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/decision", authenticate, authorizeRoles("donor"), validateBody(decideClaimSchema), (req, res, next) => {
  try {
    const updated = decideClaim(
      req.app.locals.db,
      Number(req.params.id),
      req.user.user_id,
      req.validatedBody.decision
    );
    res.json({
      success: true,
      message: `Claim ${req.validatedBody.decision}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/verify-handover",
  authenticate,
  authorizeRoles("donor"),
  validateBody(verifyHandoverSchema),
  (req, res, next) => {
    try {
      const updated = verifyHandoverOtp(
        req.app.locals.db,
        Number(req.params.id),
        req.user.user_id,
        req.validatedBody.otp
      );
      res.json({
        success: true,
        message: "Food handover verified and completed!",
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/report-unsafe",
  authenticate,
  authorizeRoles("ngo", "receiver"),
  validateBody(reportUnsafeSchema),
  (req, res, next) => {
    try {
      const result = reportUnsafeFood(
        req.app.locals.db,
        Number(req.params.id),
        req.user.user_id,
        req.validatedBody.reason
      );
      res.json({
        success: true,
        message: "Safety report submitted and listing flagged for admin review.",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
