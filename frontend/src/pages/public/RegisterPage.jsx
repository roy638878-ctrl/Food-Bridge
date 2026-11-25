import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";

export default function RegisterPage() {
  usePageMeta("Create Account", "Register as a Food Donor or verified NGO on FoodBridge.");
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: "donor",
    full_name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    city: "Pune",
    donor_type: "individual",
    organization_name: "",
    ngo_name: "",
    registration_number: "",
    daily_capacity_servings: 100,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await apiRequest("/auth/register", { method: "POST", body: form });
      loginSuccess(data);
      navigate(data.user.role === "donor" ? "/donor" : "/ngo");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900">Join FoodBridge</h1>
        <p className="mt-1 text-sm text-stone-600">
          Create a Food Donor or NGO / Receiver account.
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Account role">
            {[
              { id: "donor", label: "Food Donor" },
              { id: "ngo", label: "NGO / Receiver" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={form.role === option.id}
                onClick={() => updateField("role", option.id)}
                className={`rounded-xl border py-2.5 text-sm font-semibold ${
                  form.role === option.id
                    ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                    : "border-stone-300 text-stone-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-fullname" className="block text-xs font-semibold text-stone-700">
                Full Name
              </label>
              <input
                id="reg-fullname"
                required
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-stone-700">
                Phone
              </label>
              <input
                id="reg-phone"
                required
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-stone-700">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-stone-700">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {form.role === "donor" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-donor-type" className="block text-xs font-semibold text-stone-700">
                  Donor Type
                </label>
                <select
                  id="reg-donor-type"
                  value={form.donor_type}
                  onChange={(e) => updateField("donor_type", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="individual">Individual</option>
                  <option value="college_mess">College Mess</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="marriage_hall">Marriage Hall</option>
                  <option value="caterer">Caterer</option>
                </select>
              </div>
              <div>
                <label htmlFor="reg-org" className="block text-xs font-semibold text-stone-700">
                  Organization Name
                </label>
                <input
                  id="reg-org"
                  value={form.organization_name}
                  onChange={(e) => updateField("organization_name", e.target.value)}
                  placeholder="Optional for individuals"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="reg-ngo-name" className="block text-xs font-semibold text-stone-700">
                  NGO Name
                </label>
                <input
                  id="reg-ngo-name"
                  required
                  value={form.ngo_name}
                  onChange={(e) => updateField("ngo_name", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="reg-ngo-reg" className="block text-xs font-semibold text-stone-700">
                  Registration No.
                </label>
                <input
                  id="reg-ngo-reg"
                  value={form.registration_number}
                  onChange={(e) => updateField("registration_number", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="reg-ngo-cap" className="block text-xs font-semibold text-stone-700">
                  Daily Capacity
                </label>
                <input
                  id="reg-ngo-cap"
                  type="number"
                  min={10}
                  value={form.daily_capacity_servings}
                  onChange={(e) => updateField("daily_capacity_servings", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="reg-address" className="block text-xs font-semibold text-stone-700">
                Full Address
              </label>
              <input
                id="reg-address"
                required
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="reg-city" className="block text-xs font-semibold text-stone-700">
                City
              </label>
              <input
                id="reg-city"
                required
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-stone-600">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-emerald-800 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
