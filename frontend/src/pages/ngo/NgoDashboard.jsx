import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, FileUp, ShieldAlert, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";

export default function NgoDashboard() {
  usePageMeta("NGO Hub", "Manage food claims, pickup schedules, handover OTPs, and quality reviews.");
  const { user, refreshUser } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [pickupTarget, setPickupTarget] = useState(null);
  const [pickupForm, setPickupForm] = useState({
    scheduled_pickup_at: "",
    volunteer_name: "",
    volunteer_phone: "",
  });
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
    hygiene_issue_reported: false,
  });

  const loadClaims = useCallback(async () => {
    try {
      const data = await apiRequest("/claims/ngo");
      setClaims(data);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  useEffect(() => {
    if (!pickupTarget && !reviewTarget) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setPickupTarget(null);
        setReviewTarget(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickupTarget, reviewTarget]);

  async function handleDocUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("document", file);
      await apiRequest("/ngos/me/document", { method: "POST", body: fd, isFormData: true });
      setMessage({ type: "success", text: "NGO certificate uploaded for admin review." });
      refreshUser();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function submitPickup(e) {
    e.preventDefault();
    try {
      await apiRequest("/pickups", {
        method: "POST",
        body: {
          claim_id: pickupTarget.claim_id,
          ...pickupForm,
          scheduled_pickup_at: new Date(pickupForm.scheduled_pickup_at).toISOString(),
        },
      });
      setPickupTarget(null);
      setMessage({ type: "success", text: "Pickup scheduled and donor notified!" });
      loadClaims();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleReportUnsafe(claimId) {
    const reason = window.prompt("Describe why the food is unsafe or spoiled:");
    if (!reason) return;
    try {
      await apiRequest(`/claims/${claimId}/report-unsafe`, {
        method: "POST",
        body: { reason },
      });
      setMessage({ type: "success", text: "Unsafe food flagged and reported to Admin." });
      loadClaims();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    try {
      await apiRequest("/reviews", {
        method: "POST",
        body: {
          claim_id: reviewTarget.claim_id,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
          hygiene_issue_reported: reviewForm.hygiene_issue_reported,
        },
      });
      setReviewTarget(null);
      setMessage({ type: "success", text: "Review submitted. Thank you!" });
      loadClaims();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  const verificationStatus = user?.profile?.verification_status || "pending";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">NGO &amp; Receiver Hub</h1>
          <p className="text-sm text-stone-600">
            {user?.profile?.ngo_name} · Capacity: {user?.profile?.daily_capacity_servings} servings/day
          </p>
        </div>
        <Link
          to="/browse"
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Browse Surplus Food
        </Link>
      </div>

      {verificationStatus !== "verified" && (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" aria-hidden="true" />
            <div className="text-xs text-amber-950">
              <p className="font-bold">Verification Status: {verificationStatus.toUpperCase()}</p>
              <p className="mt-0.5">
                Upload your NGO registration certificate so an Admin can verify your account for food claims.
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-300">
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Upload Certificate
            <input type="file" accept=".pdf,image/*" onChange={handleDocUpload} className="hidden" />
          </label>
        </div>
      )}

      {message.text && (
        <div
          role="status"
          className={`rounded-xl p-3 text-sm font-medium ${
            message.type === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900">My Food Claims ({claims.length})</h2>
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-100" />
              ))}
            </div>
          ) : claims.length === 0 ? (
            <p className="text-sm text-stone-600">
              You have not claimed any food yet. Visit Browse Surplus Food to claim available donations.
            </p>
          ) : (
            claims.map((c) => (
              <div key={c.claim_id} className="rounded-xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      {c.listing_title} ({c.claimed_quantity} {c.unit})
                    </h3>
                    <p className="text-xs text-stone-600">
                      Donor: {c.donor_name} ({c.donor_phone}) · Pickup: {c.pickup_address}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase text-stone-800">
                    {c.status}
                  </span>
                </div>

                {c.status === "approved" && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-3">
                    <div className="text-xs">
                      <span className="font-semibold text-emerald-950">Handover OTP: </span>
                      <span className="rounded bg-white px-2 py-0.5 font-mono text-sm font-bold text-emerald-800">
                        {c.handover_otp}
                      </span>
                      <span className="ml-2 text-emerald-900">
                        (Share only after inspecting food freshness)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!c.pickup_id && (
                        <button
                          type="button"
                          onClick={() => {
                            setPickupTarget(c);
                            setPickupForm({
                              scheduled_pickup_at: new Date(Date.now() + 1800000).toISOString().slice(0, 16),
                              volunteer_name: user.full_name,
                              volunteer_phone: user.phone,
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Schedule Pickup
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleReportUnsafe(c.claim_id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Report Unsafe Food
                      </button>
                    </div>
                  </div>
                )}

                {c.status === "completed" && !c.review_id && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setReviewTarget(c)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-300"
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" /> Rate Food Quality &amp; Hygiene
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {pickupTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pickup-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <form onSubmit={submitPickup} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6">
            <h3 id="pickup-modal-title" className="text-lg font-bold text-stone-900">
              Schedule Pickup
            </h3>
            <div>
              <label htmlFor="pickup-time" className="block text-xs font-semibold text-stone-700">
                Pickup Time
              </label>
              <input
                id="pickup-time"
                type="datetime-local"
                required
                value={pickupForm.scheduled_pickup_at}
                onChange={(e) => setPickupForm({ ...pickupForm, scheduled_pickup_at: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="pickup-name" className="block text-xs font-semibold text-stone-700">
                Collector / Volunteer Name
              </label>
              <input
                id="pickup-name"
                required
                value={pickupForm.volunteer_name}
                onChange={(e) => setPickupForm({ ...pickupForm, volunteer_name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="pickup-phone" className="block text-xs font-semibold text-stone-700">
                Collector Phone
              </label>
              <input
                id="pickup-phone"
                required
                value={pickupForm.volunteer_phone}
                onChange={(e) => setPickupForm({ ...pickupForm, volunteer_phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPickupTarget(null)}
                className="flex-1 rounded-xl border border-stone-300 py-2 text-sm text-stone-700"
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 rounded-xl bg-emerald-700 py-2 text-sm font-semibold text-white">
                Confirm Pickup
              </button>
            </div>
          </form>
        </div>
      )}

      {reviewTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <form onSubmit={submitReview} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6">
            <h3 id="review-modal-title" className="text-lg font-bold text-stone-900">
              Rate Donation Quality
            </h3>
            <div>
              <label htmlFor="review-rating" className="block text-xs font-semibold text-stone-700">
                Rating (1-5)
              </label>
              <select
                id="review-rating"
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              >
                <option value={5}>5 - Excellent &amp; Hygienic</option>
                <option value={4}>4 - Good</option>
                <option value={3}>3 - Acceptable</option>
                <option value={2}>2 - Substandard</option>
                <option value={1}>1 - Poor</option>
              </select>
            </div>
            <div>
              <label htmlFor="review-comment" className="block text-xs font-semibold text-stone-700">
                Comment
              </label>
              <textarea
                id="review-comment"
                rows={3}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-rose-800">
              <input
                type="checkbox"
                checked={reviewForm.hygiene_issue_reported}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, hygiene_issue_reported: e.target.checked })
                }
              />
              Report a packaging or hygiene concern
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="flex-1 rounded-xl border border-stone-300 py-2 text-sm text-stone-700"
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 rounded-xl bg-amber-400 py-2 text-sm font-bold text-stone-950">
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
