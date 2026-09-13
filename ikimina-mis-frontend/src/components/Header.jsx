import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import GoogleTranslate from "./GoogleTranslate";
import {
  LogOut,
  Bell,
  User,
  Menu,
  CheckCheck,
  Trash2,
  Eye,
  EyeOff,
  KeyRound
} from "lucide-react";

export default function Header() {
  const {
    activeTab,
    user,
    logout,
    systemNotifications,
    toggleReadStatus,
    markAllAsRead,
    clearAllSystemNotifications,
    mobileMenuOpen,
    setMobileMenuOpen
  } = useApp();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = systemNotifications.filter(n => !n.read).length;

  const getPageTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Dashboard Overview";
      case "members":
        return "Member Directory";
      case "contributions":
        return "Weekly Savings & Contributions";
      case "loans":
        return "Group Loans Tracker";
      case "repayments":
        return "Repayments Record";
      case "meetings":
        return "Meetings";
      case "announcements":
        return "Notice Board & Announcements";
      case "sms":
        return "SMS Notifications log";
      case "reports":
        return "UMURIMO Financial Reports";
      case "loan-config":
        return "Loan Terms & Group Settings";
      case "roles":
        return "Group Access Permissions";
      default:
        return "UMURIMO Portal";
    }
  };

  if (!user) return null;

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-3 md:px-6 flex items-center justify-between shrink-0 no-print">
      {/* Dynamic page title and path */}
      <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 hover:bg-slate-100 rounded-lg md:hidden transition text-slate-700 cursor-pointer shrink-0"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>

        <span className="text-[10px] bg-slate-100 text-slate-500 font-extrabold font-mono uppercase tracking-wider px-1.5 py-1 rounded hidden sm:inline-block shrink-0">
          UMURIMO
        </span>
        <h2 className="text-[11px] sm:text-[12px] md:text-[13px] font-bold text-slate-900 tracking-tight leading-none truncate max-w-[85px] sm:max-w-none">
          {getPageTitle()}
        </h2>
      </div>

      {/* Operational stats/controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
        {/* Google Language Translator */}
        <GoogleTranslate />

         {/* Dynamic Notification Tray */}
         <div className="relative shrink-0">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-slate-600 hover:text-brand-700 bg-slate-50 hover:bg-brand-50 p-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:border-brand-200 text-xs font-bold flex items-center gap-1.5 relative transition cursor-pointer"
            title="Show alerts journal"
          >
            <Bell className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden md:inline">Alerts</span>
            {unreadCount > 0 && (
              <span className="bg-rose-600 text-white font-bold rounded-full text-[9px] px-1 py-0.5 min-w-[16px] text-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Interactive drop down drawer of Notifications */}
          {showNotifications && (
            <div className="fixed right-3 left-3 sm:left-auto sm:right-0 sm:absolute top-16 sm:top-auto mt-0.5 sm:mt-2.5 w-auto sm:w-80 max-w-none bg-white border border-slate-200 rounded-xl shadow-lg z-50 text-left overflow-hidden animate-fade-in">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-brand-600" />
                  <span className="font-bold text-xs">UMURIMO Alerts</span>
                </div>
                {unreadCount > 0 && (
                  <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded-full font-extrabold text-[8px]">
                    {unreadCount} UNREAD
                  </span>
                )}
              </div>

              {/* Action buttons list */}
              <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50 text-[10px] text-slate-500 font-bold">
                <button
                  type="button"
                  onClick={() => {
                    markAllAsRead();
                  }}
                   className="hover:text-brand-700 flex items-center gap-1 transition"
                >
                   <CheckCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span>Mark all read</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAllSystemNotifications();
                  }}
                  className="hover:text-rose-600 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Clear journal</span>
                </button>
              </div>

              {/* Feed items */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {systemNotifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-[11px] font-medium">
                    No active notifications log
                  </div>
                ) : (
                  systemNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => toggleReadStatus(n.id)}
                      className={`p-3 text-[11px] leading-relaxed transition-all cursor-pointer hover:bg-slate-50 flex gap-2 items-start ${
                         !n.read ? "bg-brand-50/15 font-semibold text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {/* Badge indicator */}
                       <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${!n.read ? "bg-brand-600" : "bg-slate-300"}`} />

                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 break-words">{n.message}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-1">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Click control feedback */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReadStatus(n.id);
                        }}
                         className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-600 transition"
                        title={n.read ? "Mark as unread" : "Mark as read"}
                      >
                        {n.read ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                           <Eye className="w-3.5 h-3.5 text-brand-600" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-1 px-2 border-t bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="w-full py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition text-center"
                >
                  Close Tray Dropdown
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real-time status */}
        <div className="bg-brand-50 text-brand-700 text-[10px] px-2.5 py-1 rounded-full font-bold items-center gap-1.5 border border-brand-100 hidden lg:flex">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500"></span>
          <span>Online</span>
        </div>

        {/* User Menu Dropdown */}
        <div className="relative shrink-0" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-slate-100 pl-2 pr-1 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <div className="text-right hidden md:block">
              <h4 className="font-bold text-slate-800 text-xs leading-none">{user?.fullName ?? ""}</h4>
              <p className="text-[10px] text-slate-400 capitalize font-medium mt-0.5">{user.role}</p>
            </div>
            <div className="w-7 h-7 bg-brand-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs shrink-0 select-none">
              {user?.fullName ? user.fullName.split(" ").map(n => n.charAt(0)).join("").toUpperCase().substring(0, 2) : "US"}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 text-left overflow-hidden animate-fade-in">
              <div className="p-3.5 border-b border-slate-100">
                <p className="font-bold text-xs text-slate-900">{user?.fullName}</p>
                <p className="text-[10px] text-slate-500 capitalize font-medium mt-0.5">{user?.role}</p>
                <p className="text-[10px] text-brand-700 font-mono font-bold mt-1">
                  IKM-{user?.id?.substring(4) || "099"}
                </p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => { navigate("/change-password"); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Change Password
                </button>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </header>
  );
}
