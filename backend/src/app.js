import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { getDb } from "./config/db.js";
import { seedDatabase } from "./db/seeds/seed.js";
import { apiRateLimiter } from "./middlewares/rateLimiter.js";
import { gzipMiddleware } from "./middlewares/compression.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

import authRoutes from "./modules/auth/auth.routes.js";
import donorRoutes from "./modules/donors/donor.routes.js";
import ngoRoutes from "./modules/ngos/ngo.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import listingRoutes from "./modules/listings/listing.routes.js";
import claimRoutes from "./modules/claims/claim.routes.js";
import pickupRoutes from "./modules/pickups/pickup.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import reviewRoutes from "./modules/reviews/review.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import partnerRoutes from "./modules/partners/partner.routes.js";

export function createApp({ db = null, seed = true } = {}) {
  const app = express();
  const database = db || getDb();
  if (seed) {
    seedDatabase(database);
  }
  app.locals.db = database;

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.clientOrigin.split(",").map((s) => s.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(gzipMiddleware);
  app.use("/api", apiRateLimiter);
  app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), "uploads"), {
      maxAge: "7d",
      etag: true,
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ success: true, service: "foodbridge-api", timestamp: new Date().toISOString() });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/donors", donorRoutes);
  app.use("/api/v1/ngos", ngoRoutes);
  app.use("/api/v1/categories", categoryRoutes);
  app.use("/api/v1/listings", listingRoutes);
  app.use("/api/v1/claims", claimRoutes);
  app.use("/api/v1/pickups", pickupRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/reviews", reviewRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/partners", partnerRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
