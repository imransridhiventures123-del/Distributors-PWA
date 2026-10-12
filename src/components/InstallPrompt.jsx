// FILE: src/components/InstallPrompt.jsx
// NEW FILE — "Install app / Add to Home screen" banner.
// Android/Chrome: shows an Install button that opens the native install dialog.
// iPhone/Safari: shows the "Share → Add to Home Screen" steps.
// Hidden once the app is installed (or opened from the home screen) and for
// 7 days after the user taps "Not now".
import { useEffect, useState } from "react";

const KEY = "sridhi_install_dismissed_at";
const WEEK = 7 * 24 * 60 * 60 * 1000;

const isStandalone = () =>
  (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches) || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
const recentlyDismissed = () => {
  try { const t = Number(localStorage.getItem(KEY)); return t && Date.now() - t < WEEK; } catch { return false; }
};

export default function InstallPrompt() {
  const [evt, setEvt] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); setShow(true); };
    const onInstalled = () => { setShow(false); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIos()) { setIos(true); setShow(true); }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
  };

  const install = async () => {
    if (!evt) return;
    evt.prompt();
    try { await evt.userChoice; } catch { /* ignore */ }
    setEvt(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 pointer-events-none" role="dialog" aria-label="Install app">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-center gap-3 pointer-events-auto">
        <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl border border-gray-100 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install Sridhi app</p>
          {evt ? (
            <p className="text-xs text-gray-500">Add it to your home screen for quick access.</p>
          ) : (
            <p className="text-xs text-gray-500">Tap <b>Share</b> (the square with ↑), then <b>Add to Home Screen</b>.</p>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          {evt && <button onClick={install} className="px-3 py-1.5 rounded-lg bg-[#1a2a54] text-white text-xs font-semibold">Install</button>}
          <button onClick={dismiss} className="px-3 py-1 text-[11px] text-gray-400">{ios && !evt ? "Got it" : "Not now"}</button>
        </div>
      </div>
    </div>
  );
}