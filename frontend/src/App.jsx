import { Suspense, lazy } from "react";
import { Link, Route, Routes } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import ProtectedRoute from "./components/common/ProtectedRoute";

const HomePage = lazy(() => import("./pages/public/HomePage"));
const LoginPage = lazy(() => import("./pages/public/LoginPage"));
const RegisterPage = lazy(() => import("./pages/public/RegisterPage"));
const BrowseFoodPage = lazy(() => import("./pages/public/BrowseFoodPage"));
const DonorDashboard = lazy(() => import("./pages/donor/DonorDashboard"));
const NgoDashboard = lazy(() => import("./pages/ngo/NgoDashboard"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

function RouteFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-label="Loading page">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-stone-200" />
      <div className="mt-4 h-4 w-80 animate-pulse rounded-lg bg-stone-200" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-stone-200 bg-white" />
        ))}
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-stone-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-stone-600">
        The page you requested does not exist on FoodBridge.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Back to Home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="min-h-[calc(100vh-130px)] flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/browse" element={<BrowseFoodPage />} />
            <Route
              path="/donor"
              element={
                <ProtectedRoute allowedRoles={["donor"]}>
                  <DonorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ngo"
              element={
                <ProtectedRoute allowedRoles={["ngo", "receiver"]}>
                  <NgoDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="border-t border-stone-200 bg-white py-5 text-center text-xs text-stone-600">
        FoodBridge · Safe Surplus Food Redistribution Platform
      </footer>
    </div>
  );
}
