// FILE: src/pages/RequestProductPage.jsx
// NEW FILE — Feature: "Request Product" (opened from the Home page button).
// Lists every active product the admin has added (batter or anything
// else) with its FIXED price. The distributor only picks quantities and
// the day/time they want it, then sends. The price is never editable and
// never sent to the server — the server takes it from the catalog.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { getProducts, createProductRequest, getMyProductRequests } from "../api/distributorApi";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDay = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return s || "";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};
const fmtClock = (s) => {
  if (!/^\d{2}:\d{2}$/.test(s || "")) return s || "";
  const [h, m] = s.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const STATUS = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-green-100 text-green-700" },
  partially_approved: { label: "Partially approved", cls: "bg-teal-100 text-teal-700" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-600" },
};

export default function RequestProductPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [qty, setQty] = useState({}); // productKey -> string
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const loadRequests = () => getMyProductRequests().then((d) => setMyRequests(d.requests || [])).catch(() => {});

  const [loadError, setLoadError] = useState("");

  // Products and "My Requests" load separately, so a problem with one
  // (e.g. the backend update not deployed yet) can never hide the other.
  const loadProducts = () => {
    setLoading(true);
    setLoadError("");
    getProducts()
      .then((p) => setProducts((p.products || []).filter((x) => x.isActive !== false)))
      .catch((e) => setLoadError(e?.response?.data?.message || "Could not load products. Check your internet and try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
    loadRequests();
  }, []);

  const picked = useMemo(
    () => products.filter((p) => Number(qty[p.key]) > 0).map((p) => ({ ...p, q: Number(qty[p.key]) })),
    [products, qty]
  );
  const total = picked.reduce((s, p) => s + p.q * (p.companyRatePerKg || 0), 0);

  const send = async () => {
    setError("");
    if (picked.length === 0) { setError("Enter a quantity for at least one product."); return; }
    if (!date || !time) { setError("Please choose the day and time you need it."); return; }
    setSending(true);
    try {
      await createProductRequest({
        items: picked.map((p) => ({ productKey: p.key, qty: p.q })),
        requestedDeliveryDate: date,
        requestedDeliveryTime: time,
        note,
      });
      setSent(true);
      setQty({}); setTime(""); setNote("");
      loadRequests();
    } catch (e) {
      setError(e?.response?.data?.message || "Could not send the request. Please try again.");
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-44 max-w-md mx-auto sm:max-w-lg">
      <div className="bg-gradient-to-b from-[#1a2a54] to-[#0e1c42] px-5 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-white" aria-label="Back">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <p className="text-white text-[20px] font-bold leading-tight">Request Product</p>
            <p className="text-blue-200/80 text-[12px]">Choose what you need — prices are fixed by admin</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {sent && (
          <div className="mb-4 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Request sent to admin. You'll get a notification when it is approved.
          </div>
        )}

        {loading && <p className="text-center text-gray-400 py-10 text-sm">Loading products…</p>}
        {loadError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-3">
            {loadError}
            <button onClick={loadProducts} className="ml-2 underline font-semibold">Retry</button>
          </div>
        )}

        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.key} className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-300">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-[14px] truncate">{p.name}</p>
                {p.description && <p className="text-[11px] text-gray-400 truncate">{p.description}</p>}
                <p className="text-[13px] text-[#16224a] font-bold mt-0.5">{money(p.companyRatePerKg)} <span className="text-[11px] font-medium text-gray-400">/ {p.unit || "kg"}</span></p>
              </div>
              <div className="flex flex-col items-end">
                <input
                  type="number" min="0" inputMode="decimal" placeholder="0"
                  value={qty[p.key] ?? ""}
                  onChange={(e) => setQty({ ...qty, [p.key]: e.target.value })}
                  className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm text-center"
                  aria-label={`${p.name} quantity`}
                />
                <span className="text-[10px] text-gray-400 mt-0.5">{p.unit || "kg"}</span>
              </div>
            </div>
          ))}
          {!loading && !loadError && products.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No products available yet.</p>}
        </div>

        {products.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mt-4">
            <p className="font-semibold text-gray-800 text-[14px] mb-3">When do you need it?</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500">Day</label>
                <input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500">Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
            </div>
            <input placeholder="Note for admin (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
          </div>
        )}

        {/* My requests */}
        <p className="font-bold text-gray-800 text-[16px] mt-6 mb-3">My Requests</p>
        {myRequests.length === 0 && <p className="text-sm text-gray-400 mb-6">No requests yet.</p>}
        <div className="space-y-3">
          {myRequests.map((r) => {
            const st = STATUS[r.status] || STATUS.pending;
            return (
              <div key={r._id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  <span className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                {r.items.map((it) => (
                  <p key={it.productKey} className="text-[13px] text-gray-700">
                    {it.productName}: <b>{it.qty} {it.unit}</b>
                    {r.status !== "pending" && r.status !== "rejected" && <span className="text-teal-600 text-[12px]"> · approved {it.approvedQty}</span>}
                  </p>
                ))}
                <p className="text-[12px] text-gray-500 mt-1">Total {money(r.totalAmount)} · wanted {fmtDay(r.requestedDeliveryDate)} {fmtClock(r.requestedDeliveryTime)}</p>
                {r.deliveryDate && r.status !== "rejected" && (
                  <p className="text-[12px] text-green-700 font-medium mt-1">Admin will send it at {fmtClock(r.deliveryTime)} on {fmtDay(r.deliveryDate)}</p>
                )}
                {r.adminNote && <p className="text-[12px] text-gray-500 mt-1">Admin note: {r.adminNote}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky send bar (sits above the bottom nav) */}
      {products.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30">
          <div className="max-w-md sm:max-w-lg mx-auto px-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-3">
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-gray-400">{picked.length} product{picked.length === 1 ? "" : "s"} selected</p>
                  <p className="font-bold text-gray-800 text-[16px]">{money(total)}</p>
                </div>
                <button onClick={send} disabled={sending} className="px-6 py-3 rounded-xl bg-[#16224a] text-white text-sm font-semibold disabled:opacity-60">
                  {sending ? "Sending…" : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}