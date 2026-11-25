import bcrypt from "bcryptjs";
import { getDb } from "../../config/db.js";

/**
 * Idempotently seed default food categories, demo users (admin, donor, ngo),
 * and initial surplus food listings so the prototype works out of the box.
 */
export function seedDatabase(db = getDb()) {
  const categories = [
    ["Cooked Meals", 6, 1],
    ["Bakery & Bread", 24, 0],
    ["Fruits & Vegetables", 48, 0],
    ["Packaged Dry Goods", 168, 0],
    ["Dairy & Perishables", 12, 1],
  ];

  const insertCat = db.prepare(`
    INSERT OR IGNORE INTO food_categories (category_name, default_shelf_life_hours, requires_refrigeration)
    VALUES (?, ?, ?)
  `);
  for (const [name, hours, refrig] of categories) {
    insertCat.run(name, hours, refrig);
  }

  const adminPasswordHash = bcrypt.hashSync("PPiiYY@@63", 10);
  const legacyAdmin = db.prepare("SELECT user_id FROM users WHERE email = ?").get("admin@foodbridge.org");
  if (legacyAdmin) {
    db.prepare("UPDATE users SET email = ?, password_hash = ? WHERE user_id = ?").run(
      "roy638878@gmail.com",
      adminPasswordHash,
      legacyAdmin.user_id
    );
  }

  const existingAdmin = db.prepare("SELECT user_id FROM users WHERE email = ?").get("roy638878@gmail.com");
  if (existingAdmin) {
    return;
  }

  const passwordHash = bcrypt.hashSync("FoodBridge@123", 10);

  // 1. Admin
  const adminRes = db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, account_status)
    VALUES (?, ?, ?, ?, 'admin', 'active')
  `).run("Platform Admin", "roy638878@gmail.com", "+91-9000000001", adminPasswordHash);

  // 2. Verified Donor (Campus Mess / Restaurant)
  const donorUserRes = db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, account_status)
    VALUES (?, ?, ?, ?, 'donor', 'active')
  `).run("Aarav Sharma", "donor@foodbridge.org", "+91-9000000002", passwordHash);

  const donorRes = db.prepare(`
    INSERT INTO donors (user_id, donor_type, organization_name, address, city, postal_code, verification_status, avg_rating)
    VALUES (?, 'college_mess', 'Sunrise Campus Central Mess', 'Block C, University Road', 'Pune', '411004', 'verified', 4.9)
  `).run(donorUserRes.lastInsertRowid);

  // 3. Verified NGO
  const ngoUserRes = db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, account_status)
    VALUES (?, ?, ?, ?, 'ngo', 'active')
  `).run("Meera Nair", "ngo@foodbridge.org", "+91-9000000003", passwordHash);

  db.prepare(`
    INSERT INTO ngos (user_id, ngo_name, registration_number, address, city, service_area, daily_capacity_servings, verification_status, verified_at)
    VALUES (?, 'HopePlate Foundation', 'NGO-MH-2024-8812', '42 Station Road, Shivajinagar', 'Pune', 'Central Pune & Camp', 250, 'verified', datetime('now'))
  `).run(ngoUserRes.lastInsertRowid);

  // 4. Pending NGO (for Admin verification demo)
  const pendingNgoUser = db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, account_status)
    VALUES (?, ?, ?, ?, 'ngo', 'active')
  `).run("Rohan Verma", "pending.ngo@foodbridge.org", "+91-9000000004", passwordHash);

  db.prepare(`
    INSERT INTO ngos (user_id, ngo_name, registration_number, address, city, service_area, daily_capacity_servings, verification_status)
    VALUES (?, 'Annapurna Community Kitchen', 'NGO-MH-2025-1104', '18 MG Road', 'Pune', 'Kothrud & Deccan', 120, 'pending')
  `).run(pendingNgoUser.lastInsertRowid);

  // 5. Sample Active Food Listings
  const now = Date.now();
  const oneHourAgo = new Date(now - 1 * 3600 * 1000).toISOString();
  const inFourHours = new Date(now + 4 * 3600 * 1000).toISOString();
  const inTenHours = new Date(now + 10 * 3600 * 1000).toISOString();
  const inEighteenHours = new Date(now + 18 * 3600 * 1000).toISOString();

  const cookedCat = db.prepare("SELECT category_id FROM food_categories WHERE category_name = 'Cooked Meals'").get();
  const bakeryCat = db.prepare("SELECT category_id FROM food_categories WHERE category_name = 'Bakery & Bread'").get();
  const produceCat = db.prepare("SELECT category_id FROM food_categories WHERE category_name = 'Fruits & Vegetables'").get();

  const insertListing = db.prepare(`
    INSERT INTO food_listings (
      donor_id, category_id, title, description, food_type,
      total_quantity, remaining_quantity, unit, storage_type,
      allergen_info, safety_checklist_passed, prepared_at, expiry_at,
      pickup_address, city, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'available')
  `);

  insertListing.run(
    donorRes.lastInsertRowid,
    cookedCat.category_id,
    "Fresh Veg Pulao & Dal Tadka",
    "Surplus untouched lunch trays kept covered in insulated hot boxes.",
    "veg",
    60,
    60,
    "servings",
    "hot_held",
    "None (prepared in dairy-free oil)",
    oneHourAgo,
    inFourHours,
    "Block C, University Road, Pune",
    "Pune"
  );

  insertListing.run(
    donorRes.lastInsertRowid,
    bakeryCat.category_id,
    "Whole Wheat Sandwich Loaves & Buns",
    "Sealed bakery packets from morning batch, unopened.",
    "vegan",
    35,
    35,
    "packets",
    "ambient",
    "Contains gluten/wheat",
    oneHourAgo,
    inTenHours,
    "Block C, University Road, Pune",
    "Pune"
  );

  insertListing.run(
    donorRes.lastInsertRowid,
    produceCat.category_id,
    "Fresh Bananas & Apples Crate",
    "Clean sorted surplus fruit crates from campus pantry.",
    "vegan",
    25,
    25,
    "kg",
    "refrigerated",
    "None",
    oneHourAgo,
    inEighteenHours,
    "Block C, University Road, Pune",
    "Pune"
  );

  db.prepare(`
    INSERT INTO admin_logs (admin_id, action_type, target_table, target_id, details)
    VALUES (?, 'SYSTEM_SEED', 'users', ?, 'Initialized demo accounts and sample listings')
  `).run(adminRes.lastInsertRowid, adminRes.lastInsertRowid);
}

// Allow direct execution via `npm run seed`
const isDirectRun = process.argv[1] && process.argv[1].endsWith("seed.js");
if (isDirectRun) {
  const db = getDb();
  seedDatabase(db);
  console.log("FoodBridge database seeded successfully.");
}
