// FILE: src/pages/HomePage.jsx
// UI REDESIGN ONLY — matches the new reference image exactly (dark navy
// header, blue/green gradient stat cards, Quick Actions row, Recent
// Activity feed, same 5-tab bottom nav). NO API/backend change: this
// still calls the exact same functions as before —
//   getMyProfile(), getMyDeliverySummary(), getProducts(),
//   getMyDeliveries(), getMyBatterRequests(), getMyLedger()
// (all already existed in src/api/distributorApi.js; getMyLedger is only
// used here to get the pending-customers count for the "Pending
// Payments" card — no new endpoint).
//
// Two small, deliberate honesty notes (not visual bugs):
//  1. The reference image's "Total Sales" card says "This Month" — your
//     backend does not currently aggregate revenue by calendar month
//     (only "today" and "all-time" summaries exist), so this card shows
//     ALL-TIME revenue labelled "All Time" instead of a monthly figure
//     that doesn't exist yet. Ask if you'd like a real "this month"
//     backend aggregation added later.
//  2. The reference image's "↑12%" / "+8%" growth badges need a
//     previous-period comparison your backend doesn't compute yet, so
//     they're left off rather than shown as a fabricated number. Same
//     offer applies if you want that built.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useDistributorAuth } from "../context/DistributorAuthContext";
import {
  getMyProfile,
  getMyDeliverySummary,
  getProducts,
  getMyDeliveries,
  getMyBatterRequests,
  getMyLedger,
  getUnreadNotificationCount,
} from "../api/distributorApi";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const QUICK_ACTIONS = [
  {
    label: "New Order", path: "/customers", iconBg: "bg-blue-50", iconColor: "text-[#16224a]",
    icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m-10 0a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z",
  },
  {
    label: "Add Customer", path: "/customers", iconBg: "bg-blue-50", iconColor: "text-[#16224a]",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h8m8-4v4m-2-2h4",
  },
  {
    label: "View Ledger", path: "/ledger", iconBg: "bg-blue-50", iconColor: "text-[#16224a]",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    label: "Call Customers", path: "/customers", iconBg: "bg-green-50", iconColor: "text-green-600",
    icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  },
];

