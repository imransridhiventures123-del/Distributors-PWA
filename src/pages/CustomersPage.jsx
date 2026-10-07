// FILE: src/pages/CustomersPage.jsx
// UPDATED — Feature: dedicated Customer Detail page. Tapping a customer
// card no longer expands inline product cards underneath it — it now
// navigates to /customers/:id (see the new CustomerDetailPage.jsx),
// which shows the customer's info, stats, Products tab (with the same
// Add to Cart feature, just moved there) and an Order History tab, per
// your reference image. Search, segment tabs (All/Regular/Premium/New),
// call/WhatsApp buttons, and "+ Add Customer" are all unchanged — same
// getMyCustomers() / createMyCustomer() calls as before, no API change.
//
// Same honesty note as before on the segment tabs: your Customer records
// only carry a real "regular / irregular" tag from the backend — there's
// no "Premium" or "New" field. These two are derived from fields you
// already have (adjust the thresholds below, or ask for a real backend
// segment field later):
//   - "New"     → customer added within the last 7 days (createdAt)
//   - "Premium" → customer's totalKg so far is 40kg or more
//   - "Regular" → everyone else
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import {
  getMyCustomers, createMyCustomer, getProducts, getMyDeliveries,
  createManualOrder, cancelManualOrder, updateMyCustomerPricing,
} from "../api/distributorApi";
import { useDistributorAuth } from "../context/DistributorAuthContext";
import { useCart } from "../context/CartContext";

const PREMIUM_KG_THRESHOLD = 40;
const NEW_DAYS_THRESHOLD = 7;

function classify(customer) {
  const daysSinceAdded = (Date.now() - new Date(customer.createdAt).getTime()) / 86400000;
  if (daysSinceAdded <= NEW_DAYS_THRESHOLD) return "New";
  if ((customer.totalKg || 0) >= PREMIUM_KG_THRESHOLD) return "Premium";
  return "Regular";
}

const BADGE_STYLE = {
  Regular: "text-green-600",
  Premium: "text-amber-600",
  New: "text-blue-600",
};

const TABS = ["All", "Regular", "Premium", "New"];

