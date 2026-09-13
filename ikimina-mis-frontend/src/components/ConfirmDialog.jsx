import React, { useEffect, useRef } from "react";
import { AlertTriangle, AlertCircle, Info, Loader2 } from "lucide-react";

const TYPE_CONFIG = {
  danger: {
    icon: AlertCircle,
    iconColor: "text-danger-600",
    bg: "bg-danger-50 border-danger-200",
    button: "bg-danger-600 hover:bg-danger-700 text-white border-danger-600",
    ring: "ring-danger-500",
    titleColor: "text-danger-900",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-warning-600",
    bg: "bg-warning-50 border-warning-200",
    button: "bg-warning-600 hover:bg-warning-700 text-white border-warning-600",
    ring: "ring-warning-500",
    titleColor: "text-warning-900",
  },
  info: {
    icon: Info,
    iconColor: "text-info-600",
    bg: "bg-info-50 border-info-200",
    button: "bg-info-600 hover:bg-info-700 text-white border-info-600",
    ring: "ring-info-500",
    titleColor: "text-info-900",
  },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
  loading = false,
}) {
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.warning;
  const Icon = config.icon;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    confirmButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    confirmButtonRef.current?.focus();
    return () => previousFocus?.focus?.();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={`relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 animate-fade-in`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-full bg-slate-50 border border-slate-200 shrink-0`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className={`text-sm font-bold ${config.titleColor}`}>
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 disabled:opacity-70 cursor-pointer ${config.button}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
