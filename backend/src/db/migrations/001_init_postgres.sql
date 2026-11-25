-- FoodBridge Production PostgreSQL Schema
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('donor', 'ngo', 'receiver', 'admin')),
    account_status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('pending', 'active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donors (
    donor_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    donor_type VARCHAR(30) NOT NULL DEFAULT 'individual'
        CHECK (donor_type IN ('individual', 'restaurant', 'college_mess', 'marriage_hall', 'caterer')),
    organization_name VARCHAR(150),
    address TEXT NOT NULL,
    city VARCHAR(80) NOT NULL,
    postal_code VARCHAR(20),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    avg_rating NUMERIC(3,2) NOT NULL DEFAULT 5.00
);

CREATE TABLE IF NOT EXISTS ngos (
    ngo_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    ngo_name VARCHAR(150) NOT NULL,
    registration_number VARCHAR(80) UNIQUE,
    document_url TEXT,
    address TEXT NOT NULL,
    city VARCHAR(80) NOT NULL,
    service_area VARCHAR(150),
    daily_capacity_servings INT NOT NULL DEFAULT 50 CHECK (daily_capacity_servings > 0),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS food_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(80) NOT NULL UNIQUE,
    default_shelf_life_hours INT NOT NULL CHECK (default_shelf_life_hours > 0),
    requires_refrigeration BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS food_listings (
    listing_id SERIAL PRIMARY KEY,
    donor_id INT NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES food_categories(category_id),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    food_type VARCHAR(20) NOT NULL CHECK (food_type IN ('veg', 'non_veg', 'vegan')),
    total_quantity INT NOT NULL CHECK (total_quantity > 0),
    remaining_quantity INT NOT NULL CHECK (remaining_quantity >= 0),
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('servings', 'kg', 'packets', 'boxes')),
    storage_type VARCHAR(20) NOT NULL CHECK (storage_type IN ('ambient', 'refrigerated', 'frozen', 'hot_held')),
    allergen_info VARCHAR(200),
    safety_checklist_passed BOOLEAN NOT NULL DEFAULT FALSE,
    prepared_at TIMESTAMPTZ NOT NULL,
    expiry_at TIMESTAMPTZ NOT NULL,
    pickup_address TEXT NOT NULL,
    city VARCHAR(80) NOT NULL,
    image_url TEXT,
    status VARCHAR(25) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'partially_claimed', 'reserved', 'completed', 'expired', 'cancelled', 'flagged_unsafe')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_expiry_after_prepared CHECK (expiry_at > prepared_at),
    CONSTRAINT chk_remaining_lte_total CHECK (remaining_quantity <= total_quantity)
);

CREATE TABLE IF NOT EXISTS food_claims (
    claim_id SERIAL PRIMARY KEY,
    listing_id INT NOT NULL REFERENCES food_listings(listing_id) ON DELETE CASCADE,
    ngo_id INT NOT NULL REFERENCES ngos(ngo_id) ON DELETE CASCADE,
    claimed_quantity INT NOT NULL CHECK (claimed_quantity > 0),
    fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'pickup'
        CHECK (fulfillment_type IN ('pickup', 'delivery')),
    handover_otp VARCHAR(6) NOT NULL,
    notes TEXT,
    status VARCHAR(25) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'picked_up', 'completed', 'cancelled')),
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pickup_requests (
    pickup_id SERIAL PRIMARY KEY,
    claim_id INT NOT NULL UNIQUE REFERENCES food_claims(claim_id) ON DELETE CASCADE,
    pickup_address TEXT NOT NULL,
    scheduled_pickup_at TIMESTAMPTZ NOT NULL,
    volunteer_name VARCHAR(120),
    volunteer_phone VARCHAR(20),
    status VARCHAR(25) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'en_route', 'arrived', 'collected', 'failed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS delivery_details (
    delivery_id SERIAL PRIMARY KEY,
    pickup_id INT NOT NULL UNIQUE REFERENCES pickup_requests(pickup_id) ON DELETE CASCADE,
    dropoff_address TEXT NOT NULL,
    delivery_partner VARCHAR(80) NOT NULL DEFAULT 'in_house_volunteer',
    tracking_code VARCHAR(100),
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    proof_image_url TEXT,
    delivery_status VARCHAR(25) NOT NULL DEFAULT 'pending'
        CHECK (delivery_status IN ('pending', 'assigned', 'in_transit', 'delivered', 'failed'))
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'system',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id SERIAL PRIMARY KEY,
    claim_id INT NOT NULL UNIQUE REFERENCES food_claims(claim_id) ON DELETE CASCADE,
    reviewer_id INT NOT NULL REFERENCES users(user_id),
    target_user_id INT NOT NULL REFERENCES users(user_id),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    hygiene_issue_reported BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
    log_id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL REFERENCES users(user_id),
    action_type VARCHAR(60) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id INT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_discovery ON food_listings (status, city, expiry_at);
CREATE INDEX IF NOT EXISTS idx_claims_ngo_status ON food_claims (ngo_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read);
