import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import AuthLayout from "../components/AuthLayout";
import { Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { apiFetch, addNotification } = useApp();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    const verify = async () => {
      try {
        const res = await apiFetch(`/api/auth/verify-email/${encodeURIComponent(token)}`, {
          method: "GET",
        });
        setStatus("success");
        setMessage(res?.message || "Email verified successfully.");
        addNotification("Email verified successfully. You can now log in.", "success");
      } catch (err) {
        setStatus("error");
        setMessage(err.message || "Verification failed. The link may be invalid or expired.");
        addNotification(err.message || "Verification failed.", "error");
      }
    };

    verify();
  }, [token, apiFetch, addNotification]);

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={status === "loading" ? "Confirming your email address..." : ""}
      footerLabel=""
      footerHref="/login"
      footerLinkLabel="Go to login"
    >
      <div className="space-y-4 text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-brand-600" />
            <p className="text-sm text-slate-800 font-semibold">{message}</p>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition"
            >
              Continue to login
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="w-8 h-8 text-rose-600" />
            <p className="text-sm text-slate-800 font-semibold">{message}</p>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
