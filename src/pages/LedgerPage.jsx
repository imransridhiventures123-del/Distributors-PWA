// FILE: src/pages/LedgerPage.jsx
// UPDATED — Feature: Ledger built from real, customer-priced orders.
// For every customer: what they ordered (at THEIR price), what was paid in
// Cash and by GPay, what went on Credit, what they later paid back
// ("Receive Payment"), and what they still owe. All numbers come from
// GET /api/deliveries/mine/ledger.
import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getMyLedger, getMyDeliverySummary, receivePayment } from "../api/distributorApi";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) => `₹${round2(n).toLocaleString("en-IN")}`;

/* ══════════════ Receive Payment (customer pays old credit) ══════════════ */
function ReceiveModal({ row, onClose, onDone }) {
  const [amount, setAmount] = useState(String(row.outstanding));
  const [mode, setMode] = useState("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && value <= row.outstanding + 0.01;

  const submit = async () => {
    setBusy(true); setError("");
    try {
      await receivePayment({ customerId: row.customerId, amount: value, mode, note });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the payment. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5">
        <p className="font-bold text-gray-800">Receive Payment</p>
        <p className="text-xs text-gray-400 mb-4">{row.shopName} · owes {money(row.outstanding)}</p>
        {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mb-3" role="alert">{error}</div>}

        <label className="text-xs font-medium text-gray-500">Amount received (₹)</label>
        <input
          type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount received"
          className="mt-1 mb-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-semibold"
        />
        {!valid && amount !== "" && <p className="text-[11px] text-red-500 mb-2">Enter an amount between ₹1 and {money(row.outstanding)}.</p>}

        <div className="grid grid-cols-2 gap-2 my-3">
          {[["cash", "Cash"], ["online", "GPay / UPI"]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setMode(k)}
              className={`py-2.5 rounded-xl text-sm font-medium ${mode === k ? "bg-green-700 text-white" : "border border-gray-200 text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>
        <input
          value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
          className="w-full mb-4 px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
        />
        <div className="flex gap-3">
          <button onClick={onClose} disabled={busy} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium">Cancel</button>
          <button onClick={submit} disabled={!valid || busy} className="flex-1 py-3 rounded-xl bg-green-700 text-white text-sm font-semibold disabled:opacity-40">
            {busy ? "Saving…" : "Save Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LedgerPage() {
  const [ledger, setLedger] = useState({ customerLedger: [], totals: {}, recentTransactions: [] });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(null);

  const load = () => {
    Promise.all([getMyLedger(), getMyDeliverySummary()])
      .then(([l, s]) => { setLedger(l); setSummary(s); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const owing = ledger.customerLedger.filter((c) => c.outstanding > 0);
  const totalOutstanding = ledger.totals?.outstanding || 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto">
      <div className="bg-gradient-to-b from-green-800 to-green-700 px-4 pt-6 pb-9 rounded-b-3xl">
        <span className="text-white text-lg font-semibold">Ledger &amp; Collections</span>
      </div>

      <div className="-mt-5 px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between p-4 mb-3">
          <div>
            <p className="text-[13px] text-gray-500">Total Outstanding</p>
            <p className="text-xl font-bold text-gray-800" data-testid="total-outstanding">{money(totalOutstanding)}</p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-500 text-[12px] font-medium whitespace-nowrap">{owing.length} Pending</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <p className="text-[11px] text-gray-400">Ordered</p><p className="text-sm font-bold text-gray-800">{money(ledger.totals?.totalOrdered)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <p className="text-[11px] text-gray-400">Collected</p>
            <p className="text-sm font-bold text-green-600">{money((ledger.totals?.cashPaid || 0) + (ledger.totals?.onlinePaid || 0) + (ledger.totals?.received || 0))}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <p className="text-[11px] text-gray-400">Margin</p><p className="text-sm font-bold text-green-700">{money(summary?.totalMargin)}</p>
          </div>
        </div>

        <p className="font-bold text-gray-800 mb-3 px-1">Customer Ledger</p>
        <div className="space-y-2.5 mb-6">
          {loading && <p className="text-center text-gray-400 py-6 text-sm">Loading…</p>}
          {!loading && ledger.customerLedger.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm bg-white rounded-2xl border border-gray-100">No completed orders yet — the ledger fills up as you close orders.</p>
          )}
          {ledger.customerLedger.map((c) => (
            <div key={c.customerId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid="ledger-row">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-[14px] truncate">{c.shopName}</p>
                  <p className="text-[11px] text-gray-400">{c.orders} order{c.orders === 1 ? "" : "s"} · {money(c.totalOrdered)} ordered</p>
                </div>
                {c.outstanding > 0
                  ? <p className="font-bold text-red-500 text-[14px] flex-shrink-0">{money(c.outstanding)}</p>
                  : <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 text-[11px] font-medium flex-shrink-0">Settled</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[11px]">Cash {money(c.cashPaid)}</span>
                <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px]">GPay {money(c.onlinePaid)}</span>
                <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px]">Credit {money(c.creditGiven)}</span>
                {c.received > 0 && <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[11px]">Paid back {money(c.received)}</span>}
              </div>
              {c.outstanding > 0 && (
                <button onClick={() => setReceiving(c)} className="w-full mt-3 py-2 rounded-xl border border-green-700 text-green-700 text-[13px] font-semibold">
                  Receive Payment
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="font-bold text-gray-800 mb-3 px-1">Recent Transactions</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 mb-6">
          {!loading && ledger.recentTransactions.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">No transactions yet.</p>}
          {ledger.recentTransactions.map((t, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800">{t.title}</p>
                <p className="text-[12px] text-gray-400 truncate">{t.customer}</p>
                <p className="text-[11px] text-gray-300">
                  {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} • {new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {t.type === "order" && ` • Cash ${money(t.cash)} · GPay ${money(t.online)} · Credit ${money(t.credit)}`}
                  {t.type === "receipt" && ` • ${t.mode === "online" ? "GPay" : "Cash"}`}
                </p>
              </div>
              <p className={`text-[13px] font-semibold flex-shrink-0 ml-3 ${t.type === "receipt" ? "text-green-600" : "text-gray-800"}`}>
                {t.type === "receipt" ? "+ " : ""}{money(t.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />

      {receiving && (
        <ReceiveModal
          row={receiving}
          onClose={() => setReceiving(null)}
          onDone={() => { setReceiving(null); load(); }}
        />
      )}
    </div>
  );
}