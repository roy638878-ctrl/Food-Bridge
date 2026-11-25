import { Router } from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authRateLimiter } from "../../middlewares/rateLimiter.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { getProfileByUser, loginUser, registerUser } from "./auth.service.js";

const router = Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), (req, res, next) => {
  try {
    const result = registerUser(req.app.locals.db, req.validatedBody);
    res.status(201).json({
      success: true,
      message: "Account registered successfully.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", authRateLimiter, validateBody(loginSchema), (req, res, next) => {
  try {
    const result = loginUser(req.app.locals.db, req.validatedBody);
    res.json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticate, (req, res) => {
  const userProfile = getProfileByUser(req.app.locals.db, req.user);
  res.json({ success: true, data: userProfile });
});

export default router;
