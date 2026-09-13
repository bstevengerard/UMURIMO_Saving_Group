import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  BadgeCent,
  Calendar,
  Megaphone,
  MessageSquare,
  TrendingUp,
  FileBarChart2,
  Sliders,
  Shield,
  LogOut,
  Sparkles,
  UserCheck,
  X,
  ShieldAlert
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "General",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "members", label: "Members", icon: Users, permission: "view_members" },
    ],
  },
  {
    label: "Money",
    items: [
      { id: "shares", label: "Shares", icon: TrendingUp },
      { id: "loans", label: "Loans", icon: FileText },
      { id: "repayments", label: "Repayments", icon: BadgeCent },
      { id: "emergency-aid", label: "Emergency Aid", icon: ShieldAlert, permission: "manage_contributions" },
    ],
  },
  {
    label: "Group",
    items: [
      { id: "meetings", label: "Meetings", icon: Calendar },
      { id: "announcements", label: "Announcements", icon: Megaphone },
      { id: "sms", label: "SMS", icon: MessageSquare, permission: "view_sms" },
    ],
  },
  {
    label: "Reports & Settings",
    items: [
      { id: "reports", label: "Reports", icon: FileBarChart2 },
      { id: "admin-reports", label: "Admin Reports", icon: FileBarChart2, adminOnly: true },
      { id: "audit-logs", label: "Audit Logs", icon: FileText, adminOnly: true },
      { id: "loan-config", label: "Loan Settings", icon: Sliders, adminOnly: true },
      { id: "roles", label: "Roles", icon: Shield, adminOnly: true },
    ],
  },
];

export default function Sidebar({ activeTab, onTabChange }) {
  const { user, logout, hasPermission, mobileMenuOpen, setMobileMenuOpen } = useApp();
  const navigate = useNavigate();

  if (!user) return null;

  const isActive = (id) => activeTab === id;

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const active = isActive(item.id);
    return (
      <button
        key={item.id}
        onClick={() => {
          onTabChange(item.id);
          setMobileMenuOpen(false);
        }}
        className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
          active
            ? "bg-brand-700 text-white shadow-md"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/40 rounded-r-full" />
        )}
        <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close mobile menu"
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 md:hidden transition-all duration-300 w-full h-full cursor-default"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 md:sticky md:translate-x-0 w-60 bg-white flex flex-col shrink-0 border-r border-slate-200 no-print transition-transform duration-300 h-screen ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Branding Header */}
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-brand-700 flex items-center justify-center font-bold text-white text-sm shadow-sm select-none">
              🪙
            </div>
            <div>
              <h1 className="font-bold text-[14px] text-slate-900 leading-none">UMURIMO</h1>
              <span className="text-[10px] text-slate-500 mt-1 block">Saving Group</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if (item.adminOnly && user.role !== "admin") return false;
              if (item.permission && !hasPermission(item.permission)) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label} className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(renderNavItem)}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer / Log out */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={() => {
              logout();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
