import { useCallback, useEffect, useState } from "react";
import { Check, PlusCircle, ShieldCheck, X } from "lucide-react";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";

function defaultLocalDatetime(offsetHours) {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DonorDashboard() {
  usePageMeta("Donor Hub", "Post surplus food safely, approve NGO claims, and verify OTP handovers.");
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [claims, setClaims] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    category_id: "1",
    title: "",
    description: "",
    food_type: "veg",
    total_quantity: 25,
    unit: "servings",
    storage_type: "hot_held",
    allergen_info: "",
    safety_checklist_passed: false,
    prepared_at: defaultLocalDatetime(-1),
    expiry_at: defaultLocalDatetime(4),
    pickup_address: user?.profile?.address || "",
    city: user?.profile?.city || "Pune",
  });

  const loadDashboard = useCallback(async () => {
    try {
      const [myListings, donorClaims, cats] = await Promise.all([
        apiRequest("/listings/mine"),
        apiRequest("/claims/donor"),
        apiRequest("/categories"),
      ]);
      setListings(myListings);
      setClaims(donorClaims);
      setCategories(cats);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handlePublish(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (key === "prepared_at" || key === "expiry_at") {
          body.append(key, new Date(val).toISOString());
        } else {
          body.append(key, String(val));
        }
      });
      if (imageFile) body.append("image", imageFile);

      await apiRequest("/listings", { method: "POST", body, isFormData: true });
      setMessage({ type: "success", text: "Surplus food listing published!" });
      setForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        safety_checklist_passed: false,
      }));
      setImageFile(null);
      loadDashboard();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDecision(claimId, decision) {
    try {
      await apiRequest(`/claims/${claimId}/decision`, {
        method: "PATCH",
        body: { decision },
      });
      setMessage({ type: "success", text: `Claim ${decision}.` });
      loadDashboard();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleVerifyOtp(claimId) {
    try {
      await apiRequest(`/claims/${claimId}/verify-handover`, {
        method: "POST",
        body: { otp: otpInputs[claimId] || "" },
      });
      setMessage({ type: "success", text: "Food handover verified & completed!" });
      loadDashboard();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Donor Hub</h1>
        <p className="text-sm text-stone-600">
          {user?.profile?.organization_name || user?.full_name} · Rating: {user?.profile?.avg_rating ?? "5.0"} ★
        </p>
      </div>

      <div className="min-h-[20px]">
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
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <form
          onSubmit={handlePublish}
          className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-2"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
            <PlusCircle className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            Post Surplus Food
          </h2>

          <div>
            <label htmlFor="donor-title" className="block text-xs font-semibold text-stone-700">
              Title
            </label>
            <input
              id="donor-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Fresh Veg Biryani Trays"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="donor-category" className="block text-xs font-semibold text-stone-700">
                Category
              </label>
              <select
                id="donor-category"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="donor-diet" className="block text-xs font-semibold text-stone-700">
                Diet Type
              </label>
              <select
                id="donor-diet"
                value={form.food_type}
                onChange={(e) => setForm({ ...form, food_type: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="veg">Veg</option>
                <option value="vegan">Vegan</option>
                <option value="non_veg">Non-Veg</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="donor-qty" className="block text-xs font-semibold text-stone-700">
                Quantity
              </label>
              <input
                id="donor-qty"
                type="number"
                min={1}
                required
                value={form.total_quantity}
                onChange={(e) => setForm({ ...form, total_quantity: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="donor-unit" className="block text-xs font-semibold text-stone-700">
                Unit
              </label>
              <select
                id="donor-unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
              >
                <option value="servings">servings</option>
                <option value="kg">kg</option>
                <option value="packets">packets</option>
                <option value="boxes">boxes</option>
              </select>
            </div>
            <div>
              <label htmlFor="donor-storage" className="block text-xs font-semibold text-stone-700">
                Storage
              </label>
              <select
                id="donor-storage"
                value={form.storage_type}
                onChange={(e) => setForm({ ...form, storage_type: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-2 py-2 text-sm"
              >
                <option value="hot_held">Hot Held</option>
                <option value="refrigerated">Refrigerated</option>
                <option value="frozen">Frozen</option>
                <option value="ambient">Room Temp</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="donor-prepared" className="block text-xs font-semibold text-stone-700">
                Prepared At
              </label>
              <input
                id="donor-prepared"
                type="datetime-local"
                required
                value={form.prepared_at}
                onChange={(e) => setForm({ ...form, prepared_at: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-2 py-2 text-xs"
              />
            </div>
            <div>
              <label htmlFor="donor-expiry" className="block text-xs font-semibold text-stone-700">
                Safe Until (Expiry)
              </label>
              <input
                id="donor-expiry"
                type="datetime-local"
                required
                value={form.expiry_at}
                onChange={(e) => setForm({ ...form, expiry_at: e.target.value })}
                className="mt-1 w-full rounded-xl border border-stone-300 px-2 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="donor-address" className="block text-xs font-semibold text-stone-700">
              Pickup Address &amp; City
            </label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <input
                id="donor-address"
                required
                value={form.pickup_address}
                onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
                placeholder="Street / Campus Block"
                className="col-span-2 rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                aria-label="City"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="donor-allergens" className="block text-xs font-semibold text-stone-700">
              Allergens / Notes
            </label>
            <input
              id="donor-allergens"
              value={form.allergen_info}
              onChange={(e) => setForm({ ...form, allergen_info: e.target.value })}
              placeholder="e.g., Contains peanuts / dairy"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="donor-photo" className="block text-xs font-semibold text-stone-700">
              Food Photo (Optional)
            </label>
            <input
              id="donor-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-xs text-stone-600"
            />
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-stone-800">
            <input
              type="checkbox"
              checked={form.safety_checklist_passed}
              onChange={(e) => setForm({ ...form, safety_checklist_passed: e.target.checked })}
              className="mt-0.5 accent-emerald-700"
            />
            <span>
              <strong>Mandatory Safety Check:</strong> I confirm this food is unspoiled, hygienically
              stored in clean covered containers, and safe for consumption until the declared expiry.
            </span>
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Publish Surplus Listing
          </button>
        </form>

        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">Incoming NGO Claims ({claims.length})</h2>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="h-24 animate-pulse rounded-xl bg-stone-100" />
              ) : claims.length === 0 ? (
                <p className="text-xs text-stone-600">No claims received yet.</p>
              ) : (
                claims.map((c) => (
                  <div key={c.claim_id} className="rounded-xl border border-stone-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-stone-900">
                          {c.ngo_name} · {c.claimed_quantity} {c.unit}
                        </p>
                        <p className="text-xs text-stone-600">
                          For: {c.listing_title} · Phone: {c.ngo_phone}
                        </p>
                      </div>
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-stone-800">
                        {c.status}
                      </span>
                    </div>

                    {c.volunteer_name && (
                      <p className="mt-2 text-xs text-emerald-800">
                        Pickup scheduled by {c.volunteer_name} ({c.volunteer_phone})
                      </p>
                    )}

                    {c.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecision(c.claim_id, "approved")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(c.claim_id, "rejected")}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-800"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" /> Reject
                        </button>
                      </div>
                    )}

                    {c.status === "approved" && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          aria-label={`Enter 6-digit OTP for claim ${c.claim_id}`}
                          placeholder="Enter NGO 6-digit OTP"
                          value={otpInputs[c.claim_id] || ""}
                          onChange={(e) =>
                            setOtpInputs({ ...otpInputs, [c.claim_id]: e.target.value })
                          }
                          className="w-44 rounded-lg border border-stone-300 px-3 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyOtp(c.claim_id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Confirm Handover
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">My Donations ({listings.length})</h2>
            <div className="mt-4 space-y-2">
              {loading ? (
                <div className="h-24 animate-pulse rounded-xl bg-stone-100" />
              ) : (
                listings.map((item) => (
                  <div
                    key={item.listing_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-stone-900">{item.title}</p>
                      <p className="text-stone-600">
                        Remaining: {item.remaining_quantity}/{item.total_quantity} {item.unit} · Expires:{" "}
                        {new Date(item.expiry_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 font-semibold uppercase text-stone-800 shadow-xs">
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
