// FILE: src/pages/MyBillsPage.jsx
// NEW FILE — Feature: Distributor bills. Opened by tapping the single
// "Pending Payment to Company" card on the Home page. Shows what the
// company has billed (one bill per approved request), what has been paid,
// and what is still pending. Read-only — the admin records payments.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { getMyBills } from "../api/distributorApi";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

const STATUS = {
  pending: { label: "Pending", cls: "bg-red-100 text-red-600" },
  partial: { label: "Part paid", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", cls: "bg-green-100 text-green-700" },
};

export default function MyBillsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getMyBills()
      .then(setData)
      .catch((e) => setError(e?.response?.data?.message || "Could not load your bills. Please try again."))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const t = data?.totals || { totalBilled: 0, totalPaid: 0, pending: 0 };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto sm:max-w-lg">
      <div className="bg-gradient-to-b from-[#1a2a54] to-[#0e1c42] px-5 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/")} className="text-white" aria-label="Back">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <p className="text-white text-[20px] font-bold">My Bills</p>
        </div>
        <p className="text-blue-200/80 text-[12px]">Pending payment to company</p>
        <p className="text-white text-[30px] font-bold leading-tight">{loading ? "…" : money(t.pending)}</p>
        <p className="text-blue-200/70 text-[12px] mt-1">Billed {money(t.totalBilled)} · Paid {money(t.totalPaid)}</p>
      </div>

      <div className="px-4 mt-4">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-3">
            {error} <button onClick={load} className="ml-1 underline font-semibold">Retry</button>
          </div>
        )}

        <p className="font-bold text-gray-800 text-[16px] mb-3">Bills</p>
        {!loading && !error && (data?.bills || []).length === 0 && (
          <p className="text-sm text-gray-400 mb-6">No bills yet. A bill appears here when admin approves a request.</p>
        )}
        <div className="space-y-3 mb-6">
          {(data?.bills || []).map((b) => {
            const st = STATUS[b.status] || STATUS.pending;
            return (
              <div key={b._id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-800 text-[14px]">{b.billNumber}</p>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-2">{fmtDate(b.billDate)} · {b.sourceType === "batter_request" ? "Batter request" : "Product request"}</p>
                {b.items.map((it) => (
                  <p key={it.productKey} className="text-[13px] text-gray-600 flex justify-between">
                    <span>{it.productName} · {it.qty} {it.unit} × {money(it.rate)}</span><span>{money(it.amount)}</span>
                  </p>
                ))}
                <div className="flex justify-between text-[13px] mt-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-500">Total <b className="text-gray-800">{money(b.totalAmount)}</b></span>
                  <span className="text-gray-500">Due <b className="text-red-500">{money(b.totalAmount - b.paidAmount)}</b></span>
                </div>
              </div>
            );
          })}
        </div>

        {(data?.payments || []).length > 0 && (
          <>
            <p className="font-bold text-gray-800 text-[16px] mb-3">Payments made</p>
            <div className="space-y-2">
              {data.payments.map((p) => (
                <div key={p._id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-green-600">{money(p.amount)}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{fmtDate(p.receivedAt)} · {p.mode}{p.note ? ` · ${p.note}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}