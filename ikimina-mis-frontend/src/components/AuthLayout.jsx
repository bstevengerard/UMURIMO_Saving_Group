import { ReactNode } from "react";
import { Shield, Sparkles, ChevronLeft } from "lucide-react";

export default function AuthLayout({ children, title, subtitle, footerLabel, footerHref, footerLinkLabel, showBack = false, onBack }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-slate-900 text-white flex-col justify-between p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&q=80&w=1600')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-brand-950/60" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center font-extrabold text-white text-xl shadow-lg">⚱</div>
            <span className="text-2xl font-extrabold tracking-tight uppercase">UMURIMO Saving Group</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              The easy way to<br />
              <span className="text-brand-400">save &amp; rotate money</span><br />
              with your community.
            </h2>
            <p className="text-slate-300 text-base leading-relaxed max-w-lg">
              Ditch handwritten notebooks. UMURIMO Saving Group is a simple, beautiful tool built for families, work friends, and local cooperatives.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-brand-400" />
              </div>
              <span className="text-sm text-slate-200 font-medium">Protected member data</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand-400" />
              </div>
              <span className="text-sm text-slate-200 font-medium">Secure access codes</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">UMURIMO Portal &bull; {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Top bar for mobile */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-brand-700 flex items-center justify-center font-extrabold text-white text-base">⚱</div>
          <span className="text-sm font-extrabold text-slate-950 tracking-tight uppercase">UMURIMO Saving Group</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 lg:py-10">
          <div className="w-full max-w-md space-y-6">
            {/* Back button */}
            {showBack && onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 text-brand-700 mx-auto mb-1">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>

            {/* Form Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                {children}
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-500">
              {footerLabel}{" "}
              <a href={footerHref} className="text-brand-700 font-bold hover:underline">
                {footerLinkLabel}
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 text-center border-t border-slate-200 bg-white">
          <p className="text-[10px] text-slate-400 font-medium">UMURIMO Portal &bull; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
