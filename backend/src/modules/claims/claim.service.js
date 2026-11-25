import crypto from "crypto";
import { runTransaction } from "../../config/db.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { createNotification } from "../notifications/notification.service.js";

export function createFoodClaim(db, ngoUserId, { listing_id, claimed_quantity, fulfillment_type, notes }) {
  return runTransaction(db, () => {
    const ngo = db.prepare("SELECT * FROM ngos WHERE user_id = ?").get(ngoUserId);
    if (!ngo) throw new AppError("NGO/Receiver profile not found.", 404);
    if (ngo.verification_status !== "verified") {
      throw new AppError(
        "Your NGO account is pending admin verification and cannot claim food yet.",
        403
      );
    }

    const listing = db
      .prepare(
        `SELECT fl.*, d.user_id AS donor_user_id
         FROM food_listings fl
         JOIN donors d ON d.donor_id = fl.donor_id
         WHERE fl.listing_id = ?`
      )
      .get(listing_id);

    if (!listing) throw new AppError("Food listing not found.", 404);
    if (!listing.safety_checklist_passed) {
      throw new AppError("Listing did not pass safety verification.", 400);
    }
    if (new Date(listing.expiry_at) <= new Date()) {
      db.prepare("UPDATE food_listings SET status = 'expired' WHERE listing_id = ?").run(listing_id);
      throw new AppError("This food listing has already expired.", 400);
    }
    if (!["available", "partially_claimed"].includes(listing.status)) {
      throw new AppError("This food listing is no longer available.", 409);
    }
    if (claimed_quantity > listing.remaining_quantity) {
      throw new AppError(
        `Only ${listing.remaining_quantity} ${listing.unit} remaining.`,
        400
      );
    }

    const newRemaining = listing.remaining_quantity - claimed_quantity;
    const newListingStatus = newRemaining === 0 ? "reserved" : "partially_claimed";
    db.prepare(
      "UPDATE food_listings SET remaining_quantity = ?, status = ? WHERE listing_id = ?"
    ).run(newRemaining, newListingStatus, listing_id);

    const handoverOtp = crypto.randomInt(100000, 999999).toString();
    const claimInsert = db
      .prepare(
        `INSERT INTO food_claims (listing_id, ngo_id, claimed_quantity, fulfillment_type, handover_otp, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`
      )
      .run(listing_id, ngo.ngo_id, claimed_quantity, fulfillment_type, handoverOtp, notes || null);

    createNotification(db, {
      userId: listing.donor_user_id,
      title: "New Food Claim Request",
      message: `${ngo.ngo_name} requested ${claimed_quantity} ${listing.unit} of "${listing.title}".`,
      type: "claim_new",
    });

    return db
      .prepare("SELECT * FROM food_claims WHERE claim_id = ?")
      .get(Number(claimInsert.lastInsertRowid));
  });
}

export function listDonorClaims(db, donorUserId) {
  const donor = db.prepare("SELECT donor_id FROM donors WHERE user_id = ?").get(donorUserId);
  if (!donor) throw new AppError("Donor profile not found.", 404);

  return db
    .prepare(
      `SELECT fc.claim_id, fc.listing_id, fc.ngo_id, fc.claimed_quantity, fc.fulfillment_type,
              fc.notes, fc.status, fc.claimed_at, fc.updated_at,
              fl.title AS listing_title, fl.unit, fl.expiry_at, fl.pickup_address,
              n.ngo_name, n.city AS ngo_city, u.phone AS ngo_phone,
              pr.pickup_id, pr.scheduled_pickup_at, pr.volunteer_name, pr.volunteer_phone, pr.status AS pickup_status
       FROM food_claims fc
       JOIN food_listings fl ON fl.listing_id = fc.listing_id
       JOIN ngos n ON n.ngo_id = fc.ngo_id
       JOIN users u ON u.user_id = n.user_id
       LEFT JOIN pickup_requests pr ON pr.claim_id = fc.claim_id
       WHERE fl.donor_id = ?
       ORDER BY fc.claim_id DESC`
    )
    .all(donor.donor_id);
}

export function listNgoClaims(db, ngoUserId) {
  const ngo = db.prepare("SELECT ngo_id FROM ngos WHERE user_id = ?").get(ngoUserId);
  if (!ngo) throw new AppError("NGO profile not found.", 404);

  return db
    .prepare(
      `SELECT fc.*, fl.title AS listing_title, fl.unit, fl.expiry_at, fl.pickup_address,
              fl.storage_type, fl.food_type,
              d.organization_name AS donor_name, d.user_id AS donor_user_id, u.phone AS donor_phone,
              pr.pickup_id, pr.scheduled_pickup_at, pr.volunteer_name, pr.volunteer_phone, pr.status AS pickup_status,
              r.review_id
       FROM food_claims fc
       JOIN food_listings fl ON fl.listing_id = fc.listing_id
       JOIN donors d ON d.donor_id = fl.donor_id
       JOIN users u ON u.user_id = d.user_id
       LEFT JOIN pickup_requests pr ON pr.claim_id = fc.claim_id
       LEFT JOIN reviews r ON r.claim_id = fc.claim_id
       WHERE fc.ngo_id = ?
       ORDER BY fc.claim_id DESC`
    )
    .all(ngo.ngo_id);
}

