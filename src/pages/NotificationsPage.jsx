// FILE: src/pages/NotificationsPage.jsx
// NEW FILE — Feature: distributor notifications (opened from the bell on
// the Home page). Shows e.g. "Admin approved your request and will send
// it at 6:30 PM on 10 Oct." Opening the page marks everything as read.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { getMyNotifications, markAllNotificationsRead } from "../api/distributorApi";

const ICON = {
  request_approved: { bg: "bg-green-100", fg: "text-green-600", d: "M5 13l4 4L19 7" },
  request_partial: { bg: "bg-teal-100", fg: "text-teal-600", d: "M5 13l4 4L19 7" },
  request_rejected: { bg: "bg-red-100", fg: "text-red-500", d: "M6 18L18 6M6 6l12 12" },
  info: { bg: "bg-blue-100", fg: "text-blue-600", d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
};

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyNotifications()
      .then((d) => {
        setItems(d.notifications || []);
        if ((d.unreadCount || 0) > 0) markAllNotificationsRead().catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto sm:max-w-lg">
      <div className="bg-gradient-to-b from-[#1a2a54] to-[#0e1c42] px-5 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-white" aria-label="Back">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <p className="text-white text-[20px] font-bold">Notifications</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading && <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No notifications yet.</p>}
        {items.map((n) => {
          const ic = ICON[n.type] || ICON.info;
          return (
            <div key={n._id} className={`bg-white rounded-2xl border p-4 flex gap-3 ${n.isRead ? "border-gray-100" : "border-blue-200"}`}>
              <div className={`w-9 h-9 rounded-full ${ic.bg} ${ic.fg} flex items-center justify-center flex-shrink-0`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d={ic.d} /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-800 text-[14px]">{n.title}</p>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-[13px] text-gray-600 mt-0.5">{n.message}</p>
                {n.note && <p className="text-[12px] text-gray-400 mt-1">Note: {n.note}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}