// UPDATED — Add Customer redesigned to match your reference image
// exactly: full-screen green-header layout, "Customer Name"/"Phone
// Number"/"Address" labeled fields, and a "Customer Type" segmented
// picker (Regular/Premium/New). Still implemented as an overlay inside
// this same file (no new route/page), per your instruction to touch
// only this file.
//
// PLUS the extra field you asked for: "Business Type" (Home /
// Supermarket / Hotel), added right below Customer Type.
//
// Two honesty notes on the two segmented pickers:
//  1. "Customer Type" (Regular/Premium/New) here is a MANUAL choice at
//     creation time. Everywhere else in the app (the customer list's
//     badges, the detail page), that same label is auto-calculated from
//     order history (days since added / total kg) — see the classify()
//     function above. The two are not connected: whatever you pick here
//     is sent to the backend, but the rest of the app will keep showing
//     its own calculated badge until the Customer model has a real
//     field for a manually-set type and every other page is updated to
//     read it instead of calculating it.
//  2. "Business Type" (Home/Supermarket/Hotel) is a brand-new field with
//     no existing column on the Customer model. It's captured here and
//     sent to createMyCustomer() so it's ready the moment the backend
//     adds support for it, but until then the backend will most likely
//     just ignore/drop it silently — nothing will break, it just won't
//     be saved yet. Let me know if you'd like the backend Customer
//     model + admin screens updated to actually store and show it.
function AddCustomerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    shopName: "", phone: "", address: "",
    customerType: "Regular", businessType: "Home",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.shopName || !form.phone) { setError("Customer name and phone are required."); return; }
    setSaving(true);
    try {
      const data = await createMyCustomer(form);
      onCreated(data.customer);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add customer.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col max-w-md mx-auto">
      <div className="bg-gradient-to-b from-green-800 to-green-700 px-4 pt-6 pb-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-white text-lg font-semibold">Add New Customer</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-28">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl mb-4">{error}</div>}

        <div className="mb-4">
          <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            value={form.shopName} onChange={(e) => set("shopName", e.target.value)}
            placeholder="Enter customer name"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div className="mb-4">
          <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            value={form.phone} onChange={(e) => set("phone", e.target.value)}
            placeholder="Enter phone number"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div className="mb-4">
          <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Address</label>
          <textarea
            value={form.address} onChange={(e) => set("address", e.target.value)}
            placeholder="Enter address"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
          />
        </div>

        <div className="mb-4">
          <label className="text-[13px] font-medium text-gray-700 mb-2 block">Customer Type</label>
          <div className="flex gap-2">
            {["Regular", "Premium", "New"].map((t) => (
              <button
                key={t} type="button"
                onClick={() => set("customerType", t)}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold ${
                  form.customerType === t ? "bg-green-700 text-white" : "bg-white border border-gray-200 text-gray-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* NEW — extra field you asked for */}
        <div className="mb-4">
          <label className="text-[13px] font-medium text-gray-700 mb-2 block">Business Type</label>
          <div className="flex gap-2">
            {["Home", "Supermarket", "Hotel"].map((t) => (
              <button
                key={t} type="button"
                onClick={() => set("businessType", t)}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold ${
                  form.businessType === t ? "bg-green-700 text-white" : "bg-white border border-gray-200 text-gray-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4">
        <button
          onClick={submit} disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-green-700 text-white text-[14.5px] font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Customer"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════ One-click "Today's Order" form ══════════════════ */
// Tap "＋ Today's Order" on a customer: enter how many kg are needed today
// and the amount is worked out automatically from THIS customer's price.
// The price boxes are editable — if you change one it is saved as this
// customer's price (so the Ledger is right from the very first order).
// Confirming creates a PENDING order that shows up as a card on the
// Orders tab, where it is closed with Mark Complete.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function QuickOrderModal({ customer, products, pending, onClose, onSaved, onCancelled }) {
  const effective = (p) => {
    const o = (customer.customPricing || []).find((it) => it.productKey === p.key);
    return o ? o.customerRatePerKg : p.customerRatePerKg;
  };
  const initialQty = (p) => {
    if (!pending) return 0;
    if (p.key === "idly") return pending.idlyKg || 0;
    if (p.key === "dosa") return pending.dosaKg || 0;
    return (pending.extraItems || []).find((it) => it.productKey === p.key)?.qty || 0;
  };

  const [qty, setQty] = useState(() => Object.fromEntries(products.map((p) => [p.key, initialQty(p)])));
  const [price, setPrice] = useState(() => Object.fromEntries(products.map((p) => [p.key, String(effective(p))])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const lineAmount = (p) => round2((qty[p.key] || 0) * (Number(price[p.key]) || 0));
  const total = round2(products.reduce((s, p) => s + lineAmount(p), 0));
  const bump = (key, d) => setQty((q) => ({ ...q, [key]: Math.max(0, round2((q[key] || 0) + d)) }));

  const submit = async () => {
    setError("");
    const chosen = products.filter((p) => (qty[p.key] || 0) > 0);
    if (!chosen.length) { setError("Enter the kg for at least one product."); return; }
    for (const p of chosen) {
      const v = Number(price[p.key]);
      if (price[p.key] === "" || !Number.isFinite(v) || v < 0) { setError(`Enter a valid price for ${p.name}.`); return; }
    }
    setSaving(true);
    try {
      let updatedCustomer = null;
      const changed = chosen.filter((p) => Number(price[p.key]) !== effective(p));
      if (changed.length) {
        const map = Object.fromEntries((customer.customPricing || []).map((it) => [it.productKey, it.customerRatePerKg]));
        changed.forEach((p) => { map[p.key] = Number(price[p.key]); });
        const res = await updateMyCustomerPricing(
          customer._id,
          Object.entries(map).map(([productKey, customerRatePerKg]) => ({ productKey, customerRatePerKg }))
        );
        updatedCustomer = res.customer;
      }
      const data = await createManualOrder({
        customerId: customer._id,
        idlyKg: qty.idly || 0,
        dosaKg: qty.dosa || 0,
        extraItems: chosen.filter((p) => !["idly", "dosa"].includes(p.key)).map((p) => ({ productKey: p.key, qty: qty[p.key] })),
      });
      onSaved(data.record, updatedCustomer);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the order. Please try again.");
    } finally { setSaving(false); }
  };

  const cancelOrder = async () => {
    if (!window.confirm("Cancel today's order for this customer?")) return;
    setSaving(true);
    try { await cancelManualOrder(pending._id); onCancelled(); }
    catch (err) { setError(err.response?.data?.message || "Couldn't cancel the order."); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-5">
        <p className="font-bold text-gray-800">{pending ? "Edit Today's Order" : "Today's Order"}</p>
        <p className="text-xs text-gray-400 mb-4">{customer.shopName} · how much do they need today?</p>
        {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">{error}</div>}

        <div className="space-y-3 mb-4">
          {products.map((p) => (
            <div key={p.key} className="bg-gray-50 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800">{p.name}</span>
                <span className="text-sm font-semibold text-gray-700">₹{lineAmount(p)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <button type="button" aria-label={`decrease ${p.name}`} onClick={() => bump(p.key, -1)} className="w-7 h-7 rounded-full border border-green-700 text-green-700 text-sm font-bold">−</button>
                  <input
                    type="number" min="0" step="0.5" aria-label={`${p.name} quantity`}
                    value={qty[p.key] || 0}
                    onChange={(e) => setQty((q) => ({ ...q, [p.key]: Math.max(0, Number(e.target.value) || 0) }))}
                    className="w-14 text-center px-1 py-1 rounded-lg border border-gray-200 text-sm"
                  />
                  <button type="button" aria-label={`increase ${p.name}`} onClick={() => bump(p.key, 1)} className="w-7 h-7 rounded-full bg-green-700 text-white text-sm font-bold">+</button>
                  <span className="text-xs text-gray-400">{p.unit || "kg"}</span>
                </div>
                <div className="flex-1" />
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                  <input
                    type="number" min="0" aria-label={`${p.name} price`}
                    value={price[p.key]}
                    onChange={(e) => setPrice((pr) => ({ ...pr, [p.key]: e.target.value }))}
                    className="w-full pl-5 pr-1 py-1 rounded-lg border border-gray-200 text-sm text-right"
                  />
                </div>
                <span className="text-[10px] text-gray-400 -ml-1">/{p.unit || "kg"}</span>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No products available.</p>}
        </div>

        <div className="flex items-center justify-between bg-green-50 rounded-2xl px-4 py-3 mb-4">
          <span className="text-sm text-green-800">Amount to collect</span>
          <span className="text-lg font-bold text-green-800" data-testid="quick-total">₹{total}</span>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium">Close</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-3 rounded-xl bg-green-700 text-white text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving…" : pending ? "Update Order" : "Confirm Order"}
          </button>
        </div>
        {pending && (
          <button onClick={cancelOrder} disabled={saving} className="w-full text-center text-xs text-red-500 font-medium mt-3">Cancel this order</button>
        )}
      </div>
    </div>
  );
}

const idOf = (x) => (x && typeof x === "object" ? x._id : x);

export default function CustomersPage() {
  const { distributor } = useDistributorAuth();
  const navigate = useNavigate();
  const { cart, totalItems } = useCart();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  // NEW — one-click Today's Order
  const [products, setProducts] = useState([]);
  const [todayRecs, setTodayRecs] = useState([]);
  const [quickFor, setQuickFor] = useState(null); // the customer whose order form is open

  const load = () => {
    setLoading(true);
    Promise.all([getMyCustomers(), getProducts(), getMyDeliveries()])
      .then(([c, p, d]) => {
        setCustomers(c.customers || []);
        setProducts((p.products || []).filter((x) => x.isActive !== false));
        setTodayRecs(d.records || []);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const withTag = customers.map((c) => ({ ...c, segment: classify(c) }));
  const counts = {
    All: withTag.length,
    Regular: withTag.filter((c) => c.segment === "Regular").length,
    Premium: withTag.filter((c) => c.segment === "Premium").length,
    New: withTag.filter((c) => c.segment === "New").length,
  };

  const filtered = withTag
    .filter((c) => tab === "All" || c.segment === tab)
    .filter((c) => (c.shopName + c.phone).toLowerCase().includes(search.toLowerCase()));

  const whatsappLink = (customer) => {
    const phone = (customer.phone || "").replace(/\D/g, "");
    const msg = `Hi ${customer.ownerName || customer.shopName}, this is ${distributor?.name || "your distributor"} from Sridhi. Regarding your today's Idly/Dosa batter order — please confirm your requirement. Thank you!`;
    return `https://wa.me/91${phone.length === 10 ? phone : phone.slice(-10)}?text=${encodeURIComponent(msg)}`;
  };

  // Where is each customer's order today? pending (manual order waiting to be
  // delivered) and/or already delivered.
  const todayBy = {};
  todayRecs.forEach((r) => {
    const e = (todayBy[idOf(r.customer)] = todayBy[idOf(r.customer)] || { delivered: 0 });
    if (r.status === "pending" && r.source === "manual") e.pending = r;
    if (r.status === "delivered") e.delivered += 1;
  });

  const cartCountFor = (customerId) => Object.keys(cart[customerId]?.items || {}).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 max-w-md mx-auto">
      {/* ── Green header ── */}
      <div className="bg-gradient-to-b from-green-800 to-green-700 px-4 pt-6 pb-5 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-white text-lg font-semibold">My Customers</span>
        <button onClick={() => setShowAdd(true)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="px-4 pt-4">
        {/* ── Search + filter ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2 px-4 py-3 mb-4">
          <svg className="w-[18px] h-[18px] text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name or phone..."
            className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
          <svg className="w-[18px] h-[18px] text-green-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>

        {/* ── Segment tabs ── */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap ${
                tab === t ? "bg-green-800 text-white" : "bg-white border border-gray-200 text-gray-500"
              }`}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-3">No customers match this filter.</p>
            <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium">+ Add a customer</button>
          </div>
        )}

        {/* ── Customer cards — tap navigates to the detail page ── */}
        <div className="space-y-2.5">
          {filtered.map((c) => {
            const cartCount = cartCountFor(c._id);
            return (
              <div
                key={c._id}
                onClick={() => navigate(`/customers/${c._id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden px-4 py-3.5 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-800 text-[14px] truncate">{c.shopName}</p>
                      <span className={`text-[12px] font-semibold flex-shrink-0 ${BADGE_STYLE[c.segment]}`}>{c.segment}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[12.5px] text-gray-400 truncate">{c.phone}</p>
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {cartCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold">🛒{cartCount}</span>
                        )}
                        <a href={`tel:${c.phone}`} className="w-8 h-8 rounded-full border border-green-600 text-green-600 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                        <a href={whatsappLink(c)} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.52 3.48A11.87 11.87 0 0012.02 0C5.4 0 .06 5.34.06 11.96c0 2.1.56 4.15 1.62 5.96L0 24l6.24-1.64a11.9 11.9 0 005.78 1.48h.01c6.62 0 11.96-5.34 11.96-11.96 0-3.2-1.24-6.2-3.47-8.4zM12.03 21.4a9.4 9.4 0 01-4.8-1.31l-.34-.2-3.58.94.96-3.5-.22-.36a9.44 9.44 0 01-1.45-5.01c0-5.22 4.25-9.47 9.48-9.47a9.4 9.4 0 016.7 2.78 9.4 9.4 0 012.77 6.7c0 5.23-4.25 9.43-9.52 9.43zm5.18-7.08c-.28-.14-1.67-.82-1.93-.92-.26-.1-.45-.14-.64.14-.19.28-.74.92-.9 1.11-.17.19-.33.21-.61.07-.28-.14-1.18-.43-2.24-1.38-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.19-.28.28-.47.1-.19.05-.35-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.35-.26.28-1 .98-1 2.38 0 1.4 1.02 2.76 1.16 2.95.14.19 2 3.05 4.85 4.28.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.67-.68 1.9-1.34.24-.66.24-1.22.17-1.34-.07-.12-.26-.19-.54-.33z" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    <p className="text-[12px] text-gray-400 mt-1">{c.totalOrders || 0} orders · {c.totalKg || 0} kg</p>

                    {/* NEW — one-click Today's Order */}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      {todayBy[c._id]?.delivered > 0 && (
                        <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-medium">✓ Delivered today</span>
                      )}
                      {todayBy[c._id]?.pending && (
                        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">Order placed · ₹{todayBy[c._id].pending.amountCharged}</span>
                      )}
                      <button
                        onClick={() => setQuickFor(c)}
                        className="ml-auto px-3 py-1.5 rounded-full bg-green-700 text-white text-[12px] font-semibold"
                      >
                        {todayBy[c._id]?.pending ? "Edit Order" : "＋ Today's Order"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating cart button (unchanged feature) */}
      {totalItems > 0 && (
        <button
          onClick={() => navigate("/checkout")}
          className="fixed bottom-20 right-4 max-w-md mx-auto bg-green-700 text-white rounded-full px-5 py-3.5 shadow-lg flex items-center gap-2 z-30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m-10 0a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
          <span className="text-sm font-semibold">View Cart ({totalItems})</span>
        </button>
      )}

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onCreated={(c) => { setShowAdd(false); setCustomers((list) => [c, ...list]); }}
        />
      )}

      {quickFor && (
        <QuickOrderModal
          customer={quickFor}
          products={products}
          pending={todayBy[quickFor._id]?.pending}
          onClose={() => setQuickFor(null)}
          onCancelled={() => { setQuickFor(null); load(); }}
          onSaved={(record, updatedCustomer) => {
            setQuickFor(null);
            if (updatedCustomer) setCustomers((list) => list.map((x) => (x._id === updatedCustomer._id ? { ...x, customPricing: updatedCustomer.customPricing } : x)));
            load();
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}