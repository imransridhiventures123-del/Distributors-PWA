// FILE: src/pages/OrdersPage.jsx
// UPDATED — Feature: e-commerce-style Request Batter flow.
//   - When there's no request yet for today, this page now simply
//     points you to the Customers tab to build your cart (product
//     cards, Add to Cart) and Checkout — the old inline grid form /
//     step-wizard overlay is gone per your instruction.
//   - Once admin approves today's request, every customer in it still
//     shows as its OWN CARD under "Today's Orders" (like the driver
//     mobile app) with a "Mark Complete" action — tapping it submits
//     just that one delivery (still via the same /api/deliveries
//     endpoint, just called with a single-item array instead of a big
//     batch). A completed card shows a "✓ Completed" sign and can't be
//     re-submitted.
//   - A "← Date →" navigator at the top: Today shows the live,
//     actionable order cards; any earlier date shows a read-only summary
//     of that day's completed/skipped deliveries (via the existing
//     GET /api/deliveries/mine?date= endpoint) — you can't navigate into
//     the future.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import {
  getMyBatterRequests, getMyProfile, getProducts,
  submitDeliveries, getMyDeliveries,
} from "../api/distributorApi";

const STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-600",
  partially_approved: "bg-blue-50 text-blue-600",
  rejected: "bg-red-50 text-red-600",
};

// NEW — Feature: admin-managed product catalog (Level 2). Other-product
// quantities (anything besides Idly/Dosa) as " · 3 packet Paneer Pack".
// Works for both request items and delivery-record items (same shape).
const extrasText = (items) =>
  (items || []).map((it) => ` · ${it.qty} ${it.unit || "kg"} ${it.productName || it.productKey}`).join("");

const toISODate = (d) => d.toISOString().slice(0, 10);
const isToday = (dateObj) => toISODate(dateObj) === toISODate(new Date());
const isFuture = (dateObj) => toISODate(dateObj) > toISODate(new Date());

