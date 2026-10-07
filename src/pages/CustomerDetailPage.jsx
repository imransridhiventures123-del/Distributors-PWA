// FILE: src/pages/CustomerDetailPage.jsx
// NEW FILE — Feature: dedicated customer detail page (replaces the old
// tap-to-expand-inline-products behavior on the Customers list — see
// CustomersPage.jsx, which now navigates here instead of expanding).
// Matches the reference image exactly: customer info card (avatar, name,
// phone, segment badge, edit icon), a 3-column stats row (Total Orders,
// Total Quantity, Pending), a "Products" / "Order History" tab switch,
// the product list with a qty stepper and live per-line price, and a
// single bottom "Add to Cart (Xkg) — ₹Y" bar that adds everything in one
// tap. No backend/API change — only calls that already existed
// (getMyCustomers, getProducts, getMyLedger, getMyDeliveries) are used.
//
// Two honesty notes, so nothing here looks more "live" than it is:
//   1. There's no getCustomerById endpoint on the distributor side, so
//      this page fetches the same customer LIST you already had
//      (getMyCustomers) and finds this one by the :id in the URL —
//      exactly as safe as before, just one extra client-side lookup.
//   2. "Order History" can only show TODAY's deliveries for this
//      customer (from the existing GET /api/deliveries/mine, which has
//      no per-customer, multi-day endpoint yet). Rather than invent a
//      fake history list, older days show a plain note instead — ask if
//      you'd like a real "history for one customer" backend endpoint
//      added later.
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { getMyCustomers, getProducts, getMyLedger, getMyDeliveries, updateMyCustomerPricing } from "../api/distributorApi";
import { useCart } from "../context/CartContext";

const PREMIUM_KG_THRESHOLD = 40;
const NEW_DAYS_THRESHOLD = 7;

