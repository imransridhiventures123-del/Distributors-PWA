// FILE: src/pages/CheckoutPage.jsx
// NEW FILE — Feature: e-commerce-style Request Batter flow, final step.
// Shows everything added to the cart across all customers (grouped by
// shop, each with its products+quantities), lets the distributor pick a
// delivery date (calendar input, TODAY OR LATER only — no past dates)
// and time, then places the order. Still uses the exact same,
// unchanged submitBatterRequest() API as before — only the UI/UX that
// builds the request changed. The existing stock carry-over warning
// (you already have some kg in your fridge) is preserved here too.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitBatterRequest, getMyProfile, getProducts } from "../api/distributorApi";
import { useCart } from "../context/CartContext";

function CarryOverModal({ totals, stock, onSendReduced, onSendFull, onClose }) {
  const netIdly = Math.max(0, totals.idly - stock.idly);
  const netDosa = Math.max(0, totals.dosa - stock.dosa);
  const [reason, setReason] = useState("");
  const [wantsFull, setWantsFull] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5">
        <p className="font-bold text-gray-800 mb-2">You already have stock in your fridge</p>
        <p className="text-sm text-gray-500 mb-4">
          Cart needs {totals.idly}kg idly / {totals.dosa}kg dosa, but you already have
          {" "}{stock.idly}kg idly / {stock.dosa}kg dosa in stock. You only need to request
          {" "}<b>{netIdly}kg idly / {netDosa}kg dosa</b> more.
        </p>
        {!wantsFull ? (
          <div className="space-y-3">
            <button onClick={() => onSendReduced(netIdly, netDosa)} className="w-full py-3 rounded-xl bg-green-700 text-white text-sm font-semibold">
              Send Reduced Request ({netIdly}kg / {netDosa}kg)
            </button>
            <button onClick={() => setWantsFull(true)} className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium">
              Still Send Full Amount ({totals.idly}kg / {totals.dosa}kg)
            </button>
            <button onClick={onClose} className="w-full text-center text-xs text-gray-400 mt-1">Cancel</button>
          </div>
        ) : (
          <div>
            <label className="text-xs font-medium text-gray-500">Reason for requesting full amount despite having stock</label>
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. existing stock is reserved for another shop's pending order"
              className="w-full mt-1 mb-3 px-3 py-2 rounded-xl border border-gray-200 text-sm h-20"
            />
            <div className="flex gap-3">
              <button onClick={() => setWantsFull(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Back</button>
              <button
                onClick={() => reason.trim() && onSendFull(reason.trim())}
                disabled={!reason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium disabled:opacity-50"
              >
                Send Full Amount
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// UPDATED — Feature: admin-managed product catalog (Level 2). Names and
// units now come from the live catalog (GET /api/products) instead of a
// fixed Idly/Dosa label map, so any product the admin adds shows up here
// correctly, and — the important part — is actually SENT with the order
// (before, only Idly/Dosa were picked out of the cart and everything else
// was silently dropped).
const CORE_KEYS = ["idly", "dosa"];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, removeCustomer, clearCart, totalItems } = useCart();
  const [stock, setStock] = useState({ idly: 0, dosa: 0 });
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCarryOver, setShowCarryOver] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([getMyProfile(), getProducts()])
      .then(([prof, p]) => {
        setStock(prof.distributor?.currentStockKg || { idly: 0, dosa: 0 });
        const map = {};
        (p.products || []).forEach((x) => { map[x.key] = x; });
        setRates(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const entries = Object.entries(cart); // [customerId, { shopName, items }]

  const totals = entries.reduce(
    (acc, [, c]) => ({
      idly: acc.idly + (c.items.idly || 0),
      dosa: acc.dosa + (c.items.dosa || 0),
    }),
    { idly: 0, dosa: 0 }
  );

  const nameOf = (key) => rates[key]?.name || key;
  const unitOf = (key) => rates[key]?.unit || "kg";

  // Quantities of every product other than Idly/Dosa, across all customers
  const extraTotals = {};
  entries.forEach(([, c]) => {
    Object.entries(c.items).forEach(([key, qty]) => {
      if (!CORE_KEYS.includes(key)) extraTotals[key] = (extraTotals[key] || 0) + qty;
    });
  });

  const grandTotal = entries.reduce((sum, [, c]) => {
    return sum + Object.entries(c.items).reduce((s, [key, qty]) => s + qty * (rates[key]?.customerRatePerKg || 0), 0);
  }, 0);

  // Idly/Dosa keep their own fields exactly as before; every other product
  // in the cart goes in extraItems.
  const buildOrders = () =>
    entries.map(([customerId, c]) => ({
      customerId, shopName: c.shopName,
      idlyKg: c.items.idly || 0, dosaKg: c.items.dosa || 0,
      extraItems: Object.entries(c.items)
        .filter(([key]) => !CORE_KEYS.includes(key))
        .map(([key, qty]) => ({ productKey: key, productName: nameOf(key), unit: unitOf(key), qty })),
    }));

  const doSubmit = async (options) => {
    setSubmitting(true);
    setError("");
    try {
      await submitBatterRequest(buildOrders(), { ...options, requestedDeliveryDate: date, requestedDeliveryTime: time });
      clearCart();
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to place order.");
    } finally { setSubmitting(false); setShowCarryOver(false); }
  };

  const handlePlaceOrder = () => {
    setError("");
    if (entries.length === 0) { setError("Your cart is empty."); return; }
    const hasStock = stock.idly > 0 || stock.dosa > 0;
    if (hasStock && (totals.idly > 0 || totals.dosa > 0)) {
      setShowCarryOver(true);
    } else {
      doSubmit({ finalIdlyKg: totals.idly, finalDosaKg: totals.dosa });
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-5">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
        </div>
        <p className="text-xl font-bold text-green-700 mb-2">Ordered Successfully!</p>
        <p className="text-sm text-gray-500 mb-8">Your request has been sent to the admin for approval. You'll see the status on the Orders tab.</p>
        <button onClick={() => navigate("/orders")} className="w-full py-3 rounded-xl bg-green-700 text-white text-sm font-semibold">
          Go to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10 max-w-md mx-auto">
      <div className="bg-gradient-to-b from-green-800 to-green-700 px-4 pt-6 pb-5 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="text-white text-lg font-semibold">Checkout</span>
        <div className="w-6" />
      </div>

      <div className="px-4 pt-4">
        {loading && <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>}
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl mb-3">{error}</div>}

        {!loading && entries.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-3">Your cart is empty.</p>
            <button onClick={() => navigate("/customers")} className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium">
              Browse Customers
            </button>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-500 mb-2">Order Summary ({entries.length} customer{entries.length > 1 ? "s" : ""})</p>
            <div className="space-y-3 mb-4">
              {entries.map(([customerId, c]) => (
                <div key={customerId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-800 text-sm">{c.shopName}</p>
                    <button onClick={() => removeCustomer(customerId)} className="text-xs text-red-500 font-medium">Remove</button>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(c.items).map(([key, qty]) => (
                      <div key={key} className="flex justify-between text-xs text-gray-500">
                        <span>{nameOf(key)} · {qty} {unitOf(key)}</span>
                        <span>₹{qty * (rates[key]?.customerRatePerKg || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Total</span><span>{totals.idly}kg idly / {totals.dosa}kg dosa</span>
              </div>
              {Object.entries(extraTotals).map(([key, qty]) => (
                <div key={key} className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{nameOf(key)}</span><span>{qty} {unitOf(key)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-100">
                <span>Estimated Total</span><span>₹{grandTotal}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
              <p className="text-xs font-semibold text-gray-500 mb-3">When do you need this delivered?</p>
              <label className="text-xs text-gray-500">Delivery date</label>
              <input
                type="date" value={date} min={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 mb-3 px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
              <label className="text-xs text-gray-500">Delivery time</label>
              <input
                type="time" value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
            </div>

            <button onClick={handlePlaceOrder} disabled={submitting} className="w-full py-3.5 rounded-xl bg-green-700 text-white text-sm font-semibold disabled:opacity-60">
              {submitting ? "Placing Order…" : `Buy · Send Request (${totalItems} items)`}
            </button>
          </>
        )}
      </div>

      {showCarryOver && (
        <CarryOverModal
          totals={totals} stock={stock}
          onClose={() => setShowCarryOver(false)}
          onSendReduced={(idly, dosa) => doSubmit({ finalIdlyKg: idly, finalDosaKg: dosa })}
          onSendFull={(reason) => doSubmit({ finalIdlyKg: totals.idly, finalDosaKg: totals.dosa, carryOverReason: reason })}
        />
      )}
    </div>
  );
}