export function decideClaim(db, claimId, donorUserId, decision) {
  return runTransaction(db, () => {
    const claim = db
      .prepare(
        `SELECT fc.*, fl.donor_id, fl.title, fl.unit, fl.remaining_quantity, fl.total_quantity,
                d.user_id AS donor_user_id, n.user_id AS ngo_user_id
         FROM food_claims fc
         JOIN food_listings fl ON fl.listing_id = fc.listing_id
         JOIN donors d ON d.donor_id = fl.donor_id
         JOIN ngos n ON n.ngo_id = fc.ngo_id
         WHERE fc.claim_id = ?`
      )
      .get(claimId);

    if (!claim) throw new AppError("Claim not found.", 404);
    if (claim.donor_user_id !== donorUserId) {
      throw new AppError("Only the donor who posted this listing can approve or reject claims.", 403);
    }
    if (claim.status !== "pending") {
      throw new AppError(`Claim has already been ${claim.status}.`, 409);
    }

    db.prepare(
      "UPDATE food_claims SET status = ?, updated_at = datetime('now') WHERE claim_id = ?"
    ).run(decision, claimId);

    if (decision === "rejected") {
      const restored = claim.remaining_quantity + claim.claimed_quantity;
      const listingStatus = restored >= claim.total_quantity ? "available" : "partially_claimed";
      db.prepare(
        "UPDATE food_listings SET remaining_quantity = ?, status = ? WHERE listing_id = ?"
      ).run(restored, listingStatus, claim.listing_id);
    }

    createNotification(db, {
      userId: claim.ngo_user_id,
      title: decision === "approved" ? "Claim Approved!" : "Claim Rejected",
      message:
        decision === "approved"
          ? `Your claim for "${claim.title}" was approved. Schedule pickup and present OTP ${claim.handover_otp} at handover.`
          : `Your claim for "${claim.title}" was declined by the donor.`,
      type: `claim_${decision}`,
    });

    return db.prepare("SELECT * FROM food_claims WHERE claim_id = ?").get(claimId);
  });
}

export function verifyHandoverOtp(db, claimId, donorUserId, otp) {
  return runTransaction(db, () => {
    const claim = db
      .prepare(
        `SELECT fc.*, fl.title, fl.remaining_quantity, d.user_id AS donor_user_id, n.user_id AS ngo_user_id
         FROM food_claims fc
         JOIN food_listings fl ON fl.listing_id = fc.listing_id
         JOIN donors d ON d.donor_id = fl.donor_id
         JOIN ngos n ON n.ngo_id = fc.ngo_id
         WHERE fc.claim_id = ?`
      )
      .get(claimId);

    if (!claim) throw new AppError("Claim not found.", 404);
    if (claim.donor_user_id !== donorUserId) {
      throw new AppError("Only the donor can verify handover OTP.", 403);
    }
    if (!["approved", "picked_up"].includes(claim.status)) {
      throw new AppError("Claim must be approved before confirming handover.", 400);
    }
    if (claim.handover_otp !== otp) {
      throw new AppError("Invalid 6-digit handover OTP. Please verify with the collector.", 400);
    }

    db.prepare(
      "UPDATE food_claims SET status = 'completed', updated_at = datetime('now') WHERE claim_id = ?"
    ).run(claimId);

    db.prepare(
      "UPDATE pickup_requests SET status = 'collected' WHERE claim_id = ?"
    ).run(claimId);

    // If no remaining servings and no other open claims, mark listing completed
    const openOther = db
      .prepare(
        "SELECT claim_id FROM food_claims WHERE listing_id = ? AND claim_id != ? AND status IN ('pending', 'approved', 'picked_up')"
      )
      .get(claim.listing_id, claimId);

    if (claim.remaining_quantity === 0 && !openOther) {
      db.prepare("UPDATE food_listings SET status = 'completed' WHERE listing_id = ?").run(
        claim.listing_id
      );
    }

    createNotification(db, {
      userId: claim.ngo_user_id,
      title: "Handover Confirmed",
      message: `Food handover for "${claim.title}" is complete. Please leave a hygiene & quality rating!`,
      type: "handover_complete",
    });

    return db.prepare("SELECT * FROM food_claims WHERE claim_id = ?").get(claimId);
  });
}

export function reportUnsafeFood(db, claimId, ngoUserId, reason) {
  return runTransaction(db, () => {
    const claim = db
      .prepare(
        `SELECT fc.*, fl.title, d.user_id AS donor_user_id, n.user_id AS ngo_user_id
         FROM food_claims fc
         JOIN food_listings fl ON fl.listing_id = fc.listing_id
         JOIN donors d ON d.donor_id = fl.donor_id
         JOIN ngos n ON n.ngo_id = fc.ngo_id
         WHERE fc.claim_id = ?`
      )
      .get(claimId);

    if (!claim) throw new AppError("Claim not found.", 404);
    if (claim.ngo_user_id !== ngoUserId) {
      throw new AppError("Only the claiming NGO can report a handover safety issue.", 403);
    }

    db.prepare(
      "UPDATE food_claims SET status = 'cancelled', notes = ?, updated_at = datetime('now') WHERE claim_id = ?"
    ).run(`UNSAFE REPORT: ${reason}`, claimId);

    db.prepare("UPDATE food_listings SET status = 'flagged_unsafe' WHERE listing_id = ?").run(
      claim.listing_id
    );

    const admins = db.prepare("SELECT user_id FROM users WHERE role = 'admin'").all();
    for (const admin of admins) {
      createNotification(db, {
        userId: admin.user_id,
        title: "URGENT: Unsafe Food Flagged",
        message: `Listing #${claim.listing_id} ("${claim.title}") was rejected during pickup inspection: ${reason}`,
        type: "safety_alert",
      });
    }

    createNotification(db, {
      userId: claim.donor_user_id,
      title: "Listing Flagged During Inspection",
      message: `Your listing "${claim.title}" was flagged during handover inspection: ${reason}`,
      type: "safety_alert",
    });

    return { listing_id: claim.listing_id, status: "flagged_unsafe" };
  });
}
