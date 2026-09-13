import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AppContextProvider, useApp } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Toast from "./components/Toast";
import GoogleTranslate from "./components/GoogleTranslate";

import DashboardOverview from "./features/DashboardOverview";
import MembersModule from "./features/MembersModule";
import LoansModule from "./features/LoansModule";
import RepaymentsModule from "./features/RepaymentsModule";
import MeetingsModule from "./features/MeetingsModule";
import CommsModule from "./features/CommsModule";
import AnnouncementsModule from "./features/AnnouncementsModule";
import ReportsModule from "./features/ReportsModule";
import AdminReports from "./features/AdminReports";
import SettingsModule from "./features/SettingsModule";
import LoginPage from "./features/LoginPage";
import RegisterPage from "./features/RegisterPage";
import ForgotPasswordPage from "./features/ForgotPasswordPage";
import EmergencyAidModule from "./features/EmergencyAidModule";
import SharesModule from "./features/SharesModule";
import AuditLogs from "./features/AuditLogs";

import {
  Shield, Sparkles, Users
} from "lucide-react";

function WaveLoader() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-1.5 h-5 bg-brand-600 rounded-full wave-bar"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function TrustShowcase() {
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-8 shadow-xl text-center space-y-4 max-w-sm mx-auto">
      <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-2">
        <Sparkles className="w-5 h-5 text-brand-600" />
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-relaxed text-center">
        Our digital saving circle keeps ledger entries transparent, automatically verifies payouts, and prevents paper notebooks from getting lost.
      </p>
      <div className="text-[10px] text-brand-700 font-extrabold uppercase tracking-widest pt-2">
        Community Savings Digitized
      </div>
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans select-none selection:bg-brand-100 selection:text-brand-900 bg-cover bg-center bg-no-repeat relative animate-fade-in"
      style={{
        backgroundImage: "linear-gradient(rgba(244, 248, 245, 0.94), rgba(255, 255, 255, 0.98)), url('https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&q=80&w=1600')"
      }}>
      <header className="bg-white/95 border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-4 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-600 flex items-center justify-center font-extrabold text-white text-base sm:text-lg shrink-0">⚱</div>
            <div>
              <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-extrabold text-slate-950 tracking-tight uppercase">
                  <span className="hidden sm:inline">UMURIMO Saving Group</span>
                  <span className="inline sm:hidden">UMURIMO</span>
                </span>
                <span className="text-[8px] sm:text-[9px] bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.5 rounded-full border border-slate-200 hidden sm:inline-block">UMURIMO</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Secured Community Savings &amp; Rotations</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
              <span>UMURIMO System Online</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <GoogleTranslate />
            <button onClick={() => navigate("/login")} className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1.5 sm:px-3 sm:py-2 transition hover:scale-103 active:scale-97 cursor-pointer">Sign In</button>
            <button onClick={() => navigate("/register")} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-lg active:scale-95 transition shadow-xs cursor-pointer hidden sm:inline-block">Join Now</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 sm:py-16 space-y-20 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-800 border border-brand-100 rounded-full text-[10px] font-black uppercase tracking-wider">🤝 Simple and honest community savings</div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight">The easy way to<br />save &amp; rotate money<br /><span className="text-brand-600">with your community.</span></h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl font-medium">Ditch handwritten notebooks and complex calculations. UMURIMO is a simple, beautiful tool built for families, work friends, and local cooperatives.</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button onClick={() => navigate("/login")} className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl active:scale-95 transition shadow-md text-center uppercase tracking-wider cursor-pointer">Enter Portal</button>
              <button onClick={() => navigate("/register")} className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-200 text-center uppercase tracking-wider shadow-2xs cursor-pointer">Register New Account</button>
            </div>
            <div className="flex items-center gap-2 pt-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <Shield className="w-4 h-4 text-brand-600 shrink-0" /><span>Protected member data &bull; Secure access codes</span>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-full h-full bg-gradient-to-tr from-brand-950/40 to-teal-950/20 rounded-2xl -z-10 blur-xl opacity-70"></div>
              <TrustShowcase />
            </div>
          </div>
        </div>

        <section id="benefits" className="space-y-8 pt-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs text-brand-600 font-extrabold uppercase tracking-widest font-mono">How UMURIMO Works</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Simple features built for saving groups.</h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">Whether you meet weekly with family or manage a larger agricultural cooperative in your local sector.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group">
              <div className="h-44 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent z-10"></div>
                <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=600" alt="Rwanden Cooperative Work" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" referrerPolicy="no-referrer" />
                <div className="absolute bottom-3 left-4 z-20"><span className="px-2.5 py-1 bg-brand-600 text-white text-[10px] font-bold rounded">Group Handouts</span></div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Rotational Payout Tracker</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">Schedules updated in real time, calculating exactly whose turn is next.</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group">
              <div className="h-44 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent z-10"></div>
                <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600" alt="Digital Phone Ledger Logs" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" referrerPolicy="no-referrer" />
                <div className="absolute bottom-3 left-4 z-20"><span className="px-2.5 py-1 bg-brand-600 text-white text-[10px] font-bold rounded">Safe Updates</span></div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Instant SMS Confirmations</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">Members receive clear text updates to verify balances.</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group">
              <div className="h-44 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent z-10"></div>
                <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600" alt="Legal and cooperative standards compliance" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" referrerPolicy="no-referrer" />
                <div className="absolute bottom-3 left-4 z-20"><span className="px-2.5 py-1 bg-brand-600 text-white text-[10px] font-bold rounded">Trustworthy Ledgers</span></div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Printable Group Records</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">Generate clean savings histories for audits and assemblies.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 text-slate-800 border border-slate-200 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50/50 rounded-full filter blur-3xl -z-10"></div>
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-1 text-amber-500 text-sm"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
            <h3 className="text-xl sm:text-2xl font-bold font-sans leading-relaxed text-slate-950">"We moved our cooperative's cycles onto UMURIMO and resolved our ledger disputes instantly."</h3>
            <div className="pt-2"><p className="text-xs font-bold text-brand-700 tracking-tight">Chantal U.</p><p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Group Representative, Gasabo Sector Cooperative</p></div>
          </div>
        </section>
      </main>

      <footer className="bg-white/80 backdrop-blur-xs border-t border-slate-105 px-6 py-5 text-center text-[10px] text-slate-400 font-medium shrink-0">UMURIMO Portal &bull; {new Date().getFullYear()}</footer>
    </div>
  );
}

