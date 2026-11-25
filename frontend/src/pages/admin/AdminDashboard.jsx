import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Package,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { usePageMeta } from "../../hooks/usePageMeta";

const PAGE_SIZE = 10;

const TABS = [
  { id: "all", label: "Overview" },
  { id: "ngos", label: "NGO Queue" },
  { id: "listings", label: "Food Listings" },
  { id: "logs", label: "Audit Logs" },
];

export default function AdminDashboard() {
  usePageMeta(
    "Admin Oversight Console",
    "FoodBridge Admin Oversight Console for NGO verification, food safety moderation, and audit logs."
  );

  const [analytics, setAnalytics] = useState(null);
  const [verifications, setVerifications] = useState({ ngos: [], donors: [] });
  const [listings, setListings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [ngoSearch, setNgoSearch] = useState("");
  const [listingPage, setListingPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const loadCoreOverview = useCallback(async () => {
    try {
      const [stats, verifs] = await Promise.all([
        apiRequest("/admin/analytics"),
        apiRequest("/admin/verifications"),
      ]);
      setAnalytics(stats);
      setVerifications(verifs);
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  }, []);

  const loadListings = useCallback(async (page) => {
    try {
      const rows = await apiRequest(`/admin/listings?limit=${PAGE_SIZE}&page=${page}`);
      setListings(rows);
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  }, []);

  const loadLogs = useCallback(async (page) => {
    try {
      const rows = await apiRequest(`/admin/logs?limit=${PAGE_SIZE}&page=${page}`);
      setLogs(rows);
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadCoreOverview(), loadListings(listingPage), loadLogs(logPage)]);
    setLoading(false);
  }, [loadCoreOverview, loadListings, loadLogs, listingPage, logPage]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  async function verifyNgo(ngoId, status) {
    setBusyKey(`ngo-${ngoId}`);
    try {
      await apiRequest(`/admin/ngos/${ngoId}/verify`, {
        method: "PATCH",
        body: { status },
      });
      setFeedback({ type: "success", text: `NGO #${ngoId} marked as ${status}.` });
      await Promise.all([loadCoreOverview(), loadLogs(1)]);
      setLogPage(1);
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setBusyKey("");
    }
  }

  async function removeListing(listingId) {
    setBusyKey(`listing-${listingId}`);
    try {
      await apiRequest(`/admin/listings/${listingId}/remove`, { method: "PATCH" });
      setFeedback({ type: "success", text: `Listing #${listingId} removed.` });
      await Promise.all([loadCoreOverview(), loadListings(listingPage), loadLogs(1)]);
      setLogPage(1);
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setBusyKey("");
    }
  }

  const filteredNgos = useMemo(() => {
    const q = ngoSearch.trim().toLowerCase();
    if (!q) return verifications.ngos;
    return verifications.ngos.filter(
      (n) =>
        n.ngo_name.toLowerCase().includes(q) ||
        n.city.toLowerCase().includes(q) ||
        n.email.toLowerCase().includes(q)
    );
  }, [verifications.ngos, ngoSearch]);

  const flaggedListings = useMemo(
    () => listings.filter((l) => l.status === "flagged_unsafe"),
    [listings]
  );

  const statCards = [
    {
      label: "Servings Redistributed",
      value: analytics?.totalServingsRedistributed ?? 0,
      icon: Package,
      accent: "border-l-4 border-l-emerald-700",
    },
    {
      label: "Active Listings",
      value: analytics?.activeListings ?? 0,
      icon: ClipboardList,
      accent: "border-l-4 border-l-emerald-500",
    },
    {
      label: "Pending NGO Reviews",
      value: analytics?.pendingNgos ?? 0,
      icon: Users,
      accent: "border-l-4 border-l-amber-500",
    },
    {
      label: "Flagged Unsafe Alerts",
      value: analytics?.flaggedUnsafeListings ?? 0,
      icon: AlertTriangle,
      accent: "border-l-4 border-l-rose-600",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Admin Oversight Console</h1>
          <p className="text-sm text-stone-600">
            Verify NGOs, monitor food safety flags, and inspect immutable audit logs.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh Data
        </button>
      </div>

      {/* Reserved message slot to prevent layout shift */}
      <div className="min-h-[20px]">
        {feedback.text && (
          <div
            role="status"
            className={`rounded-xl p-3 text-sm font-medium ${
              feedback.type === "error"
                ? "bg-rose-50 text-rose-800"
                : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      {/* Fixed-height Statistics Cards (Zero CLS) */}
      <section aria-label="Platform statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`min-h-[104px] rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${card.accent}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                {card.label}
              </p>
              <card.icon className="h-4 w-4 text-stone-500" aria-hidden="true" />
            </div>
            {loading && !analytics ? (
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-stone-200" />
            ) : (
              <p className="mt-2 text-3xl font-extrabold text-stone-900">{card.value}</p>
            )}
          </div>
        ))}
      </section>

      {/* Dedicated Flagged Unsafe Food Alerts */}
      {flaggedListings.length > 0 && (
        <section
          aria-label="Urgent food safety alerts"
          className="rounded-2xl border border-rose-300 bg-rose-50 p-5"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-rose-900">
            <ShieldAlert className="h-5 w-5 text-rose-700" aria-hidden="true" />
            Flagged Unsafe Food Alerts ({flaggedListings.length})
          </h2>
          <div className="mt-3 space-y-2">
            {flaggedListings.map((l) => (
              <div
                key={l.listing_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-xs"
              >
                <div>
                  <p className="font-bold text-stone-900">{l.title}</p>
                  <p className="text-stone-600">Donor: {l.donor_name} · City: {l.city}</p>
                </div>
                <button
                  type="button"
                  disabled={busyKey === `listing-${l.listing_id}`}
                  onClick={() => removeListing(l.listing_id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-700 px-3 py-1.5 font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove Unsafe Listing
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Responsive Admin Section Navigation */}
      <div
        role="tablist"
        aria-label="Admin Console Sections"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === tab.id
                ? "bg-emerald-700 text-white"
                : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* NGO Verification Queue */}
      {(activeTab === "all" || activeTab === "ngos") && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-stone-900">
              NGO Verification Queue ({filteredNgos.length})
            </h2>
            <div className="w-full sm:w-64">
              <label htmlFor="admin-ngo-search" className="sr-only">
                Search NGOs by name, city, or email
              </label>
              <input
                id="admin-ngo-search"
                value={ngoSearch}
                onChange={(e) => setNgoSearch(e.target.value)}
                placeholder="Search NGO, city, email..."
                className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading && verifications.ngos.length === 0 ? (
              <div className="h-24 animate-pulse rounded-xl bg-stone-100" />
            ) : filteredNgos.length === 0 ? (
              <p className="text-xs text-stone-600">No NGOs match your search.</p>
            ) : (
              filteredNgos.map((n) => (
                <div
                  key={n.ngo_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 p-4 text-xs"
                >
                  <div>
                    <p className="text-sm font-bold text-stone-900">{n.ngo_name}</p>
                    <p className="text-stone-600">
                      Reg: {n.registration_number || "N/A"} · {n.city} · Contact: {n.email}
                    </p>
                    {n.document_url && (
                      <a
                        href={n.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block font-semibold text-emerald-800 underline"
                      >
                        View Uploaded Certificate
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 font-semibold uppercase ${
                        n.verification_status === "verified"
                          ? "bg-emerald-100 text-emerald-900"
                          : n.verification_status === "rejected"
                            ? "bg-rose-100 text-rose-900"
                            : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {n.verification_status}
                    </span>
                    {n.verification_status !== "verified" && (
                      <button
                        type="button"
                        disabled={busyKey === `ngo-${n.ngo_id}`}
                        onClick={() => verifyNgo(n.ngo_id, "verified")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Verify
                      </button>
                    )}
                    {n.verification_status === "pending" && (
                      <button
                        type="button"
                        disabled={busyKey === `ngo-${n.ngo_id}`}
                        onClick={() => verifyNgo(n.ngo_id, "rejected")}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Reject
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Food Listings Moderation (Paginated) */}
      {(activeTab === "all" || activeTab === "listings") && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-stone-900">Listings &amp; Food Safety Moderation</h2>
            <span className="text-xs font-medium text-stone-600">Page {listingPage}</span>
          </div>
          <div className="mt-4 space-y-2">
            {loading && listings.length === 0 ? (
              <div className="h-24 animate-pulse rounded-xl bg-stone-100" />
            ) : listings.length === 0 ? (
              <p className="text-xs text-stone-600">No food listings found on this page.</p>
            ) : (
              listings.map((l) => (
                <div
                  key={l.listing_id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs ${
                    l.status === "flagged_unsafe" ? "border-rose-300 bg-rose-50" : "border-stone-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {l.status === "flagged_unsafe" && (
                      <ShieldAlert className="h-4 w-4 text-rose-700" aria-hidden="true" />
                    )}
                    <div>
                      <p className="font-bold text-stone-900">{l.title}</p>
                      <p className="text-stone-600">
                        Donor: {l.donor_name} · {l.remaining_quantity}/{l.total_quantity} {l.unit} · Status:{" "}
                        <strong>{l.status}</strong>
                      </p>
                    </div>
                  </div>
                  {l.status !== "cancelled" && l.status !== "completed" && (
                    <button
                      type="button"
                      disabled={busyKey === `listing-${l.listing_id}`}
                      onClick={() => removeListing(l.listing_id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2 text-xs">
            <button
              type="button"
              disabled={listingPage === 1}
              onClick={() => setListingPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-stone-300 px-3 py-1 font-semibold text-stone-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={listings.length < PAGE_SIZE}
              onClick={() => setListingPage((p) => p + 1)}
              className="rounded-lg border border-stone-300 px-3 py-1 font-semibold text-stone-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      )}

      {/* Audit Logs (Paginated) */}
      {(activeTab === "all" || activeTab === "logs") && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-stone-900">Admin Audit Logs</h2>
            <span className="text-xs font-medium text-stone-600">Page {logPage}</span>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            {loading && logs.length === 0 ? (
              <div className="h-20 animate-pulse rounded-xl bg-stone-100" />
            ) : logs.length === 0 ? (
              <p className="text-xs text-stone-600">No audit entries on this page.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.log_id}
                  className="flex flex-wrap justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-stone-800"
                >
                  <span>
                    <strong>{log.action_type}</strong> on {log.target_table} #{log.target_id} —{" "}
                    {log.details}
                  </span>
                  <span className="text-stone-600">{log.created_at}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2 text-xs">
            <button
              type="button"
              disabled={logPage === 1}
              onClick={() => setLogPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-stone-300 px-3 py-1 font-semibold text-stone-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={logs.length < PAGE_SIZE}
              onClick={() => setLogPage((p) => p + 1)}
              className="rounded-lg border border-stone-300 px-3 py-1 font-semibold text-stone-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
