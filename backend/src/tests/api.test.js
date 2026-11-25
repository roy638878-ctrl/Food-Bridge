import test from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../config/db.js";
import { createApp } from "../app.js";

function setupTestServer() {
  const db = getDb(":memory:");
  const app = createApp({ db, seed: true });
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}`, db });
    });
  });
}

async function api(baseUrl, path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

test("FoodBridge End-to-End API Workflow & Safety Rules", async () => {
  const { server, baseUrl, db } = await setupTestServer();
  try {
    // 1. Health check
    const health = await api(baseUrl, "/health");
    assert.equal(health.status, 200);
    assert.equal(health.json.success, true);

    // 2. Login seeded Donor, Verified NGO, Pending NGO, Admin
    const donorLogin = await api(baseUrl, "/api/v1/auth/login", {
      method: "POST",
      body: { email: "donor@foodbridge.org", password: "FoodBridge@123" },
    });
    assert.equal(donorLogin.status, 200);
    const donorToken = donorLogin.json.data.token;

    const ngoLogin = await api(baseUrl, "/api/v1/auth/login", {
      method: "POST",
      body: { email: "ngo@foodbridge.org", password: "FoodBridge@123" },
    });
    const ngoToken = ngoLogin.json.data.token;

    const pendingNgoLogin = await api(baseUrl, "/api/v1/auth/login", {
      method: "POST",
      body: { email: "pending.ngo@foodbridge.org", password: "FoodBridge@123" },
    });
    const pendingNgoToken = pendingNgoLogin.json.data.token;

    const adminLogin = await api(baseUrl, "/api/v1/auth/login", {
      method: "POST",
      body: { email: "roy638878@gmail.com", password: "PPiiYY@@63" },
    });
    const adminToken = adminLogin.json.data.token;

    // 3. RBAC check: donor cannot access admin routes
    const forbiddenAdmin = await api(baseUrl, "/api/v1/admin/analytics", { token: donorToken });
    assert.equal(forbiddenAdmin.status, 403);

    // 4. Safety checklist enforcement: listing without safety_checklist_passed must fail
    const unsafePost = await api(baseUrl, "/api/v1/listings", {
      method: "POST",
      token: donorToken,
      body: {
        category_id: 1,
        title: "Unchecked Meals",
        food_type: "veg",
        total_quantity: 20,
        unit: "servings",
        storage_type: "hot_held",
        safety_checklist_passed: false,
        prepared_at: new Date(Date.now() - 3600000).toISOString(),
        expiry_at: new Date(Date.now() + 4 * 3600000).toISOString(),
        pickup_address: "Campus Road",
        city: "Pune",
      },
    });
    assert.equal(unsafePost.status, 400);

    // 5. Valid listing creation
    const validPost = await api(baseUrl, "/api/v1/listings", {
      method: "POST",
      token: donorToken,
      body: {
        category_id: 1,
        title: "Evening Mess Rice & Curry",
        food_type: "veg",
        total_quantity: 40,
        unit: "servings",
        storage_type: "hot_held",
        safety_checklist_passed: true,
        prepared_at: new Date(Date.now() - 1800000).toISOString(),
        expiry_at: new Date(Date.now() + 3 * 3600000).toISOString(),
        pickup_address: "Campus Road",
        city: "Pune",
      },
    });
    assert.equal(validPost.status, 201);
    const listingId = validPost.json.data.listing_id;

    // 6. Pending NGO cannot claim food until verified
    const blockedClaim = await api(baseUrl, "/api/v1/claims", {
      method: "POST",
      token: pendingNgoToken,
      body: { listing_id: listingId, claimed_quantity: 10, fulfillment_type: "pickup" },
    });
    assert.equal(blockedClaim.status, 403);

    // 7. Verified NGO claims 40 servings
    const claimRes = await api(baseUrl, "/api/v1/claims", {
      method: "POST",
      token: ngoToken,
      body: { listing_id: listingId, claimed_quantity: 40, fulfillment_type: "pickup" },
    });
    assert.equal(claimRes.status, 201);
    const claimId = claimRes.json.data.claim_id;
    const otp = claimRes.json.data.handover_otp;

    // 8. Second claim on reserved listing fails (prevents double-claiming)
    const doubleClaim = await api(baseUrl, "/api/v1/claims", {
      method: "POST",
      token: ngoToken,
      body: { listing_id: listingId, claimed_quantity: 5, fulfillment_type: "pickup" },
    });
    assert.equal(doubleClaim.status, 409);

    // 9. Donor approves claim, NGO schedules pickup, Donor verifies OTP handover
    const approveRes = await api(baseUrl, `/api/v1/claims/${claimId}/decision`, {
      method: "PATCH",
      token: donorToken,
      body: { decision: "approved" },
    });
    assert.equal(approveRes.status, 200);

    const pickupRes = await api(baseUrl, "/api/v1/pickups", {
      method: "POST",
      token: ngoToken,
      body: {
        claim_id: claimId,
        scheduled_pickup_at: new Date(Date.now() + 1800000).toISOString(),
        volunteer_name: "Kiran",
        volunteer_phone: "9876543210",
      },
    });
    assert.equal(pickupRes.status, 201);

    const wrongOtp = await api(baseUrl, `/api/v1/claims/${claimId}/verify-handover`, {
      method: "POST",
      token: donorToken,
      body: { otp: "000000" },
    });
    assert.equal(wrongOtp.status, 400);

    const handoverRes = await api(baseUrl, `/api/v1/claims/${claimId}/verify-handover`, {
      method: "POST",
      token: donorToken,
      body: { otp },
    });
    assert.equal(handoverRes.status, 200);
    assert.equal(handoverRes.json.data.status, "completed");

    // 10. Admin analytics reflects 40 servings redistributed
    const analytics = await api(baseUrl, "/api/v1/admin/analytics", { token: adminToken });
    assert.equal(analytics.status, 200);
    assert.equal(analytics.json.data.totalServingsRedistributed, 40);
  } finally {
    server.close();
    db.close();
  }
});
