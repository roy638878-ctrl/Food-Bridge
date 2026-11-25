import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";

const DEMO_ACCOUNTS = [
  { label: "Donor (Campus Mess)", email: "donor@foodbridge.org", password: "FoodBridge@123" },
  { label: "Verified NGO (HopePlate)", email: "ngo@foodbridge.org", password: "FoodBridge@123" },
  { label: "Pending NGO", email: "pending.ngo@foodbridge.org", password: "FoodBridge@123" },
  { label: "Platform Admin", email: "roy638878@gmail.com", password: "PPiiYY@@63" },
];

export default function LoginPage() {
  usePageMeta("Sign In", "Sign in to your FoodBridge Donor, NGO, or Admin account.");
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function doLogin(targetEmail, targetPassword) {
    setError("");
    setSubmitting(true);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: { email: targetEmail, password: targetPassword },
      });
      loginSuccess(data);
      const role = data.user.role;
      navigate(role === "donor" ? "/donor" : role === "admin" ? "/admin" : "/ngo");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    doLogin(email, password);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900">Sign in to FoodBridge</h1>
        <p className="mt-1 text-sm text-stone-600">Access your Donor, NGO, or Admin workspace.</p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-stone-700">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              placeholder="you@example.org"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-stone-700">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 border-t border-stone-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
            Quick Demo Logins
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={submitting}
                onClick={() => doLogin(acc.email, acc.password)}
                className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-left text-xs font-medium text-stone-800 hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-60"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-stone-600">
          New to FoodBridge?{" "}
          <Link to="/register" className="font-semibold text-emerald-800 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
