import { useEffect, useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { Wrench, RotateCcw, Activity, ShieldCheck, Globe2, Sparkles } from "lucide-react";

const POLL_INTERVAL = 30000;

function FloatingShapes() {
  const shapes = [
    { className: "bg-brand-200/40", size: "w-16 h-16", top: "10%", left: "15%", delay: 0 },
    { className: "bg-brand-300/30", size: "w-12 h-12", top: "70%", left: "80%", delay: 1 },
    { className: "bg-brand-100/50", size: "w-20 h-20", top: "40%", left: "75%", delay: 2 },
    { className: "bg-brand-200/30", size: "w-14 h-14", top: "80%", left: "20%", delay: 3 },
    { className: "bg-brand-300/40", size: "w-10 h-10", top: "20%", left: "60%", delay: 0.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shapes.map((shape, i) => (
        <motion.div
          key={i}
          className={`absolute ${shape.size} ${shape.className} rounded-full blur-xl`}
          style={{ top: shape.top, left: shape.left }}
          animate={{
            y: [0, -25, 0, 25, 0],
            scale: [1, 1.08, 1, 1.08, 1],
            opacity: [0.25, 0.55, 0.25, 0.55, 0.25],
          }}
          transition={{
            repeat: Infinity,
            duration: 7,
            delay: shape.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function AnimatedOrbit() {
  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6">
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-brand-200"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-3 rounded-full border border-dashed border-brand-300"
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-300"
        >
          <Wrench className="w-6 h-6 sm:w-7 sm:h-7" />
        </motion.div>
      </div>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-brand-500 rounded-full shadow-lg"
          animate={{
            x: [0, 45, 0, -45, 0],
            y: [45, 0, -45, 0, 45],
            opacity: [0.3, 1, 0.3, 1, 0.3],
          }}
          transition={{ repeat: Infinity, duration: 6, delay: i * 0.9, ease: "easeInOut" }}
          style={{ top: "50%", left: "50%", marginTop: -4, marginLeft: -4 }}
        />
      ))}
    </div>
  );
}

function StatusPill({ status }) {
  const config = {
    checking: {
      label: "Checking system status...",
      icon: Activity,
      className: "bg-brand-50 text-brand-700 border-brand-200",
      dot: "bg-brand-500",
      ping: "bg-brand-400",
    },
    offline: {
      label: "Server unreachable — retrying...",
      icon: RotateCcw,
      className: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
      ping: "bg-amber-400",
    },
    standby: {
      label: "Standing by for updates",
      icon: ShieldCheck,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      ping: "bg-emerald-400",
    },
  };

  const cfg = config[status] || config.checking;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-[11px] font-bold tracking-wide ${cfg.className}`}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: cfg.ping }} />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: cfg.dot }} />
      </span>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </motion.div>
  );
}

function ProgressBar({ interval }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const duration = interval;
    let raf;

    const tick = () => {
      const elapsed = Date.now() - start;
      const next = Math.min((elapsed / duration) * 100, 100);
      setProgress(next);
      if (next < 100) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [interval]);

  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
        style={{ width: `${progress}%` }}
        transition={{ ease: "linear", duration: 0.1 }}
      />
    </div>
  );
}

export default function MaintenancePage() {
  const { setFrontendMaintenanceMode } = useApp();
  const [status, setStatus] = useState("checking");
  const [retryCount, setRetryCount] = useState(0);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [secondsLeft, setSecondsLeft] = useState(POLL_INTERVAL / 1000);

  useEffect(() => {
    let timer = null;
    let cancelled = false;
    let countdownTimer = null;

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
        if (!cancelled) {
          setStatus("standby");
          setLastChecked(new Date());
          setSecondsLeft(POLL_INTERVAL / 1000);
        }
      } catch {
        if (!cancelled) {
          setStatus("offline");
          setRetryCount((c) => c + 1);
          setLastChecked(new Date());
          setSecondsLeft(POLL_INTERVAL / 1000);
        }
      }
    };

    checkStatus();
    timer = setInterval(checkStatus, POLL_INTERVAL);

    countdownTimer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) return POLL_INTERVAL / 1000;
        return s - 1;
      });
    }, 1000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [setFrontendMaintenanceMode]);

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(lastChecked),
    [lastChecked]
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100/80 via-slate-50 to-slate-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-300/60 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-brand-200/50 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-brand-100/50 rounded-full blur-[100px] pointer-events-none" />

        <div
          className="absolute inset-0 opacity-[0.6]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='a' width='80' height='80' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%231e3a8a' fill-opacity='0.55'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23a)'/%3E%3C/svg%3E")`,
          }}
        />

        <FloatingShapes />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="relative bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden shadow-xl shadow-brand-900/5">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-brand-300/5 pointer-events-none" />

          <div className="relative px-6 py-8 sm:px-10 sm:py-10 text-center space-y-6">
            <div className="relative space-y-5">
              <AnimatedOrbit />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">
                    UMURIMO SAVING GROUP
                  </p>
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                  System Under Maintenance
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                  We&apos;re performing scheduled upgrades to improve your cooperative management experience. We&apos;ll be back shortly.
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="space-y-4"
            >
              <StatusPill status={status} />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  <span>Next check in {Math.ceil(secondsLeft)}s</span>
                  <span>Auto-refresh</span>
                </div>
                <ProgressBar interval={POLL_INTERVAL} />
              </div>

              <AnimatePresence mode="wait">
                {retryCount > 0 && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[10px] text-amber-600/90 font-medium"
                  >
                    Retry attempts: {retryCount}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-10">
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-semibold uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <Globe2 className="w-3 h-3" />
                UMURIMO SAVING GROUP
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" />
                Secured
              </span>
            </div>
            <p className="text-center text-[10px] text-slate-400 font-mono mt-2">
              Last checked: {formattedTime}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
