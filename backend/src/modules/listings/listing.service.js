import { AppError } from "../../middlewares/errorHandler.js";

/**
 * Expire any active listings whose expiry_at has passed.
 */
export function expireStaleListings(db) {
  const nowIso = new Date().toISOString();
  const res = db
    .prepare(
      `UPDATE food_listings
       SET status = 'expired'
       WHERE status IN ('available', 'partially_claimed', 'reserved')
         AND expiry_at <= ?`
    )
    .run(nowIso);
  return res.changes;
}

export function listAvailableListings(db, filters = {}) {
  expireStaleListings(db);
  const nowIso = new Date().toISOString();

  const conditions = [
    "fl.status IN ('available', 'partially_claimed')",
    "fl.remaining_quantity > 0",
    "fl.safety_checklist_passed = 1",
    "fl.expiry_at > ?",
  ];
  const params = [nowIso];

  if (filters.city) {
    conditions.push("LOWER(fl.city) LIKE LOWER(?)");
    params.push(`%${filters.city.trim()}%`);
  }
  if (filters.category_id) {
    conditions.push("fl.category_id = ?");
    params.push(Number(filters.category_id));
  }
  if (filters.food_type) {
    conditions.push("fl.food_type = ?");
    params.push(filters.food_type);
  }
  if (filters.search) {
    conditions.push("(LOWER(fl.title) LIKE LOWER(?) OR LOWER(COALESCE(fl.description, '')) LIKE LOWER(?))");
    const q = `%${filters.search.trim()}%`;
    params.push(q, q);
  }

  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const page = Math.max(Number(filters.page) || 1, 1);
  const offset = (page - 1) * limit;

  return db
    .prepare(
      `SELECT fl.*, fc.category_name, d.organization_name AS donor_name, d.donor_type, d.avg_rating AS donor_rating
       FROM food_listings fl
       JOIN food_categories fc ON fc.category_id = fl.category_id
       JOIN donors d ON d.donor_id = fl.donor_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY fl.expiry_at ASC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
}

export function listDonorListings(db, userId) {
  expireStaleListings(db);
  const donor = db.prepare("SELECT donor_id FROM donors WHERE user_id = ?").get(userId);
  if (!donor) throw new AppError("Donor profile not found.", 404);

  return db
    .prepare(
      `SELECT fl.*, fc.category_name
       FROM food_listings fl
       JOIN food_categories fc ON fc.category_id = fl.category_id
       WHERE fl.donor_id = ?
       ORDER BY fl.listing_id DESC`
    )
    .all(donor.donor_id);
}

export function createListing(db, userId, data, imageUrl = null) {
  const donor = db.prepare("SELECT * FROM donors WHERE user_id = ?").get(userId);
  if (!donor) throw new AppError("Donor profile not found.", 404);

  if (!data.safety_checklist_passed) {
    throw new AppError(
      "You must confirm the food safety & hygiene checklist before publishing a listing.",
      400
    );
  }

  const category = db
    .prepare("SELECT * FROM food_categories WHERE category_id = ?")
    .get(data.category_id);
  if (!category) {
    throw new AppError("Selected food category does not exist.", 400);
  }

  const preparedDate = new Date(data.prepared_at);
  const expiryDate = new Date(data.expiry_at);
  const now = new Date();

  if (Number.isNaN(preparedDate.getTime()) || Number.isNaN(expiryDate.getTime())) {
    throw new AppError("Invalid prepared_at or expiry_at timestamp.", 400);
  }
  if (preparedDate.getTime() > now.getTime() + 5 * 60 * 1000) {
    throw new AppError("Prepared time cannot be in the future.", 400);
  }
  if (expiryDate <= preparedDate) {
    throw new AppError("Expiry time must be later than prepared time.", 400);
  }
  if (expiryDate.getTime() < now.getTime() + 30 * 60 * 1000) {
    throw new AppError("Food must have at least 30 minutes of remaining safe shelf life.", 400);
  }

  // Enforce refrigerator/hot-held check for perishable categories
  if (category.requires_refrigeration && data.storage_type === "ambient") {
    const hoursLeft = (expiryDate.getTime() - preparedDate.getTime()) / (3600 * 1000);
    if (hoursLeft > 4) {
      throw new AppError(
        `${category.category_name} kept at room temperature (ambient) cannot exceed a 4-hour safety window.`,
        400
      );
    }
  }

  const result = db
    .prepare(
      `INSERT INTO food_listings (
        donor_id, category_id, title, description, food_type,
        total_quantity, remaining_quantity, unit, storage_type,
        allergen_info, safety_checklist_passed, prepared_at, expiry_at,
        pickup_address, city, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 'available')`
    )
    .run(
      donor.donor_id,
      data.category_id,
      data.title,
      data.description || null,
      data.food_type,
      data.total_quantity,
      data.total_quantity,
      data.unit,
      data.storage_type,
      data.allergen_info || "None declared",
      preparedDate.toISOString(),
      expiryDate.toISOString(),
      data.pickup_address,
      data.city,
      imageUrl
    );

  return db
    .prepare(
      `SELECT fl.*, fc.category_name
       FROM food_listings fl
       JOIN food_categories fc ON fc.category_id = fl.category_id
       WHERE fl.listing_id = ?`
    )
    .get(Number(result.lastInsertRowid));
}

export function cancelListing(db, listingId, user) {
  const listing = db.prepare("SELECT * FROM food_listings WHERE listing_id = ?").get(listingId);
  if (!listing) throw new AppError("Food listing not found.", 404);

  if (user.role !== "admin") {
    const donor = db.prepare("SELECT donor_id FROM donors WHERE user_id = ?").get(user.user_id);
    if (!donor || donor.donor_id !== listing.donor_id) {
      throw new AppError("You do not have permission to cancel this listing.", 403);
    }
  }

  const activeClaim = db
    .prepare("SELECT claim_id FROM food_claims WHERE listing_id = ? AND status IN ('pending', 'approved', 'picked_up')")
    .get(listingId);
  if (activeClaim) {
    throw new AppError("Cannot cancel listing while active claims exist.", 409);
  }

  db.prepare("UPDATE food_listings SET status = 'cancelled' WHERE listing_id = ?").run(listingId);
  return db.prepare("SELECT * FROM food_listings WHERE listing_id = ?").get(listingId);
}
