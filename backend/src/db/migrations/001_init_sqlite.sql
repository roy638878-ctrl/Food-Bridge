-- FoodBridge SQLite Prototype Schema (mirrors PostgreSQL 001_init_postgres.sql)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('donor', 'ngo', 'receiver', 'admin')),
    account_status TEXT NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('pending', 'active', 'suspended')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS donors (
    donor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    donor_type TEXT NOT NULL DEFAULT 'individual'
        CHECK (donor_type IN ('individual', 'restaurant', 'college_mess', 'marriage_hall', 'caterer')),
    organization_name TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT,
    latitude REAL,
    longitude REAL,
    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    avg_rating REAL NOT NULL DEFAULT 5.0
);

CREATE TABLE IF NOT EXISTS ngos (
    ngo_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    ngo_name TEXT NOT NULL,
    registration_number TEXT UNIQUE,
    document_url TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    service_area TEXT,
    daily_capacity_servings INTEGER NOT NULL DEFAULT 50 CHECK (daily_capacity_servings > 0),
    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TEXT
);

CREATE TABLE IF NOT EXISTS food_categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,
    default_shelf_life_hours INTEGER NOT NULL CHECK (default_shelf_life_hours > 0),
    requires_refrigeration INTEGER NOT NULL DEFAULT 0 CHECK (requires_refrigeration IN (0, 1))
);

CREATE TABLE IF NOT EXISTS food_listings (
    listing_id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_id INTEGER NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES food_categories(category_id),
    title TEXT NOT NULL,
    description TEXT,
    food_type TEXT NOT NULL CHECK (food_type IN ('veg', 'non_veg', 'vegan')),
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    remaining_quantity INTEGER NOT NULL CHECK (remaining_quantity >= 0),
    unit TEXT NOT NULL CHECK (unit IN ('servings', 'kg', 'packets', 'boxes')),
    storage_type TEXT NOT NULL CHECK (storage_type IN ('ambient', 'refrigerated', 'frozen', 'hot_held')),
    allergen_info TEXT,
    safety_checklist_passed INTEGER NOT NULL DEFAULT 0 CHECK (safety_checklist_passed IN (0, 1)),
    prepared_at TEXT NOT NULL,
    expiry_at TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    city TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'partially_claimed', 'reserved', 'completed', 'expired', 'cancelled', 'flagged_unsafe')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (remaining_quantity <= total_quantity)
);

CREATE TABLE IF NOT EXISTS food_claims (
    claim_id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL REFERENCES food_listings(listing_id) ON DELETE CASCADE,
    ngo_id INTEGER NOT NULL REFERENCES ngos(ngo_id) ON DELETE CASCADE,
    claimed_quantity INTEGER NOT NULL CHECK (claimed_quantity > 0),
    fulfillment_type TEXT NOT NULL DEFAULT 'pickup'
        CHECK (fulfillment_type IN ('pickup', 'delivery')),
    handover_otp TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'picked_up', 'completed', 'cancelled')),
    claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pickup_requests (
    pickup_id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER NOT NULL UNIQUE REFERENCES food_claims(claim_id) ON DELETE CASCADE,
    pickup_address TEXT NOT NULL,
    scheduled_pickup_at TEXT NOT NULL,
    volunteer_name TEXT,
    volunteer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'en_route', 'arrived', 'collected', 'failed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS delivery_details (
    delivery_id INTEGER PRIMARY KEY AUTOINCREMENT,
    pickup_id INTEGER NOT NULL UNIQUE REFERENCES pickup_requests(pickup_id) ON DELETE CASCADE,
    dropoff_address TEXT NOT NULL,
    delivery_partner TEXT NOT NULL DEFAULT 'in_house_volunteer',
    tracking_code TEXT,
    dispatched_at TEXT,
    delivered_at TEXT,
    proof_image_url TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (delivery_status IN ('pending', 'assigned', 'in_transit', 'delivered', 'failed'))
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER NOT NULL UNIQUE REFERENCES food_claims(claim_id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(user_id),
    target_user_id INTEGER NOT NULL REFERENCES users(user_id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    hygiene_issue_reported INTEGER NOT NULL DEFAULT 0 CHECK (hygiene_issue_reported IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL REFERENCES users(user_id),
    action_type TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partner_integrations (
    partner_id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_id INTEGER REFERENCES donors(donor_id) ON DELETE SET NULL,
    partner_name TEXT NOT NULL,
    partner_type TEXT NOT NULL CHECK (partner_type IN ('restaurant', 'ngo', 'college', 'marriage_hall', 'delivery')),
    api_key_hash TEXT NOT NULL UNIQUE,
    scopes TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_discovery ON food_listings (status, city, expiry_at);
CREATE INDEX IF NOT EXISTS idx_claims_ngo_status ON food_claims (ngo_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read);
