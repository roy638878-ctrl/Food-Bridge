import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Leaf, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/client";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState({ items: [], unreadCount: 0 });
  const notifContainerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications({ items: [], unreadCount: 0 });
      return;
    }
    try {
      const data = await apiRequest("/notifications");
      setNotifications(data);
    } catch {
      // ignore transient notification polling errors
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notifOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") setNotifOpen(false);
    }
    function handleClickOutside(e) {
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen]);

  async function handleMarkRead() {
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" });
      fetchNotifications();
    } catch {
      // ignore
    }
  }

  function handleLogout() {
    logout();
    setMobileOpen(false);
    navigate("/login");
  }

  const dashboardPath =
    user?.role === "donor" ? "/donor" : user?.role === "admin" ? "/admin" : "/ngo";

  const dashboardLabel =
    user?.role === "admin" ? "Admin Console" : user?.role === "donor" ? "Donor Hub" : "NGO Hub";

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg text-lg font-bold text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <Leaf className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>FoodBridge</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-6 text-sm font-medium text-stone-700 md:flex">
          <Link to="/browse" className="rounded-md px-1 py-1 hover:text-emerald-800">
            Browse Surplus Food
          </Link>
          {user && (
            <Link to={dashboardPath} className="rounded-md px-1 py-1 hover:text-emerald-800">
              {dashboardLabel}
            </Link>
          )}
        </nav>

        <div className="flex min-h-[38px] items-center gap-2 sm:gap-3">
          {user && (
            <div className="relative" ref={notifContainerRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative rounded-lg border border-stone-300 p-2 text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
                aria-label={`Notifications (${notifications.unreadCount} unread)`}
                aria-expanded={notifOpen}
                aria-controls="notifications-popover"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {notifications.unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-stone-950">
                    {notifications.unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  id="notifications-popover"
                  role="region"
                  aria-label="Notifications list"
                  className="absolute right-0 mt-2 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-xl sm:w-80"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Notifications
                    </span>
                    <button
                      type="button"
                      onClick={handleMarkRead}
                      className="text-xs font-semibold text-emerald-800 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {notifications.items.length === 0 ? (
                      <p className="py-4 text-center text-xs text-stone-600">No notifications yet.</p>
                    ) : (
                      notifications.items.map((n) => (
                        <div
                          key={n.notification_id}
                          className={`rounded-lg p-2 text-xs ${
                            n.is_read ? "bg-stone-50 text-stone-700" : "bg-emerald-50 text-stone-900"
                          }`}
                        >
                          <p className="font-semibold">{n.title}</p>
                          <p className="mt-0.5 text-stone-700">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span>{user.full_name}</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 uppercase text-emerald-900">
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Join FoodBridge
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg p-2 text-stone-700 hover:bg-stone-100 md:hidden"
            aria-label="Toggle Menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-stone-200 bg-white px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-3 text-sm font-medium">
            <Link to="/browse" className="text-stone-800 hover:text-emerald-800">
              Browse Surplus Food
            </Link>
            {user ? (
              <>
                <Link to={dashboardPath} className="text-emerald-800">
                  {dashboardLabel} ({user.role})
                </Link>
                <button type="button" onClick={handleLogout} className="text-left text-rose-700">
                  Logout ({user.full_name})
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-stone-800">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-center font-semibold text-white"
                >
                  Join FoodBridge
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
