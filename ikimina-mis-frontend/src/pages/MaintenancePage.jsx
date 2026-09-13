import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

function MaintenancePage() {
  const { setFrontendMaintenanceMode } = useApp();
  const [status, setStatus] = useState("checking");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let timer = null;
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/maintenance/status", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await res.json();
        if (!data.maintenanceMode && !cancelled) {
          setFrontendMaintenanceMode(false);
        }
      } catch {
        if (!cancelled) {
          setStatus("offline");
          setRetryCount((c) => c + 1);
        }
      }
    };

    checkStatus();
    timer = setInterval(checkStatus, 30000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&q=80&w=1600"
          alt=""
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-brand-900/70 to-slate-900/80" />
      </div>

      <div className="max-w-lg w-full relative z-10">
        <div className="bg-white/95 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden">
          <div className="px-8 py-8 sm:px-10 sm:py-10 text-center space-y-6">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-8 h-8"
                >
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-700">
                  UMURIMO
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  System Under Maintenance
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  We’re performing scheduled maintenance to improve your cooperative management experience. Please check back shortly.
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500" />
                  </span>
                {status === "checking"
                  ? "Checking system status..."
                  : status === "offline"
                  ? "Unable to reach server. Retrying automatically..."
                  : "Standing by..."}
              </div>

              <div className="space-y-1">
                {retryCount > 0 && (
                  <p className="text-[10px] text-slate-400">
                    Retry attempts: {retryCount}
                  </p>
                )}
                <p className="text-[10px] text-slate-400">
                  Auto-refreshes every 30 seconds
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/80 border-t border-slate-200 px-8 py-4 sm:px-10">
            <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              UMURIMO Digital Savings & Rotation Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaintenancePage;
