import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getDb } from "../config/db.js";
import { AppError } from "./errorHandler.js";

/**
 * Verifies Bearer JWT token and loads fresh user status from DB.
 */
export function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication required. Please log in.", 401));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const db = req.app.locals.db || getDb();
    const user = db
      .prepare("SELECT user_id, full_name, email, phone, role, account_status FROM users WHERE user_id = ?")
      .get(payload.userId);

    if (!user) {
      return next(new AppError("User account no longer exists.", 401));
    }
    if (user.account_status === "suspended") {
      return next(new AppError("Your account has been suspended. Contact admin.", 403));
    }

    req.user = user;
    next();
  } catch {
    next(new AppError("Invalid or expired session token.", 401));
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(`Access denied. Required role: ${allowedRoles.join(" or ")}.`, 403));
    }
    next();
  };
}