function classify(customer) {
  const daysSinceAdded = (Date.now() - new Date(customer.createdAt).getTime()) / 86400000;
  if (daysSinceAdded <= NEW_DAYS_THRESHOLD) return "New";
  if ((customer.totalKg || 0) >= PREMIUM_KG_THRESHOLD) return "Premium";
  return "Regular";
}

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, qtyFor, totalItems } = useCart();

  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [pending, setPending] = useState(0);
  const [todayOrders, setTodayOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Products");
  const [quantities, setQuantities] = useState({}); // { [productKey]: kg }
  const [added, setAdded] = useState(false);
  // NEW — Feature: per-customer pricing (set it here any time; admin can set
  // it too when assigning — whoever saves last wins).
  const [priceInputs, setPriceInputs] = useState({}); // { [productKey]: string }
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [pricingError, setPricingError] = useState("");

  // This customer's own price for a product if one is set, else the catalog
  // price — the same rule the server uses when the order is charged.
  const priceFor = (key) => {
    const override = customer?.customPricing?.find((it) => it.productKey === key);
    return override ? override.customerRatePerKg : (products.find((p) => p.key === key)?.customerRatePerKg || 0);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getMyCustomers(), getProducts(), getMyLedger(), getMyDeliveries()])
      .then(([c, p, l, d]) => {
        const found = (c.customers || []).find((x) => x._id === id);
        setCustomer(found || null);
        setProducts((p.products || []).filter((x) => x.isActive !== false));
        const ledgerRow = (l.customerLedger || []).find((x) => x.customerId === id);
        setPending(ledgerRow?.outstanding || 0);
        setTodayOrders((d.records || []).filter((r) => (r.customer?._id || r.customer) === id));
        // Pre-fill steppers with anything already sitting in the cart for
        // this customer, same as the old inline card used to do.
        const initial = {};
        (p.products || []).forEach((prod) => { initial[prod.key] = qtyFor(id, prod.key) || 0; });
        setQuantities(initial);
        const priceInit = {};
        (found?.customPricing || []).forEach((it) => { priceInit[it.productKey] = String(it.customerRatePerKg); });
        setPriceInputs(priceInit);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const bump = (key, delta) => setQuantities((q) => ({ ...q, [key]: Math.max(0, (q[key] || 0) + delta) }));
  const setQty = (key, val) => setQuantities((q) => ({ ...q, [key]: Math.max(0, Number(val) || 0) }));

  const totalKg = Object.values(quantities).reduce((s, v) => s + v, 0);
  const totalPrice = products.reduce((s, p) => s + (quantities[p.key] || 0) * priceFor(p.key), 0);
  // Products can now be sold by kg, packet, litre... so only call the
  // total "kg" when every selected product really is sold by the kg.
  const selectedProducts = products.filter((p) => (quantities[p.key] || 0) > 0);
  const totalUnitLabel = selectedProducts.every((p) => (p.unit || "kg") === "kg") ? "kg" : "items";

  const handleAddToCart = () => {
    if (!customer || totalKg <= 0) return;
    products.forEach((p) => {
      if ((quantities[p.key] || 0) > 0) addItem(customer._id, customer.shopName, p.key, quantities[p.key]);
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const savePricing = async () => {
    setPricingError(""); setSavingPricing(true); setPricingSaved(false);
    try {
      const items = Object.entries(priceInputs)
        .filter(([, v]) => v !== "" && v !== null && v !== undefined)
        .map(([productKey, v]) => ({ productKey, customerRatePerKg: Number(v) }));
      const data = await updateMyCustomerPricing(customer._id, items);
      setCustomer((c) => ({ ...c, customPricing: data.customer.customPricing }));
      setPricingSaved(true); setTimeout(() => setPricingSaved(false), 2000);
    } catch (err) {
      setPricingError(err.response?.data?.message || "Couldn't save pricing.");
    } finally { setSavingPricing(false); }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-6">
        <p className="text-gray-400 text-sm mb-3">Customer not found.</p>
        <button onClick={() => navigate("/customers")} className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium">Back to Customers</button>
      </div>
    );
  }

  const segment = classify(customer);

  return (
    <div className="min-h-screen bg-gray-50 pb-28 max-w-md mx-auto">
      {/* ── Green header ── */}
      <div className="bg-gradient-to-b from-green-800 to-green-700 px-4 pt-6 pb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-white text-lg font-semibold truncate">{customer.shopName}</span>
      </div>

      <div className="px-4 pt-4">
        {/* ── Info card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 relative">
          <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-green-50 text-green-700 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-[15px]">{customer.shopName}</p>
              <p className="text-[13px] text-gray-400">{customer.phone}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-green-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
            {segment} Customer
          </span>
        </div>

        {/* ── Stats row ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 grid grid-cols-3 divide-x divide-gray-100 text-center">
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Total Orders</p>
            <p className="text-[16px] font-bold text-gray-800">{customer.totalOrders || 0}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Total Quantity</p>
            <p className="text-[16px] font-bold text-gray-800">{customer.totalKg || 0} kg</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Pending</p>
            <p className="text-[16px] font-bold text-red-500">{money(pending)}</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex bg-white rounded-2xl border border-gray-100 shadow-sm p-1 mb-4">
          <button
            onClick={() => setTab("Products")}
            className={`flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold ${tab === "Products" ? "bg-green-700 text-white" : "text-gray-500"}`}
          >
            Products
          </button>
          <button
            onClick={() => setTab("Order History")}
            className={`flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold ${tab === "Order History" ? "bg-green-700 text-white" : "text-gray-500"}`}
          >
            Order History
          </button>
          <button
            onClick={() => setTab("Pricing")}
            className={`flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold ${tab === "Pricing" ? "bg-green-700 text-white" : "text-gray-500"}`}
          >
            Pricing
          </button>
        </div>

        {/* ── Products tab ── */}
        {tab === "Products" && (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                <img
                  src={p.imageUrl || `/assets/products/${p.key}.jpg`}
                  alt={p.name}
                  className="w-16 h-16 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                  {p.description && <p className="text-[11px] text-gray-400 leading-snug line-clamp-2">{p.description}</p>}
                  <p className="text-xs text-gray-400 mb-1">
                    ₹{priceFor(p.key)}/{p.unit || "kg"}
                    {customer.customPricing?.some((it) => it.productKey === p.key) && <span className="text-green-600"> · this customer's price</span>}
                  </p>
                  <p className="text-[11px] text-green-600 mb-1.5">● In Stock</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => bump(p.key, -1)} className="w-7 h-7 rounded-full border border-green-700 text-green-700 flex items-center justify-center text-sm font-bold">−</button>
                    <input
                      type="number" min="0"
                      value={quantities[p.key] || 0}
                      onChange={(e) => setQty(p.key, e.target.value)}
                      className="w-12 text-center px-1 py-1 rounded-lg border border-gray-200 text-sm"
                    />
                    <button onClick={() => bump(p.key, 1)} className="w-7 h-7 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-bold">+</button>
                  </div>
                </div>
                <p className="font-semibold text-gray-800 text-sm flex-shrink-0">₹{(quantities[p.key] || 0) * priceFor(p.key)}</p>
              </div>
            ))}
            {products.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No products available.</p>}
          </div>
        )}

        {/* ── Pricing tab ── */}
        {tab === "Pricing" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-3">Set this customer's price for each product. Orders, the amount to collect and the Ledger all use it. Leave a box empty to use the normal catalog price.</p>
            {pricingError && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">{pricingError}</div>}
            <div className="space-y-3 mb-4">
              {products.map((p) => (
                <div key={p.key} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-700">{p.name}</span>
                  <span className="text-[11px] text-gray-400">catalog ₹{p.customerRatePerKg}</span>
                  <div className="relative w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                    <input
                      type="number" min="0" aria-label={`${p.name} price for this customer`}
                      value={priceInputs[p.key] ?? ""}
                      onChange={(e) => setPriceInputs((prev) => ({ ...prev, [p.key]: e.target.value }))}
                      placeholder="default"
                      className="w-full pl-5 pr-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={savePricing} disabled={savingPricing} className="w-full py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold disabled:opacity-60">
              {savingPricing ? "Saving…" : pricingSaved ? "Saved ✓" : "Save Pricing"}
            </button>
          </div>
        )}

        {/* ── Order History tab ── */}
        {tab === "Order History" && (
          <div className="space-y-3">
            {todayOrders.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No orders recorded for this customer today.</p>
            ) : (
              todayOrders.map((o) => (
                <div key={o._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {o.idlyKg}kg idly · {o.dosaKg}kg dosa
                      {(o.extraItems || []).map((it) => ` · ${it.qty} ${it.unit || "kg"} ${it.productName || it.productKey}`).join("")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(o.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{money(o.amountCharged)}</p>
                    <span className={`text-[11px] ${o.status === "skipped" ? "text-gray-400" : o.status === "pending" || o.paymentStatus === "credit" ? "text-amber-600" : "text-green-600"}`}>
                      {o.status === "skipped" ? "Skipped" : o.status === "pending" ? "Pending delivery" : o.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
            <p className="text-center text-[11.5px] text-gray-300 pt-2">
              Showing today's activity only — full multi-day order history isn't available yet without a new backend endpoint.
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom Add to Cart bar ── */}
      {tab === "Products" && products.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-4 z-20">
          <button
            onClick={handleAddToCart}
            disabled={totalKg <= 0}
            className={`w-full py-3.5 rounded-2xl text-white text-[14.5px] font-semibold disabled:opacity-40 ${added ? "bg-green-600" : "bg-green-700"}`}
          >
            {added ? "Added to Cart ✓" : `Add to Cart (${totalKg} ${totalUnitLabel}) · ${money(totalPrice)}`}
          </button>
        </div>
      )}

      {/* Floating cart button, same as the Customers list page */}
      {totalItems > 0 && (
        <button
          onClick={() => navigate("/checkout")}
          className="fixed bottom-32 right-4 max-w-md mx-auto bg-blue-600 text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-2 z-30 text-[13px] font-semibold"
        >
          🛒 View Cart ({totalItems})
        </button>
      )}

      <BottomNav />
    </div>
  );
}