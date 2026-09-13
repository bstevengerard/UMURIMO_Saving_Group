import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

const TOAST_CONFIG = {
  success: {
    Icon: CheckCircle,
    bg: "bg-brand-50",
    border: "border-brand-200",
    text: "text-brand-800",
    icon: "text-brand-500",
    progress: "bg-brand-400",
  },
  error: {
    Icon: AlertCircle,
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-800",
    icon: "text-rose-500",
    progress: "bg-rose-400",
  },
  warning: {
    Icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "text-amber-500",
    progress: "bg-amber-400",
  },
  info: {
    Icon: Info,
    bg: "bg-brand-50",
    border: "border-brand-200",
    text: "text-brand-800",
    icon: "text-brand-500",
    progress: "bg-brand-400",
  },
};

export default function Toast() {
  const { notifications, removeNotification } = useApp();
  const [exitingIds, setExitingIds] = useState(new Set());

  useEffect(() => {
    const timers = new Map();
    notifications.forEach((n) => {
      timers.set(
        n.id,
        setTimeout(() => {
          setExitingIds((prev) => new Set([...prev, n.id]));
        }, 3000)
      );
    });
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [notifications]);

  const handleRemove = (id) => {
    removeNotification(id);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2 w-[calc(100%-2rem)] md:max-w-sm no-print">
      {notifications.map((n) => {
        const cfg = TOAST_CONFIG[n.type] || TOAST_CONFIG.success;
        const Icon = cfg.Icon;
        const isExiting = exitingIds.has(n.id);

        return (
          <div
            key={n.id}
            className={`group relative flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 ${cfg.bg} ${cfg.border} ${cfg.text} ${
              isExiting ? "animate-slide-out opacity-0" : "animate-fade-in opacity-100"
            }`}
          >
            <div className={`mt-0.5 shrink-0 ${cfg.icon}`}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 text-sm font-medium leading-relaxed break-words">
              {n.message}
            </div>

            <div className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden rounded-b-xl">
              <div
                className={`h-full ${cfg.progress} transition-all duration-[4000ms] linear`}
                style={{ width: isExiting ? "0%" : "100%" }}
              />
            </div>

            <button
              onClick={() => handleRemove(n.id)}
              className="ml-2 mt-0.5 shrink-0 text-slate-400 hover:text-slate-600 transition-colors rounded p-1 hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
