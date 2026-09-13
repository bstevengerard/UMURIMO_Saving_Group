import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Lock, CheckCircle, ShieldCheck } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { useApp } from "../context/AppContext";

export default function ForgotPasswordPage() {
  const { apiFetch, addNotification } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState("request"); // request | otp | reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!resendCooldown) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
      setStep("otp");
      setResendCooldown(60);
      addNotification("If an account with that email exists, a verification code has been sent", "success");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResendCooldown(60);
      addNotification("A new verification code has been sent", "success");
    } catch (err) {
      setError(err.message || "Could not resend code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (otp.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      setStep("reset");
      addNotification("Code verified. Choose a new password.", "success");
    } catch (err) {
      setError(err.message || "Invalid or expired code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword }),
      });
      setSubmitting(false);
      setSuccess(true);
      addNotification("Password reset successful", "success");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Verify your email with a one-time code, then choose a new password"
      footerLabel="Remember your password?"
      footerHref="/login"
      footerLinkLabel="Sign in"
      showBack
      onBack={() => navigate("/login")}
    >
      {success ? (
        <div className="space-y-4 text-center">
          <div className="p-4 bg-success-50 border border-success-200 text-success-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            Password reset successful. Redirecting to sign in…
          </div>
        </div>
      ) : step === "otp" ? (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="p-4 bg-brand-50 border border-brand-200 text-brand-900 text-xs rounded-xl flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Enter the 6-digit code sent to <strong>{email}</strong>.</span>
          </div>
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-800 text-xs rounded-xl p-3" role="alert">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="reset-otp" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Verification Code</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reset-otp"
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="e.g. 123456"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-3.5 py-2.5 rounded-lg focus:ring-2 focus:ring-brand-500/30 focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>
           <button
             type="submit"
             disabled={submitting}
             className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-[0.98] transition shadow-sm disabled:opacity-60 cursor-pointer"
           >
             {submitting ? "Verifying..." : "Verify Code"}
           </button>
           <button
             type="button"
             onClick={handleResendOtp}
             disabled={submitting || resendCooldown > 0}
             className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
           >
             {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
           </button>
        </form>
      ) : step === "reset" ? (
        <form onSubmit={handleResetPassword} className="space-y-5">
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-800 text-xs rounded-xl p-3" role="alert">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="reset-email" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Registered Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reset-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-3.5 py-2.5 rounded-lg focus:ring-2 focus:ring-brand-500/30 focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="reset-newPassword" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reset-newPassword"
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-3.5 py-2.5 rounded-lg focus:ring-2 focus:ring-brand-500/30 focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="reset-confirmPassword" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reset-confirmPassword"
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-3.5 py-2.5 rounded-lg focus:ring-2 focus:ring-brand-500/30 focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>
           <button
             type="submit"
             disabled={submitting}
             className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-[0.98] transition shadow-sm disabled:opacity-60 cursor-pointer"
           >
             {submitting ? "Resetting..." : "Reset Password"}
           </button>
        </form>
      ) : sent ? (
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-600 leading-relaxed">
            If an account with that email exists, a verification code has been sent.
            Please check your inbox and enter it below.
          </p>
          <button
            type="button"
            onClick={() => { setStep("request"); setSent(false); setError(""); }}
            className="text-[11px] font-bold text-brand-700 hover:text-brand-800 transition cursor-pointer"
          >
            Try another email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSendOtp} className="space-y-5">
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-800 text-xs rounded-xl p-3" role="alert">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="forgot-email" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Registered email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="forgot-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-3.5 py-2.5 rounded-lg focus:ring-2 focus:ring-brand-500/30 focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-[0.98] transition shadow-sm cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send Verification Code"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
