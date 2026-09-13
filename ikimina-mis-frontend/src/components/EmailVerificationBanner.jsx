import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { AlertTriangle, Mail, Shield, X } from "lucide-react";

export default function EmailVerificationBanner() {
  const { user, emailVerified, apiFetch, addNotification, setEmailVerified } = useApp();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const isTrulyVerified = emailVerified || !!user?.email_verified;

  if (!user || isTrulyVerified || dismissed) {
    return null;
  }

  const handleVerify = async () => {
    try {
      setSending(true);
      const response = await apiFetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email }),
      });
      if (response?.message && response.message.toLowerCase().includes('already verified')) {
        setEmailVerified(true);
        addNotification("Your email is already verified.", "success");
      } else {
        addNotification("Verification email sent. Please check your inbox.", "success");
      }
    } catch (e) {
      addNotification(e.message || "Unable to send verification email. Please try again later.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs font-medium text-amber-800 truncate">
            <span className="font-bold">Email not verified:</span> Please verify your email address to receive notifications and secure your account.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleVerify}
            disabled={sending}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
          >
            <Mail className="w-3.5 h-3.5" />
            {sending ? "Sending..." : "Send Verification Email"}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 hover:bg-amber-100 rounded-lg transition text-amber-600 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
