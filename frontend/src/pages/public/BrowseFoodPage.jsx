import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import FoodCard from "../../components/food/FoodCard";

const PAGE_SIZE = 12;

function FoodGridSkeleton() {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading food listings">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div
          key={n}
          className="h-[390px] animate-pulse rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="h-40 rounded-xl bg-stone-200" />
          <div className="mt-4 h-4 w-24 rounded bg-stone-200" />
          <div className="mt-3 h-5 w-3/4 rounded bg-stone-200" />
          <div className="mt-2 h-3 w-full rounded bg-stone-100" />
          <div className="mt-6 h-9 w-full rounded-xl bg-stone-200" />
        </div>
      ))}
    </div>
  );
}

export default function BrowseFoodPage() {
  usePageMeta(
    "Browse Surplus Food",
    "Search live non-expired surplus food listings verified with safety & storage checklists."
  );

  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", city: "", category_id: "", food_type: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [claimQty, setClaimQty] = useState(1);
  const [fulfillmentType, setFulfillmentType] = useState("pickup");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const loadListings = useCallback(async (activeFilters, targetPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      params.set("limit", String(PAGE_SIZE));
      params.set("page", String(targetPage));

      const listData = await apiRequest(`/listings?${params.toString()}`);
      setListings(listData);
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiRequest("/categories")
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadListings(filters, page);
  }, [page, loadListings]);

  useEffect(() => {
    if (!selectedListing) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setSelectedListing(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedListing]);

  const openClaimModal = useCallback((listing) => {
    setSelectedListing(listing);
    setClaimQty(Math.min(10, listing.remaining_quantity));
    setFulfillmentType("pickup");
    setNotes("");
    setFeedback({ type: "", text: "" });
  }, []);

  async function submitClaim(e) {
    e.preventDefault();
    try {
      await apiRequest("/claims", {
        method: "POST",
        body: {
          listing_id: selectedListing.listing_id,
          claimed_quantity: Number(claimQty),
          fulfillment_type: fulfillmentType,
          notes,
        },
      });
      setSelectedListing(null);
      setFeedback({
        type: "success",
        text: "Claim submitted! Track approval & your handover OTP in the NGO Hub.",
      });
      loadListings(filters, page);
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  }

  const canClaim = Boolean(user && (user.role === "ngo" || user.role === "receiver"));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Available Surplus Food</h1>
        <p className="text-sm text-stone-600">
          Live non-expired food listings verified against safety &amp; storage checklists.
        </p>
      </div>

      {feedback.text && (
        <div
          role="status"
          className={`mt-4 rounded-xl p-3 text-sm font-medium ${
            feedback.type === "error"
              ? "bg-rose-50 text-rose-800"
              : "bg-emerald-50 text-emerald-900"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          loadListings(filters, 1);
        }}
        className="mt-6 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-5"
      >
        <div className="relative sm:col-span-2">
          <label htmlFor="filter-search" className="sr-only">
            Search meal or item
          </label>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-500" aria-hidden="true" />
          <input
            id="filter-search"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search meal or item..."
            className="w-full rounded-xl border border-stone-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="filter-city" className="sr-only">
            City
          </label>
          <input
            id="filter-city"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            placeholder="City (e.g. Pune)"
            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="filter-category" className="sr-only">
            Category
          </label>
          <select
            id="filter-category"
            value={filters.category_id}
            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Apply Filters
        </button>
      </form>

      {loading ? (
        <FoodGridSkeleton />
      ) : listings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-600">
          No active non-expired surplus food matches your filters right now.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => (
              <FoodCard
                key={item.listing_id}
                listing={item}
                canClaim={canClaim}
                onClaimClick={openClaimModal}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between text-xs text-stone-700">
            <span>Page {page}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={listings.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selectedListing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="claim-modal-title" className="text-lg font-bold text-stone-900">
              Claim: {selectedListing.title}
            </h2>
            <p className="mt-1 text-xs text-stone-600">
              Remaining: {selectedListing.remaining_quantity} {selectedListing.unit} · Pickup:{" "}
              {selectedListing.pickup_address}
            </p>
            <form onSubmit={submitClaim} className="mt-4 space-y-4">
              <div>
                <label htmlFor="claim-qty" className="block text-xs font-semibold text-stone-700">
                  Quantity to Claim ({selectedListing.unit})
                </label>
                <input
                  id="claim-qty"
                  type="number"
                  min={1}
                  max={selectedListing.remaining_quantity}
                  required
                  value={claimQty}
                  onChange={(e) => setClaimQty(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="claim-fulfillment" className="block text-xs font-semibold text-stone-700">
                  Fulfillment
                </label>
                <select
                  id="claim-fulfillment"
                  value={fulfillmentType}
                  onChange={(e) => setFulfillmentType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="pickup">Self Pickup by NGO Volunteer</option>
                  <option value="delivery">Delivery Coordination Needed</option>
                </select>
              </div>
              <div>
                <label htmlFor="claim-notes" className="block text-xs font-semibold text-stone-700">
                  Pickup Notes
                </label>
                <textarea
                  id="claim-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional container / vehicle note"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="flex-1 rounded-xl border border-stone-300 py-2 text-sm font-medium text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