/* ══════════════════════════ One order card ══════════════════════════ */
function OrderCard({ order, rates, onMarkComplete }) {
  const [status, setStatus] = useState("delivered");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [amountPaid, setAmountPaid] = useState("");
  const [skipReason, setSkipReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amount =
    order.idlyKg * (rates.idly?.customerRatePerKg || 0) +
    order.dosaKg * (rates.dosa?.customerRatePerKg || 0) +
    (order.extraItems || []).reduce((s, it) => s + it.qty * (rates[it.productKey]?.customerRatePerKg || 0), 0);

  if (order.completed) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between opacity-80">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{order.shopName}</p>
          <p className="text-xs text-gray-400">{order.idlyKg}kg idly · {order.dosaKg}kg dosa{extrasText(order.extraItems)}</p>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-xs font-semibold">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          {order.status === "skipped" ? "Skipped" : "✓ Completed"}
        </span>
      </div>
    );
  }

  const mark = async () => {
    setSubmitting(true);
    try {
      await onMarkComplete({
        customerId: order.customerId, shopName: order.shopName,
        idlyKg: order.idlyKg, dosaKg: order.dosaKg,
        extraItems: (order.extraItems || []).map((it) => ({ productKey: it.productKey, qty: it.qty })),
        status, paymentStatus,
        amountCharged: amount,
        amountPaid: paymentStatus === "partial" ? Number(amountPaid) || 0 : undefined,
        skipReason,
      });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-gray-800 text-sm">{order.shopName}</p>
        <span className="text-xs text-gray-400">{order.idlyKg}kg idly · {order.dosaKg}kg dosa</span>
      </div>
      {(order.extraItems || []).length > 0 && (
        <p className="text-xs text-gray-500 mb-3">{extrasText(order.extraItems).replace(/^ · /, "")}</p>
      )}

      <div className="flex gap-2 mb-2">
        <button onClick={() => setStatus("delivered")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${status === "delivered" ? "bg-green-700 text-white" : "border border-gray-200 text-gray-500"}`}>Delivered</button>
        <button onClick={() => setStatus("skipped")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${status === "skipped" ? "bg-gray-700 text-white" : "border border-gray-200 text-gray-500"}`}>Skipped</button>
      </div>

      {status === "delivered" ? (
        <>
          <div className="flex gap-2 mb-2">
            {["paid", "credit", "partial"].map((p) => (
              <button key={p} onClick={() => setPaymentStatus(p)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium capitalize ${paymentStatus === p ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-500"}`}>{p}</button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mb-2">Amount: ₹{amount}</p>
          {paymentStatus === "partial" && (
            <input
              type="number" placeholder="Amount paid now"
              value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          )}
        </>
      ) : (
        <input
          placeholder="Reason (optional) — kg stays in your stock"
          value={skipReason} onChange={(e) => setSkipReason(e.target.value)}
          className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-200 text-sm"
        />
      )}

      <button onClick={mark} disabled={submitting} className="w-full py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold disabled:opacity-60">
        {submitting ? "Saving…" : "Mark Complete"}
      </button>
    </div>
  );
}

/* ══════════════════════════ Page ══════════════════════════ */
export default function OrdersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({ idly: 0, dosa: 0 });
  const [request, setRequest] = useState(null); // today's BatterRequest
  const [viewDate, setViewDate] = useState(new Date());
  const [dayDeliveries, setDayDeliveries] = useState([]);
  const [dayLoading, setDayLoading] = useState(true);

  // Static data (today's request, products, stock) — loaded once
  const loadStatic = () => {
    setLoading(true);
    Promise.all([getMyProfile(), getProducts(), getMyBatterRequests()])
      .then(([prof, p, r]) => {
        setProducts(p.products || []);
        setStock(prof.distributor?.currentStockKg || { idly: 0, dosa: 0 });
        setRequest((r.requests || [])[0] || null);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadStatic(); }, []);

  // Whichever date is being viewed — its recorded deliveries
  const loadDay = (dateObj) => {
    setDayLoading(true);
    getMyDeliveries(toISODate(dateObj))
      .then((d) => setDayDeliveries(d.records || []))
      .finally(() => setDayLoading(false));
  };
  useEffect(() => { loadDay(viewDate); }, [viewDate]);

  // Every catalog product by key (rates.idly / rates.dosa still work exactly as before)
  const rates = Object.fromEntries(products.map((p) => [p.key, p]));

  const shiftDate = (delta) => {
    const next = new Date(viewDate);
    next.setDate(next.getDate() + delta);
    if (isFuture(next)) return; // can't navigate into the future
    setViewDate(next);
  };

  const handleMarkComplete = async (record) => {
    await submitDeliveries(request?._id, [record]);
    loadDay(viewDate);
    loadStatic(); // refresh stock (delivered kg leaves the fridge)
  };

  // Build today's order cards: every customer in today's approved request,
  // marked completed if a delivery record already exists for them today.
  const todaysOrderCards = (request?.customerOrders || []).map((c, i) => {
    const done = dayDeliveries.find((d) => (d.customer?._id || d.customer) === c.customer || d.shopName === c.shopName);
    return {
      key: c.customer || `${c.shopName}-${i}`,
      customerId: c.customer, shopName: c.shopName,
      idlyKg: c.idlyKg, dosaKg: c.dosaKg,
      extraItems: c.extraItems || [],
      completed: !!done, status: done?.status,
    };
  });

  const completedCount = dayDeliveries.filter((d) => d.status === "delivered").length;
  const skippedCount = dayDeliveries.filter((d) => d.status === "skipped").length;

  const viewingToday = isToday(viewDate);
  const hasApprovedRequestToday = request && (request.status === "approved" || request.status === "partially_approved");

  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto">
      <div className="bg-gradient-to-b from-green-800 to-green-700 px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white text-lg font-semibold">Orders &amp; Delivery</span>
          {viewingToday && request && (
            <span className={`px-3 py-1 rounded-full text-[11px] font-medium ${STATUS_STYLE[request.status]}`}>{request.status.replace("_", " ")}</span>
          )}
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between bg-white/10 border border-white/20 rounded-2xl px-3 py-2">
          <button onClick={() => shiftDate(-1)} className="text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="text-white text-sm font-medium">
            {viewingToday ? "Today" : viewDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <button onClick={() => shiftDate(1)} disabled={isFuture(new Date(viewDate.getTime() + 86400000))} className="text-white p-1 disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-32">
        {(loading || dayLoading) && <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>}

        {/* ══ Viewing a PAST date: read-only summary ══ */}
        {!loading && !dayLoading && !viewingToday && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-gray-400">Orders Completed</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-gray-500">{skippedCount}</p>
                <p className="text-xs text-gray-400">Orders Skipped</p>
              </div>
            </div>
            {dayDeliveries.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No orders recorded on this date.</p>}
            <div className="space-y-2">
              {dayDeliveries.map((d) => (
                <div key={d._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{d.shopName || d.customer?.shopName}</p>
                    <p className="text-xs text-gray-400">{d.idlyKg}kg idly · {d.dosaKg}kg dosa{extrasText(d.extraItems)}</p>
                  </div>
                  <span className={`text-xs font-medium ${d.status === "skipped" ? "text-gray-400" : "text-green-600"}`}>
                    {d.status === "skipped" ? "Skipped" : "✓ Completed"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ Viewing TODAY ══ */}
        {!loading && !dayLoading && viewingToday && (
          <>
            {(!request || request.status === "rejected") && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                {request?.status === "rejected" && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 text-left">
                    Your last request was rejected{request.adminNote ? `: ${request.adminNote}` : "."} Submit a new one.
                  </div>
                )}
                <p className="text-sm text-gray-500 mb-4">You haven't requested batter today yet.</p>
                <button onClick={() => navigate("/customers")} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold">
                  Request Batter
                </button>
              </div>
            )}

            {request && request.status === "pending" && (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
                <p className="font-semibold text-gray-800">Waiting for admin approval</p>
                <p className="text-sm text-gray-400 mt-1">Requested: {request.requestedIdlyKg}kg idly / {request.requestedDosaKg}kg dosa{extrasText(request.requestedExtraItems)}</p>
                {request.requestedDeliveryDate && (
                  <p className="text-xs text-gray-400 mt-1">
                    Wanted by: {new Date(request.requestedDeliveryDate).toLocaleDateString("en-IN")}{request.requestedDeliveryTime && ` at ${request.requestedDeliveryTime}`}
                  </p>
                )}
              </div>
            )}

            {hasApprovedRequestToday && (
              <>
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
                  Approved: {request.approvedIdlyKg}kg idly / {request.approvedDosaKg}kg dosa{extrasText(request.approvedExtraItems)}
                  {request.deliveryTime && <> · Delivery time: <b>{request.deliveryTime}</b></>}
                </div>
                <p className="font-bold text-gray-800 mb-3 px-1">Today's Orders</p>
                <div className="space-y-3">
                  {todaysOrderCards.map((order) => (
                    <OrderCard key={order.key} order={order} rates={rates} onMarkComplete={handleMarkComplete} />
                  ))}
                  {todaysOrderCards.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">No customer orders in today's approved request.</p>}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}