import { memo } from "react";
import { Clock, MapPin, ShieldCheck, Thermometer, Utensils } from "lucide-react";

function getTimeLeftLabel(expiryIso) {
  const diffMs = new Date(expiryIso).getTime() - Date.now();
  if (diffMs <= 0) return { label: "Expired", urgent: true };
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return { label: `${mins}m left`, urgent: true };
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return { label: `${hrs}h ${remMins}m left`, urgent: hrs < 2 };
}

const FoodCard = memo(function FoodCard({ listing, onClaimClick, canClaim }) {
  const expiry = getTimeLeftLabel(listing.expiry_at);

  return (
    <article className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <div>
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            width={400}
            height={176}
            loading="lazy"
            decoding="async"
            className="h-44 w-full object-cover"
          />
        ) : (
          <div
            className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 text-emerald-700"
            aria-hidden="true"
          >
            <Utensils className="h-10 w-10 opacity-70" />
          </div>
        )}

        <div className="p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {listing.category_name}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                expiry.urgent ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"
              }`}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {expiry.label}
            </span>
          </div>

          <h2 className="text-base font-bold text-stone-900">{listing.title}</h2>
          <p className="mt-1 line-clamp-2 min-h-[32px] text-xs text-stone-600">
            {listing.description || "Fresh surplus food ready for verified redistribution."}
          </p>

          <div className="mt-3 space-y-1.5 text-xs text-stone-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900">
                Available: {listing.remaining_quantity} / {listing.total_quantity} {listing.unit}
              </span>
              <span className="rounded bg-stone-100 px-2 py-0.5 font-semibold uppercase text-stone-800">
                {listing.food_type.replace("_", "-")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 shrink-0 text-stone-500" aria-hidden="true" />
              <span>Storage: {listing.storage_type.replace("_", " ")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-500" aria-hidden="true" />
              <span className="truncate">
                {listing.pickup_address}, {listing.city}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Safety Verified · {listing.donor_name || "Verified Donor"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-3">
        {canClaim ? (
          <button
            type="button"
            onClick={() => onClaimClick(listing)}
            className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            Claim Surplus Food
          </button>
        ) : (
          <p className="py-1 text-center text-xs font-medium text-stone-600">
            Log in as a verified NGO/Receiver to claim
          </p>
        )}
      </div>
    </article>
  );
});

export default FoodCard;
