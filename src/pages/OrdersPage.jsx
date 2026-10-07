// FILE: src/pages/OrdersPage.jsx
// UPDATED — Feature: manual Today's Orders + Mark Complete with payment split.
//
// Two kinds of cards, one look:
//   • "Request" cards — every customer in today's admin-approved batter request
//   • "Manual"  cards — orders the distributor added with one tap on a
//                       customer in the Customers tab ("＋ Today's Order")
// Each card shows the order details with the price and amount of every
// line, and the total. "Mark Complete" works like the driver app's mark
// done: how much was taken as Cash, how much by GPay, how much is left on
// Credit — they must add up to the order amount. Then the card closes as
// "✓ Completed" (with the split shown). The date navigator stays: today is
// live, earlier days are a read-only record of what was ordered/completed.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import {
  getMyBatterRequests, getMyProfile, getProducts, getMyCustomers,
  submitDeliveries, getMyDeliveries, completeOrder, cancelManualOrder,
} from "../api/distributorApi";

const STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-600",
  partially_approved: "bg-blue-50 text-blue-600",
  rejected: "bg-red-50 text-red-600",
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) => `₹${round2(n).toLocaleString("en-IN")}`;
const idOf = (x) => (x && typeof x === "object" ? x._id : x);
// Old records only have amountPaid (no cash/GPay split) — treat that as cash.
const cashOf = (r) => (r.cashAmount !== undefined && r.cashAmount !== null ? r.cashAmount : (r.amountPaid || 0));
const onlineOf = (r) => r.onlineAmount || 0;

const toISODate = (d) => d.toISOString().slice(0, 10);
const isToday = (dateObj) => toISODate(dateObj) === toISODate(new Date());
const isFuture = (dateObj) => toISODate(dateObj) > toISODate(new Date());

// Order lines (name, qty, rate, amount) for a card. A closed record keeps the
// exact rates it was charged at; an open request card uses this customer's
// price (or the catalog price) — the same rule the server applies.
function buildLines(card, productByKey) {
  const rec = card.record;
  const priceFor = (key) => {
    const o = (card.customPricing || []).find((it) => it.productKey === key);
    return o ? o.customerRatePerKg : productByKey[key]?.customerRatePerKg || 0;
  };
  const lines = [];
  if ((card.idlyKg || 0) > 0) lines.push({ name: productByKey.idly?.name || "Idly Batter", qty: card.idlyKg, unit: "kg", rate: rec && rec.idlyCustomerRate !== undefined ? rec.idlyCustomerRate : priceFor("idly") });
  if ((card.dosaKg || 0) > 0) lines.push({ name: productByKey.dosa?.name || "Dosa Batter", qty: card.dosaKg, unit: "kg", rate: rec && rec.dosaCustomerRate !== undefined ? rec.dosaCustomerRate : priceFor("dosa") });
  (card.extraItems || []).forEach((it) =>
    lines.push({
      name: it.productName || productByKey[it.productKey]?.name || it.productKey,
      qty: it.qty, unit: it.unit || productByKey[it.productKey]?.unit || "kg",
      rate: rec && it.customerRate !== undefined ? it.customerRate : priceFor(it.productKey),
    })
  );
  return lines.map((l) => ({ ...l, amount: round2(l.qty * l.rate) }));
}

