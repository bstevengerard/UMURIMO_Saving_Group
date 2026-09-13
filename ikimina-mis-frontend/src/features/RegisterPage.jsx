import { useApp } from "../context/AppContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

export default function RegisterPage() {
  const { registerMember, addNotification } = useApp();
  const navigate = useNavigate();
  const [regForm, setRegForm] = useState({
    fullName: "",
    email: "",
    confirmPassword: "",
    phone: "",
    nationalId: "",
    password: ""
  });
  const [regError, setRegError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegError("");
    setIsLoading(true);
    if (!regForm.nationalId || regForm.nationalId.replace(/\D/g, "").length !== 16) {
      setRegError("National ID must be exactly 16 numeric digits");
      setIsLoading(false);
      return;
    }
    if (!regForm.password || regForm.password.length < 6) {
      setRegError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }
    if (regForm.confirmPassword && regForm.confirmPassword !== regForm.password) {
      setRegError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    try {
      const response = await registerMember(regForm);
      addNotification(
        response?.welcomeEmailSent
          ? "Registration submitted. Welcome email sent. Awaiting admin approval."
          : "Registration submitted. Awaiting admin approval.",
        "success"
      );
      setRegForm({ fullName: "", email: "", confirmPassword: "", phone: "", nationalId: "", password: "" });
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      const msg = err.message || "Registration failed";
      setRegError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register as a new member"
      footerLabel="Already have an account?"
      footerHref="/login"
      footerLinkLabel="Sign in"
      showBack
      onBack={() => navigate(-1)}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {regError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3">
            {regError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Full Name</label>
            <input
              required
              autoFocus
              type="text"
              value={regForm.fullName}
              onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
              placeholder="Enter full name"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:outline-none placeholder-slate-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Email</label>
            <input
              required
              type="email"
              value={regForm.email}
              onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
              placeholder="Enter email"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Password</label>
            <input
              required
              type="password"
              value={regForm.password}
              onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
              placeholder="Create a password"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:outline-none placeholder-slate-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Confirm Password</label>
            <input
              required
              type="password"
              value={regForm.confirmPassword || ""}
              onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
              placeholder="Confirm password"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Phone</label>
            <input
              required
              type="text"
              value={regForm.phone}
              onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
              placeholder="Enter phone number"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder-slate-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">National ID (16 digits)</label>
            <input
              required
              maxLength={16}
              minLength={16}
              type="text"
              value={regForm.nationalId}
              onChange={(e) => setRegForm({ ...regForm, nationalId: e.target.value.replace(/\D/g, "").slice(0, 16) })}
              placeholder="Enter 16-digit National ID"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading}
             className="flex-1 py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-[0.98] transition shadow-sm disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