const STATUS_STYLE = {
  Delivered: "bg-green-100 text-green-700",
  Credit: "bg-amber-100 text-amber-700",
  Skipped: "bg-gray-100 text-gray-500",
  Pending: "bg-blue-100 text-blue-700",
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ══════════════════════ Gradient stat card ══════════════════════ */
function GradientCard({ theme, icon, label, value, subtext }) {
  const gradients = {
    blue: "from-[#4f7fd9] to-[#2e56ad]",
    green: "from-[#3fbf6f] to-[#249a4e]",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[theme]} p-4 text-white`}>
      <div className="flex items-start justify-between mb-6">
        <p className="text-[13px] font-medium text-white/90 leading-tight max-w-[75%]">{label}</p>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
          </svg>
        </div>
      </div>
      <p className="text-[22px] font-bold leading-tight mb-1">{value}</p>
      <p className="text-[12px] text-white/80">{subtext}</p>
    </div>
  );
}

export default function HomePage() {
  const { distributor: authDistributor } = useDistributorAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [todayDeliveries, setTodayDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  // NEW — unread notification count for the bell badge
  const [unread, setUnread] = useState(0);

  // NEW — poll the unread count (on open, every 45s, and when the app is
  // brought back to the foreground) so "Admin approved your request…"
  // shows up on the bell without a manual refresh.
  useEffect(() => {
    const fetchUnread = () =>
      getUnreadNotificationCount().then((d) => setUnread(d.unreadCount || 0)).catch(() => {});
    fetchUnread();
    const t = setInterval(fetchUnread, 45000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchUnread(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([getMyProfile(), getMyDeliverySummary(), getMyDeliveries(), getMyLedger()])
      .then(([p, s, d, l]) => {
        setProfile(p.distributor);
        setSummary(s);
        setTodayDeliveries(d.records || []);
        setLedger(l);
      })
      .finally(() => setLoading(false));
    // getProducts()/getMyBatterRequests() are still used elsewhere (Orders/
    // Customers/Checkout pages) — this page no longer needs them directly
    // since the rate card and "Today's Request" banner moved off the new
    // design, but importing them isn't required here.
  }, []);

  const displayName = profile?.name || authDistributor?.name || "Distributor";
  const stock = profile?.currentStockKg || { idly: 0, dosa: 0 };
  const totalStockUnits = stock.idly + stock.dosa;
  const pendingCustomerCount = (ledger?.customerLedger || []).filter((c) => c.outstanding > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto sm:max-w-lg">
      {/* ── Navy header ── */}
      <div className="bg-gradient-to-b from-[#1a2a54] to-[#0e1c42] px-5 pt-6 pb-16 rounded-b-3xl">
        <div className="flex items-center justify-between mb-5">
          <button className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button className="relative text-white" onClick={() => navigate("/notifications")} aria-label="Notifications">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>
            )}
          </button>
        </div>

        <p className="text-white text-[22px] font-bold leading-snug">Hello, {displayName} 👋</p>
        <p className="text-blue-200/80 text-[13px] mt-0.5">Welcome back!</p>
      </div>

      {/* ── Stat cards, overlapping header ── */}
      <div className="-mt-9 px-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <GradientCard
            theme="blue"
            icon="M20 7h-9m3-3l-3 3 3 3m-10 6h9m-3 3l3-3-3-3M4 7h4m0 0L5 4m3 3L5 10m15 7h-4m0 0l3 3m-3-3l3-3"
            label="Total Sales"
            value={loading ? "…" : money(summary?.totalRevenue)}
            subtext="All Time"
          />
          <GradientCard
            theme="green"
            icon="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            label="Pending Payments"
            value={loading ? "…" : money(summary?.totalCredits)}
            subtext={`From ${pendingCustomerCount} Customer${pendingCustomerCount === 1 ? "" : "s"}`}
          />
          <GradientCard
            theme="blue"
            icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            label="Available Batter Stock"
            value={loading ? "…" : `${totalStockUnits} kg`}
            subtext="In Freezer"
          />
          <GradientCard
            theme="green"
            icon="M9 7h6m-6 4h6m-6 4h4M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
            label="Today's Sales"
            value={loading ? "…" : money(summary?.todayRevenue)}
            subtext="Total So Far"
          />
        </div>

        {/* ── NEW — Request Product (any admin-added product) ── */}
        <button
          onClick={() => navigate("/request-product")}
          className="w-full mb-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#1a2a54] to-[#0e1c42] text-white px-5 py-4 shadow-sm"
        >
          <span className="flex items-center gap-3 text-left">
            <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </span>
            <span>
              <span className="block font-bold text-[15px]">Request Product</span>
              <span className="block text-[12px] text-white/70">Ask admin for batter or any product</span>
            </span>
          </span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        {/* ── Quick Actions ── */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-800 text-[16px]">Quick Actions</p>
          <button className="text-[13px] text-[#16224a] font-semibold flex items-center gap-1">
            View All
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {QUICK_ACTIONS.map((a) => (
            <button key={a.label} onClick={() => navigate(a.path)} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 rounded-2xl ${a.iconBg} ${a.iconColor} flex items-center justify-center`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={a.icon} />
                </svg>
              </div>
              <span className="text-[11.5px] text-gray-700 font-medium text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── Recent Activity ── */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-800 text-[16px]">Recent Activity</p>
          <button onClick={() => navigate("/orders")} className="text-[13px] text-[#16224a] font-semibold flex items-center gap-1">
            View All
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {loading && <p className="text-center text-gray-400 py-8 text-sm">Loading…</p>}
          {!loading && todayDeliveries.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No activity recorded yet today.</p>
          )}
          {todayDeliveries.slice(0, 6).map((d) => {
            const isCredit = d.status !== "skipped" && d.paymentStatus === "credit";
            const badgeLabel = d.status === "skipped" ? "Skipped" : d.status === "pending" ? "Pending" : isCredit ? "Credit" : "Delivered";
            return (
              <button
                key={d._id}
                onClick={() => navigate("/orders")}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-[#16224a]"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-gray-800 truncate">{d.shopName || d.customer?.shopName}</p>
                  <p className="text-[12px] text-gray-400">{d.idlyKg}kg idly · {d.dosaKg}kg dosa</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13.5px] font-semibold text-gray-800">{money(d.amountCharged)}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[badgeLabel]}`}>{badgeLabel}</span>
                  <p className="text-[10px] text-gray-300 mt-1">{timeAgo(d.createdAt)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}