/* ══════════════ Mark Complete: Cash / GPay / Credit ══════════════ */
function CompleteModal({ card, amount, onClose, onSubmit, onSkip, onCancel }) {
  const n = (s) => (s === "" ? 0 : Number(s) || 0);
  const [cash, setCash] = useState(String(amount));
  const [gpay, setGpay] = useState("");
  const [credit, setCredit] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sum = round2(n(cash) + n(gpay) + n(credit));
  const diff = round2(amount - sum);
  const matches = Math.abs(diff) <= 0.01;

  // Typing Cash or GPay fills Credit with whatever is left — like the driver
  // app. Credit can still be typed over by hand.
  const rest = (c, g) => String(Math.max(0, round2(amount - n(c) - n(g))));
  const onCash = (v) => { setCash(v); setCredit(rest(v, gpay)); };
  const onGpay = (v) => { setGpay(v); setCredit(rest(cash, v)); };
  const setAll = (which) => {
    setCash(which === "cash" ? String(amount) : "0");
    setGpay(which === "gpay" ? String(amount) : "0");
    setCredit(which === "credit" ? String(amount) : "0");
  };

  const run = async (fn) => {
    setBusy(true); setError("");
    try { await fn(); }
    catch (err) { setError(err.response?.data?.message || "Something went wrong. Please try again."); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-5">
        <p className="font-bold text-gray-800">Mark Complete</p>
        <p className="text-xs text-gray-400 mb-4">{card.shopName}</p>

        <div className="bg-green-50 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-green-800">Order amount</span>
          <span className="text-xl font-bold text-green-800" data-testid="order-amount">{money(amount)}</span>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mb-3" role="alert">{error}</div>}

        <div className="grid grid-cols-3 gap-2 mb-3">
          <button type="button" onClick={() => setAll("cash")} className="py-2 rounded-xl border border-gray-200 text-[11.5px] font-medium text-gray-600">All Cash</button>
          <button type="button" onClick={() => setAll("gpay")} className="py-2 rounded-xl border border-gray-200 text-[11.5px] font-medium text-gray-600">All GPay</button>
          <button type="button" onClick={() => setAll("credit")} className="py-2 rounded-xl border border-gray-200 text-[11.5px] font-medium text-gray-600">All Credit</button>
        </div>

        <div className="space-y-2.5 mb-3">
          {[
            ["Cash received", cash, onCash],
            ["GPay / UPI received", gpay, onGpay],
            ["Credit (pay later)", credit, setCredit],
          ].map(([label, value, set]) => (
            <div key={label} className="flex items-center gap-3">
              <label className="flex-1 text-sm text-gray-700">{label}</label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                <input
                  type="number" min="0" aria-label={label}
                  value={value} onChange={(e) => set(e.target.value)}
                  className="w-full pl-6 pr-2 py-2 rounded-xl border border-gray-200 text-sm text-right"
                />
              </div>
            </div>
          ))}
        </div>

        <p className={`text-xs mb-4 ${matches ? "text-green-600" : "text-red-500"}`} data-testid="match-status">
          {matches
            ? `✓ ${money(sum)} entered — matches the order amount`
            : diff > 0 ? `₹${diff} still to account for (${money(sum)} of ${money(amount)})` : `₹${Math.abs(diff)} more than the order amount`}
        </p>

        <button
          onClick={() => run(() => onSubmit({ cashAmount: n(cash), onlineAmount: n(gpay), creditAmount: n(credit) }))}
          disabled={!matches || busy}
          className="w-full py-3.5 rounded-2xl bg-green-700 text-white text-sm font-semibold disabled:opacity-40"
        >
          {busy ? "Saving…" : "Confirm & Close Order"}
        </button>
        <button onClick={onClose} disabled={busy} className="w-full text-center text-xs text-gray-400 mt-3">Back</button>
        {onSkip && (
          <button onClick={() => run(onSkip)} disabled={busy} className="w-full text-center text-xs text-gray-500 font-medium mt-2">
            Customer didn't take it — skip (kg stays in your stock)
          </button>
        )}
        {onCancel && (
          <button onClick={() => run(onCancel)} disabled={busy} className="w-full text-center text-xs text-red-500 font-medium mt-2">
            Cancel this order
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════ One order card ══════════════ */
function OrderCard({ card, productByKey, onMarkComplete }) {
  const rec = card.record;
  const lines = buildLines(card, productByKey);
  const amount = rec ? rec.amountCharged : round2(lines.reduce((s, l) => s + l.amount, 0));
  const closed = rec && (rec.status === "delivered" || rec.status === "skipped");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid="order-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{card.shopName}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${card.kind === "manual" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
            {card.kind === "manual" ? "Added by you" : "Approved request"}
          </span>
        </div>
        {closed ? (
          <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${rec.status === "skipped" ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-600"}`}>
            {rec.status === "skipped" ? "Skipped" : "✓ Completed"}
          </span>
        ) : (
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 flex-shrink-0">Pending</span>
        )}
      </div>

      <div className="border-t border-gray-50 pt-2 space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between text-xs text-gray-600">
            <span>{l.name} · {l.qty} {l.unit} × ₹{l.rate}</span>
            <span className="font-medium text-gray-700">₹{l.amount}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm font-bold text-gray-800 pt-1.5 border-t border-gray-50 mt-1.5">
          <span>Total</span><span>{money(amount)}</span>
        </div>
      </div>

      {rec && rec.status === "delivered" && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[11px]">Cash {money(cashOf(rec))}</span>
          <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px]">GPay {money(onlineOf(rec))}</span>
          <span className={`px-2 py-1 rounded-lg text-[11px] ${(rec.creditAmount || 0) > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-400"}`}>Credit {money(rec.creditAmount)}</span>
        </div>
      )}
      {rec && rec.status === "skipped" && rec.skipReason && <p className="text-[11px] text-gray-400 mt-2">Reason: {rec.skipReason}</p>}

      {!closed && (
        <button onClick={() => onMarkComplete(card, amount)} className="w-full mt-3 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold">
          Mark Complete
        </button>
      )}
    </div>
  );
}

/* ══════════════ Page ══════════════ */
export default function OrdersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [request, setRequest] = useState(null); // today's BatterRequest
  const [viewDate, setViewDate] = useState(new Date());
  const [dayDeliveries, setDayDeliveries] = useState([]);
  const [dayLoading, setDayLoading] = useState(true);
  const [completing, setCompleting] = useState(null); // { card, amount }

  const loadStatic = () => {
    Promise.all([getMyProfile(), getProducts(), getMyBatterRequests(), getMyCustomers()])
      .then(([, p, r, c]) => {
        setProducts(p.products || []);
        setRequest((r.requests || [])[0] || null);
        setCustomers(c.customers || []);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadStatic(); }, []);

  const loadDay = (dateObj) => {
    setDayLoading(true);
    getMyDeliveries(toISODate(dateObj))
      .then((d) => setDayDeliveries(d.records || []))
      .finally(() => setDayLoading(false));
  };
  useEffect(() => { loadDay(viewDate); }, [viewDate]);

  const productByKey = Object.fromEntries(products.map((p) => [p.key, p]));

  const shiftDate = (delta) => {
    const next = new Date(viewDate);
    next.setDate(next.getDate() + delta);
    if (isFuture(next)) return;
    setViewDate(next);
  };

  const refresh = () => { loadDay(viewDate); loadStatic(); };

  const viewingToday = isToday(viewDate);
  const hasApprovedRequestToday = request && (request.status === "approved" || request.status === "partially_approved");
  const pricingOf = (customerId) => customers.find((c) => c._id === customerId)?.customPricing || [];

  // Today's cards: request customers first, then orders added manually.
  const requestCards = hasApprovedRequestToday
    ? (request.customerOrders || []).map((c, i) => ({
        kind: "request", key: c.customer || `${c.shopName}-${i}`,
        customerId: c.customer, shopName: c.shopName,
        idlyKg: c.idlyKg, dosaKg: c.dosaKg, extraItems: c.extraItems || [],
        customPricing: pricingOf(c.customer),
        record: dayDeliveries.find((d) => idOf(d.customer) === c.customer && d.source !== "manual"),
      }))
    : [];
  const manualCards = dayDeliveries
    .filter((d) => d.source === "manual")
    .map((d) => ({
      kind: "manual", key: d._id, customerId: idOf(d.customer),
      shopName: d.shopName || d.customer?.shopName,
      idlyKg: d.idlyKg, dosaKg: d.dosaKg, extraItems: d.extraItems || [],
      customPricing: pricingOf(idOf(d.customer)),
      record: d,
    }));
  const cards = [...requestCards, ...manualCards];

  const completedCount = cards.filter((c) => c.record?.status === "delivered").length;
  const pendingCount = cards.filter((c) => !c.record || c.record.status === "pending").length;
  const todayRecords = dayDeliveries.filter((d) => d.status === "delivered");
  const cashTotal = round2(todayRecords.reduce((s, r) => s + cashOf(r), 0));
  const gpayTotal = round2(todayRecords.reduce((s, r) => s + onlineOf(r), 0));
  const creditTotal = round2(todayRecords.reduce((s, r) => s + (r.creditAmount || 0), 0));

  // Past days (read-only)
  const pastCompleted = dayDeliveries.filter((d) => d.status === "delivered").length;
  const pastPending = dayDeliveries.filter((d) => d.status === "pending").length;
  const pastSkipped = dayDeliveries.filter((d) => d.status === "skipped").length;

  const buildRequestRecord = (card, payment) => ({
    customerId: card.customerId, shopName: card.shopName,
    idlyKg: card.idlyKg, dosaKg: card.dosaKg,
    extraItems: (card.extraItems || []).map((it) => ({ productKey: it.productKey, qty: it.qty })),
    ...payment,
  });

  const finishComplete = async (payment) => {
    const { card } = completing;
    if (card.kind === "manual") await completeOrder(card.record._id, payment);
    else await submitDeliveries(request._id, [{ ...buildRequestRecord(card, payment), status: "delivered" }]);
    setCompleting(null);
    refresh();
  };
  const finishSkip = async () => {
    const { card } = completing;
    await submitDeliveries(request._id, [{ ...buildRequestRecord(card, {}), status: "skipped" }]);
    setCompleting(null);
    refresh();
  };
  const finishCancel = async () => {
    await cancelManualOrder(completing.card.record._id);
    setCompleting(null);
    refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto">
      <div className="bg-gradient-to-b from-green-800 to-green-700 px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white text-lg font-semibold">Orders &amp; Delivery</span>
          {viewingToday && request && (
            <span className={`px-3 py-1 rounded-full text-[11px] font-medium ${STATUS_STYLE[request.status]}`}>{request.status.replace("_", " ")}</span>
          )}
        </div>

        <div className="flex items-center justify-between bg-white/10 border border-white/20 rounded-2xl px-3 py-2">
          <button onClick={() => shiftDate(-1)} aria-label="previous day" className="text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-white text-sm font-medium">
            {viewingToday ? "Today" : viewDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <button onClick={() => shiftDate(1)} aria-label="next day" disabled={isFuture(new Date(viewDate.getTime() + 86400000))} className="text-white p-1 disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-32">
        {(loading || dayLoading) && <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>}

        {/* ══ A PAST day: read-only record ══ */}
        {!loading && !dayLoading && !viewingToday && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center"><p className="text-xl font-bold text-green-600">{pastCompleted}</p><p className="text-[11px] text-gray-400">Completed</p></div>
              <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center"><p className="text-xl font-bold text-amber-600">{pastPending}</p><p className="text-[11px] text-gray-400">Not closed</p></div>
              <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center"><p className="text-xl font-bold text-gray-500">{pastSkipped}</p><p className="text-[11px] text-gray-400">Skipped</p></div>
            </div>
            {dayDeliveries.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No orders recorded on this date.</p>}
            <div className="space-y-2">
              {dayDeliveries.map((d) => (
                <div key={d._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800 text-sm">{d.shopName || d.customer?.shopName}</p>
                    <span className={`text-xs font-medium ${d.status === "skipped" ? "text-gray-400" : d.status === "pending" ? "text-amber-600" : "text-green-600"}`}>
                      {d.status === "skipped" ? "Skipped" : d.status === "pending" ? "Not closed" : "✓ Completed"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{d.idlyKg}kg idly · {d.dosaKg}kg dosa{(d.extraItems || []).map((it) => ` · ${it.qty} ${it.unit || "kg"} ${it.productName || it.productKey}`).join("")}</p>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="font-semibold text-gray-700">{money(d.amountCharged)}</span>
                    {d.status === "delivered" && <span className="text-gray-400">Cash {money(cashOf(d))} · GPay {money(onlineOf(d))} · Credit {money(d.creditAmount)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ TODAY ══ */}
        {!loading && !dayLoading && viewingToday && (
          <>
            {(!request || request.status === "rejected") && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
                {request?.status === "rejected" && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-3">
                    Your last request was rejected{request.adminNote ? `: ${request.adminNote}` : "."}
                  </div>
                )}
                <p className="text-sm text-gray-500 mb-3">No approved batter request today. You can request batter, or add today's orders directly from the Customers tab.</p>
                <div className="flex gap-2">
                  <button onClick={() => navigate("/customers")} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold">Request Batter</button>
                  <button onClick={() => navigate("/customers")} className="flex-1 py-2.5 rounded-xl border border-green-700 text-green-700 text-sm font-semibold">＋ Add Order</button>
                </div>
              </div>
            )}

            {request && request.status === "pending" && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
                <p className="font-semibold text-amber-800 text-sm">⏳ Batter request waiting for admin approval</p>
                <p className="text-xs text-amber-700 mt-1">Requested: {request.requestedIdlyKg}kg idly / {request.requestedDosaKg}kg dosa{(request.requestedExtraItems || []).map((it) => ` · ${it.qty} ${it.unit || "kg"} ${it.productName || it.productKey}`).join("")}</p>
              </div>
            )}

            {hasApprovedRequestToday && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
                Approved: {request.approvedIdlyKg}kg idly / {request.approvedDosaKg}kg dosa{(request.approvedExtraItems || []).map((it) => ` · ${it.qty} ${it.unit || "kg"} ${it.productName || it.productKey}`).join("")}
                {request.deliveryTime && <> · Delivery time: <b>{request.deliveryTime}</b></>}
              </div>
            )}

            {cards.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center"><p className="text-xl font-bold text-gray-800">{cards.length}</p><p className="text-[11px] text-gray-400">Orders</p></div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center"><p className="text-xl font-bold text-green-600">{completedCount}</p><p className="text-[11px] text-gray-400">Completed</p></div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center"><p className="text-xl font-bold text-amber-600">{pendingCount}</p><p className="text-[11px] text-gray-400">Pending</p></div>
                </div>
                {todayRecords.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 px-4 py-2.5 mb-4 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Collected today</span>
                    <span className="text-gray-600">Cash <b>{money(cashTotal)}</b> · GPay <b>{money(gpayTotal)}</b> · Credit <b className="text-amber-600">{money(creditTotal)}</b></span>
                  </div>
                )}
              </>
            )}

            <p className="font-bold text-gray-800 mb-3 px-1">Today's Orders</p>
            <div className="space-y-3">
              {cards.map((card) => (
                <OrderCard key={card.key} card={card} productByKey={productByKey} onMarkComplete={(c, amount) => setCompleting({ card: c, amount })} />
              ))}
              {cards.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">No orders yet today. Open the Customers tab and tap “＋ Today's Order” on a customer.</p>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />

      {completing && (
        <CompleteModal
          card={completing.card}
          amount={completing.amount}
          onClose={() => setCompleting(null)}
          onSubmit={finishComplete}
          onSkip={completing.card.kind === "request" ? finishSkip : undefined}
          onCancel={completing.card.kind === "manual" ? finishCancel : undefined}
        />
      )}
    </div>
  );
}