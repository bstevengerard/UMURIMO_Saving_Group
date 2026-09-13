import { useApp } from "../context/AppContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "../components/AuthLayout";

const LOADING_MESSAGES = [
  "Signing in...",
  "Verifying credentials...",
  "Loading your workspace...",
];

function AnimatedLoadingText({ messages }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [messages]);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex" aria-hidden="true">
        {messages[msgIndex].split("").map((char, i) => (
          <span
            key={i}
            className="inline-block"
            style={{
              animation: "letterWave 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.05}s`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 bg-white/80 rounded-full loading-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </span>
    </span>
  );
}

export default function LoginPage() {
  const { login, addNotification } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign In"
      subtitle="Sign in to your UMURIMO account"
      footerLabel="Need an account?"
      footerHref="/register"
      footerLinkLabel="Register"
    >
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-800 text-xs rounded-xl p-3" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="login-email"
              required
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-3.5 py-2.5 rounded-lg focus:ring-2 focus:ring-brand-500/30 focus:outline-none placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="login-password"
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-3.5 py-2.5 rounded-lg focus:ring-2 focus:ring-brand-500/30 focus:outline-none placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          aria-label={isLoading ? "Signing in, please wait" : "Login"}
          className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-[0.98] transition-all shadow-sm disabled:opacity-90 disabled:cursor-wait disabled:hover:bg-brand-700 flex items-center justify-center gap-2 min-h-[48px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <AnimatedLoadingText messages={LOADING_MESSAGES} />
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-[11px] font-bold text-brand-700 hover:text-brand-800 transition"
          >
            Forgot password?
          </Link>
        </div>
      </form>

      {isLoading && (
        <div aria-live="polite" className="sr-only">
          Signing you in, please wait.
        </div>
      )}
    </AuthLayout>
  );
}
