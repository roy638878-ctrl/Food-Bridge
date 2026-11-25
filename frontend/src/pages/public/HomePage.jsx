import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, HeartHandshake, ShieldAlert, Truck } from "lucide-react";
import { usePageMeta } from "../../hooks/usePageMeta";

const STEPS = [
  {
    icon: CheckCircle2,
    title: "1. Safe Listing",
    desc: "Donors log prepared & expiry timestamps, storage temperature, and pass a hygiene checklist.",
  },
  {
    icon: HeartHandshake,
    title: "2. Atomic Claiming",
    desc: "Verified NGOs reserve partial or full servings without race-condition double booking.",
  },
  {
    icon: Truck,
    title: "3. Pickup & OTP",
    desc: "Volunteers inspect food on arrival and confirm safe handover with a 6-digit OTP.",
  },
  {
    icon: ShieldAlert,
    title: "4. Admin Oversight",
    desc: "Admins verify NGO certificates, monitor expiry alerts, and review hygiene flags.",
  },
];

export default function HomePage() {
  usePageMeta(
    "Surplus Food Redistribution",
    "FoodBridge connects surplus food donors with verified NGOs using mandatory food-safety checks, expiry tracking, and OTP-verified handovers."
  );

  return (
    <div>
      <section className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-stone-900 px-4 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-block rounded-full bg-emerald-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-100">
            Zero-Waste Surplus Food Redistribution
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Bridge Surplus Food to Communities in Need — Safely &amp; Fast
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-emerald-100 sm:text-base">
            FoodBridge connects campus messes, restaurants, event halls, and households with verified
            NGOs using strict food-safety checklists, live expiry tracking, and OTP-verified handovers.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/browse"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-stone-950 hover:bg-amber-300"
            >
              Browse Available Food
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-300/60 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20"
            >
              Register as Donor or NGO
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-it-works-heading" className="mx-auto max-w-6xl px-4 py-14">
        <h2 id="how-it-works-heading" className="text-center text-2xl font-bold text-stone-900">
          How FoodBridge Works
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item) => (
            <div key={item.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <item.icon className="h-8 w-8 text-emerald-700" aria-hidden="true" />
              <h3 className="mt-4 text-base font-bold text-stone-900">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