function AuthenticatedLayout() {
  const { setActiveTab, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname.replace("/", "") || "dashboard";
  const validTabs = ["dashboard", "members", "shares", "loans", "repayments", "emergency-aid", "meetings", "announcements", "sms", "reports", "admin-reports", "audit-logs", "loan-config", "roles"];
  const activeTab = validTabs.includes(path) ? path : "dashboard";

  React.useEffect(() => {
    setActiveTab(activeTab);
  }, [activeTab]);

  const switchTab = (tabId) => {
    navigate(`/${tabId}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard": return <DashboardOverview />;
      case "members": return <MembersModule />;
      case "shares": return <SharesModule />;
      case "loans": return <LoansModule />;
      case "repayments": return <RepaymentsModule />;
      case "emergency-aid": return <EmergencyAidModule />;
      case "meetings": return <MeetingsModule />;
      case "sms": return <CommsModule />;
      case "announcements": return <AnnouncementsModule />;
      case "reports": return <ReportsModule />;
      case "admin-reports": return <AdminReports />;
      case "audit-logs": return <AuditLogs />;
      case "loan-config":
      case "roles": return <SettingsModule />;
      default: return <DashboardOverview />;
    }
  };

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden bg-slate-100/60 flex">
      <Sidebar activeTab={activeTab} onTabChange={switchTab} />
      <div className="flex-1 flex flex-col h-screen max-h-screen min-w-0 overflow-hidden bg-slate-50">
        <Header />
        {renderTabContent()}
      </div>
    </div>
  );
}

function MainAppContent() {
  const { user, isLoading } = useApp();

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-10 max-w-sm w-full text-center flex flex-col items-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg">
            <Shield className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">UMURIMO Saving Group</h3>
            <p className="text-xs text-slate-500 font-medium">Authenticating your session securely…</p>
          </div>

          <WaveLoader />

          <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
            Secure &bull; Cooperative &bull; Trusted
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast />
      {user ? (
        <Routes>
          <Route path="/*" element={<AuthenticatedLayout />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppContextProvider>
      <MainAppContent />
    </AppContextProvider>
  );
}
