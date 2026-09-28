// FILE: src/pages/LoginPage.jsx
// UI-ONLY REDESIGN — matches the NEW reference image exactly (dark navy
// theme, top photo banner with "Sridhi Distributors" logo, floating
// white card, "Your Growth. Our Priority." footer). NOTHING functional
// changed: same `employeeId` + `password` + `showPassword` +
// `rememberMe` + `error` + `loading` state, the same `distributorLogin()`
// API call, the same `login()`/navigate() flow, the same "Forgot
// Password?" button (still non-functional placeholder, as before). Only
// this one file was touched — no other file, no API change.
//
// IMAGE PLACEHOLDER (per your instruction — no image file created):
//   Top banner photo: /assets/distributor-login-banner.jpg
// This path is referenced only — until you add the real file at
// public/assets/distributor-login-banner.jpg in this repo, that area
// just shows the dark navy background underneath (nothing breaks).
// The "Sridhi Distributors" logo mark itself is drawn as inline SVG +
// text (no image needed for it) so it always renders correctly even
// before you add the banner photo.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { distributorLogin } from "../api/distributorApi";
import { useDistributorAuth } from "../context/DistributorAuthContext";

function LeafLogo() {
  return (
    <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 3C7 3 4 6 4 10c0 5 4 9 9 11 5-2 9-6 9-11 0-4-3-7-7-7-2 0-4 1-5 3" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 15c2-4 5-7 9-9" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useDistributorAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await distributorLogin(employeeId.trim(), password);
      login(data.token, data.distributor);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your Employee ID and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1a2a54] to-[#0a1330]">
      {/* ── Top photo banner ── */}
      <div className="relative h-56 mx-4 mt-4 rounded-[28px] overflow-hidden flex-shrink-0">
        {/* PLACEHOLDER photo — not created, path only */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/distributor-login-banner.jfif')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2a54]/70 via-[#16224a]/75 to-[#0a1330]" />

        <div className="relative h-full flex flex-col items-center justify-center px-6">
          <div className="flex items-center gap-3 mb-2">
            <LeafLogo />
            <div className="text-left">
              <p className="text-white text-2xl font-bold leading-none tracking-wide">Sridhi</p>
              <p className="text-blue-200 text-[13px] tracking-[0.15em] uppercase mt-0.5">Distributors</p>
            </div>
          </div>
          <p className="text-blue-200/90 text-[12.5px] italic mt-1">Together for a Growing Business</p>
        </div>
      </div>

      {/* ── Floating white card ── */}
      <div className="flex-1 flex flex-col px-4 -mt-7 relative z-10 pb-2">
        <div className="bg-white rounded-[28px] shadow-xl px-6 pt-7 pb-6 flex-1 flex flex-col">
          <h1 className="text-[21px] font-bold text-gray-900 leading-snug">Distributor Login</h1>
          <p className="text-[13px] text-gray-400 mt-1 mb-6 leading-relaxed">
            Access your account to manage orders, customers and payments.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-[13px] px-4 py-2.5 rounded-xl mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Mobile Number</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Enter your mobile number"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 text-[14px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a2a54] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-gray-200 text-[14px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a2a54] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? (
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-[13px] text-gray-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1a2a54] accent-[#1a2a54] focus:ring-[#1a2a54]"
                />
                Remember Me
              </label>
              <button type="button" className="text-[13px] font-medium text-[#1a2a54]">
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-[#1a2a54] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#1a2a54]/30 disabled:opacity-60 mt-2"
            >
              {loading ? "Logging in…" : (
                <>
                  Login
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Footer tagline ── */}
      <div className="text-center py-4 flex-shrink-0">
        <p className="text-blue-200/80 text-[12px]">
          <span className="italic">Your Growth.</span> <span className="font-medium">Our Priority.</span>
        </p>
      </div>
    </div>
  );
}