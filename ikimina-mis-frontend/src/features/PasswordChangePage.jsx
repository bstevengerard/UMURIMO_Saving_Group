import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";

export default function PasswordChangePage() {
  const { apiFetch, addNotification } = useApp();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "", color: "" };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 2) return { score, label: "Weak", color: "text-rose-700 bg-rose-50 border-rose-200" };
    if (score <= 3) return { score, label: "Fair", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (score <= 4) return { score, label: "Good", color: "text-brand-700 bg-brand-50 border-brand-200" };
    return { score, label: "Strong", color: "text-brand-700 bg-brand-50 border-brand-200" };
  }, [newPassword]);

  const validatePasswords = () => {
    const errors = [];
    if (newPassword.length < 8) {
      errors.push("New password must be at least 8 characters long");
    }
    if (newPassword !== confirmPassword) {
      errors.push("New passwords do not match");
    }
    if (newPassword === currentPassword) {
      errors.push("New password must be different from current password");
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validatePasswords()) {
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmChangePassword = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addNotification("Password changed successfully. Please sign in again.", "success");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Change Password</h2>
          <p className="text-xs text-slate-500 font-medium">Update your account password</p>
        </div>

        {success && (
          <div className="bg-brand-50 border border-brand-200 text-brand-800 rounded-xl p-4 text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Password changed successfully. Redirecting to login...
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 pr-10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: passwordStrength.score <= 2 ? "#f43f5e" : passwordStrength.score <= 3 ? "#f59e0b" : passwordStrength.score <= 4 ? "#14b8a6" : "#10b981"
                    }}
                  />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${passwordStrength.color}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 font-medium">Use 8+ characters with a mix of letters, numbers, and symbols</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 pr-10"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 space-y-1">
              {validationErrors.map((err, idx) => (
                <p key={idx} className="text-[10px] font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {err}
                </p>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || success}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? "Updating..." : success ? "Password Updated" : "Change Password"}
          </button>
        </form>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirm Password Change"
        message="You are about to change your password. You will be required to sign in again with your new password."
        confirmLabel="Change Password"
        cancelLabel="Cancel"
        type="info"
        loading={loading}
        onConfirm={confirmChangePassword}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}
