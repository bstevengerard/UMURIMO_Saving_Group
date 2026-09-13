import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";
import {
  TrendingUp, Users, PiggyBank, FileSpreadsheet, AlertOctagon,
  ArrowUpRight, Megaphone, CalendarDays, MapPin, Clock, ChevronRight,
  Radio, ShieldCheck, Check, User, Zap, Activity, Share2, Clock4,
  Inbox, BellRing, ArrowRight, Wallet
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";
import { motion } from "motion/react";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonCard } from "../components/Skeleton";

const REFRESH_INTERVAL = 45000;
const STALE_AFTER_MS = 30000;

export default function DashboardOverview() {
  const { apiFetch, user, addNotification } = useApp();
  const [stats, setStats] = useState(null);
  const [loanStats, setLoanStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentShares, setRecentShares] = useState([]);
  const [savingsTrend, setSavingsTrend] = useState([]);
  const [loanPortfolio, setLoanPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const staleTimerRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'audit': return ShieldCheck;
      case 'notification': return Radio;
      case 'contribution': return Wallet;
      case 'loan': return FileSpreadsheet;
      default: return Activity;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'audit': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'notification': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'contribution': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'loan': return 'bg-violet-50 text-violet-700 border-violet-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const loadDashboardData = useCallback(async (options = {}) => {
    const { silent = false, background = false } = options;
    if (!silent) setError(null);
    if (!background) setIsRefreshing(true);

    try {
      if (isAdmin) {
        const data = await apiFetch("/api/dashboard/overview");
        setStats(data.stats);
        setLoanStats(data.loanStats);
        setAnnouncements(Array.isArray(data.announcements) ? data.announcements.slice(0, 5) : []);
        setMeetings(Array.isArray(data.meetings) ? data.meetings.slice(0, 5) : []);
        setRecentActivity(Array.isArray(data.recentActivity) ? data.recentActivity : []);
        setRecentShares(Array.isArray(data.recentShares) ? data.recentShares.slice(0, 5) : []);
        setSavingsTrend(Array.isArray(data.savingsTrend) ? data.savingsTrend : []);
        setLoanPortfolio(Array.isArray(data.loanPortfolio) ? data.loanPortfolio : []);
        setLastUpdated(new Date());
      } else {
        const myData = await apiFetch("/api/members/my-dashboard");
        setStats(myData);
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
      if (!silent && !background) setError(e.message || "Failed to load dashboard data");
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  }, [apiFetch, isAdmin]);

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => {
      loadDashboardData({ silent: true, background: true });
    }, REFRESH_INTERVAL);
    return () => {
      clearInterval(timer);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    if (!lastUpdated) return;
    staleTimerRef.current = setTimeout(() => {
      loadDashboardData({ silent: true, background: true });
    }, STALE_AFTER_MS);
    return () => clearTimeout(staleTimerRef.current);
  }, [lastUpdated, loadDashboardData]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-64 md:col-span-2 bg-slate-100 rounded-2xl animate-shimmer"></div>
          <div className="h-64 bg-slate-100 rounded-2xl animate-shimmer"></div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex-1 p-5">
        <ErrorState
          title="Unable to load dashboard"
          message={error}
          onRetry={() => loadDashboardData()}
          retryText="Retry"
        />
      </div>
    );
  }

  const kpis = isAdmin ? [
    { label: "Members", value: stats?.totalMembers || 0, sub: `${stats?.activeMembers || 0} active`, icon: Users, color: "emerald" },
    { label: "Total Savings", value: rwf(stats?.totalContributions || 0), sub: rwf(stats?.weeklyContributions || 0) + " this week", icon: PiggyBank, color: "brand" },
    { label: "Loans Disbursed", value: rwf(loanStats?.totalDisbursedAmount || 0), sub: `${loanStats?.disbursedCount || 0} loans`, icon: FileSpreadsheet, color: "violet" },
    { label: "Overdue Loans", value: loanStats?.overdueCount || 0, sub: `${loanStats?.repaymentPerformance || 0}% repayment`, icon: AlertOctagon, color: loanStats?.overdueCount > 0 ? "rose" : "emerald" },
  ] : [
    { label: "My Savings", value: rwf(stats?.myTotalSavings || 0), sub: rwf(stats?.myWeeklySavings || 0) + " this week", icon: PiggyBank, color: "brand" },
    { label: "My Loans", value: stats?.myActiveLoans || 0, sub: `${stats?.myLoansCount || 0} total`, icon: FileSpreadsheet, color: "violet" },
    { label: "Pending", value: stats?.myPendingApprovals || 0, sub: `${stats?.myPendingLoanCount || 0} loans`, icon: Clock, color: "amber" },
    { label: "Attendance", value: `${stats?.myAttendanceRate || 0}%`, sub: `${stats?.myVerifiedCount || 0} of ${stats?.myAttendanceCount || 0} verified`, icon: ShieldCheck, color: "emerald" },
  ];

  const colorClasses = {
    brand: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  };

  const kpiTextColors = {
    brand: "text-blue-700",
    emerald: "text-emerald-700",
    violet: "text-violet-700",
    rose: "text-rose-600",
    amber: "text-amber-600",
  };

  return (
    <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-slate-50/50">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-white text-slate-800 rounded-xl p-5 border border-slate-200 flex flex-col sm:col-span-2 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-800 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                {isAdmin ? 'Admin' : 'Member'}
              </span>
              {lastUpdated && (
                <span className="text-[9px] text-slate-400 font-medium ml-auto">
                  Updated {formatTimeAgo(lastUpdated)}
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              <p className="text-[11px] text-slate-500 font-bold tracking-wide uppercase leading-none">Welcome back</p>
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                {user?.fullName}! <span className="inline-block origin-bottom">🇷🇼</span>
              </h3>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed max-w-xl font-semibold">
              {isAdmin
                ? "You have full administrative access to all settings and controls."
                : "View your savings, loans, and group activity here."}
            </p>
          </div>
        </div>

        {/* Live Activity Monitor */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Monitor
            </span>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Active</span>
          </div>

          <div className="space-y-1.5 py-2">
            {recentActivity.length > 0 ? (
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                {recentActivity.slice(0, 3).map((item, idx) => {
                  const Icon = getActivityIcon(item.type);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-2 text-[10px]"
                    >
                      <div className={`p-1 rounded shrink-0 ${getActivityColor(item.type)}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-700 font-semibold truncate leading-tight">{item.text}</p>
                        <p className="text-slate-400 font-mono">{formatTimeAgo(item.time)}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[10px] text-slate-500 py-2">
                <Inbox className="w-3.5 h-3.5 text-slate-400" />
                <span>Waiting for activity...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium border-t border-slate-100 pt-1.5">
            <Zap className="w-3 h-3 text-brand-500" />
            <span>Auto-refreshes every {REFRESH_INTERVAL / 1000}s</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={idx}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-default"
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <p className={`text-lg font-bold font-mono tracking-tight leading-none truncate ${kpiTextColors[kpi.color] || 'text-brand-700'}`}>
                  {kpi.value}
                </p>
                <span className="text-[9px] text-slate-500 font-semibold block truncate">{kpi.sub}</span>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[kpi.color] || colorClasses.brand} group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-4 h-4" />
              </div>
            </motion.div>
          );
        })}
      </motion.section>

      {isAdmin && (
        <>
          {/* Activity Feed, Recent Shares, Pending Actions */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight">Activity Feed</h4>
                    <p className="text-[9px] text-slate-400">Recent system events</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {recentActivity.length}
                </span>
              </div>
              <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
                {recentActivity.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <Inbox className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    No recent activity
                  </div>
                ) : (
                  recentActivity.map((item, idx) => {
                    const Icon = getActivityIcon(item.type);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50/60 border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className={`p-1.5 rounded shrink-0 ${getActivityColor(item.type)}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs text-slate-800 font-semibold leading-snug">{item.text}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <span>{item.sub}</span>
                            <span>&bull;</span>
                            <span>{formatTimeAgo(item.time)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* Recent Shares */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight">Recent Shares</h4>
                    <p className="text-[9px] text-slate-400">Latest distributions</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {recentShares.length}
                </span>
              </div>
              <div className="p-3 space-y-2.5 max-h-[280px] overflow-y-auto">
                {recentShares.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <Share2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    No share distributions yet
                  </div>
                ) : (
                  recentShares.map((share, idx) => (
                    <motion.div
                      key={share.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 rounded-lg bg-gradient-to-br from-emerald-50/80 to-brand-50/40 border border-emerald-100 hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">
                          {share.distributionPeriod || 'Distribution'}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {share.totalProfit ? rwf(Number(share.totalProfit)) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span>{formatDate(share.periodStart)}</span>
                        <span className="text-slate-300">→</span>
                        <span>{formatDate(share.periodEnd)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <User className="w-3 h-3" />
                        <span>by {share.createdBy?.fullName || 'System'}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Pending Actions */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.2 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col"
            >
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200">
                    <Clock4 className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight">Pending Actions</h4>
                    <p className="text-[9px] text-slate-400">Items requiring attention</p>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-2">
                {[
                  {
                    label: "Member Approvals",
                    count: stats?.pendingApprovals || 0,
                    icon: Users,
                    color: "brand",
                    desc: `${stats?.loanPendingCount || 0} loans, ${stats?.contribPendingCount || 0} contributions`
                  },
                  {
                    label: "Overdue Loans",
                    count: loanStats?.overdueCount || 0,
                    icon: AlertOctagon,
                    color: loanStats?.overdueCount > 0 ? "rose" : "emerald",
                    desc: `${loanStats?.repaymentPerformance || 0}% repayment`
                  },
                  {
                    label: "Defaulters",
                    count: stats?.defaulters || 0,
                    icon: ShieldCheck,
                    color: "rose",
                    desc: "Members with overdue balances"
                  },
                  {
                    label: "Attendance Rate",
                    count: `${stats?.attendanceRate || 0}%`,
                    icon: Check,
                    color: stats?.attendanceRate >= 80 ? "emerald" : "amber",
                    desc: `${stats?.verifiedAttendanceCount || 0} of ${stats?.totalAttendanceRecords || 0} verified`
                  }
                ].map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ x: 1 }}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50/60 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group"
                    >
                      <div className={`p-1.5 rounded shrink-0 ${colorClasses[action.color] || colorClasses.brand}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900">{action.label}</p>
                          <span className={`text-sm font-extrabold font-mono ${kpiTextColors[action.color] || 'text-brand-700'}`}>
                            {action.count}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">{action.desc}</p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </section>

          {/* Visual Analytics */}
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            {/* Savings Growth */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm tracking-tight">Savings Growth</h4>
                  <p className="text-[10px] text-slate-400">Weekly contributions trend</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-brand-700 font-extrabold font-mono bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                  <span>{rwf(stats?.totalContributions || 0)} total</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="h-56">
                {savingsTrend.length === 0 ? (
                  <EmptyState
                    title="No savings data yet"
                    description="Savings trend will appear once contributions are recorded."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={savingsTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [rwf(value), "Total Savings"]}
                      />
                      <Area type="monotone" dataKey="totalAmount" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Loans Overview */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm tracking-tight">Loans Overview</h4>
                <p className="text-[10px] text-slate-400">Disbursed versus repaid</p>
              </div>
              <div className="h-56">
                {loanPortfolio.length === 0 ? (
                  <EmptyState
                    title="No loan data"
                    description="Loan portfolio chart will appear once loans are disbursed."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={loanPortfolio} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => rwf(value)}
                      />
                      <Legend iconSize={6} wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Disbursed" fill="#6366f1" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Paid" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </motion.section>

          {/* Announcements & Meetings */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.3 }}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-200">
                    <Megaphone className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  Announcements
                </h4>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {announcements.length || 0}
                </span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {(!announcements.length) ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    <BellRing className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
                    No announcements at this time.
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div key={ann._id || ann.id} className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 space-y-1 hover:border-blue-200 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-extrabold text-slate-900 text-xs leading-snug">{ann.title}</h5>
                        <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                          ann.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          ann.priority === 'low' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {ann.priority || 'medium'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold line-clamp-2">{ann.message || ann.content}</p>
                      <span className="block text-[8px] text-slate-400 font-mono font-medium">
                        {ann.createdBy?.fullName || 'Admin'} &bull; {formatDate(ann.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.35 }}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-200">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  Upcoming Meetings
                </h4>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                  {meetings.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {(!meetings || meetings.length === 0) ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    <CalendarDays className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
                    No meetings scheduled.
                  </div>
                ) : (
                  meetings.map((m) => (
                    <div key={m._id || m.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group">
                      <div className={`p-1.5 rounded shrink-0 ${m.status === "completed" ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-700"}`}>
                        <CalendarDays className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-xs text-slate-900 truncate leading-none">{m.title}</h5>
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full ${
                            m.status === "completed" ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-800"
                          }`}>
                            {m.status || "scheduled"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate font-semibold">{m.description}</p>
                        <div className="flex flex-wrap items-center gap-x-2 pt-0.5 text-[8px] text-slate-400 font-mono">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {m.startTime || m.time} {m.date ? (typeof m.date === 'string' ? m.date : formatDate(m.date)) : ''}
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {m.location}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </section>
        </>
      )}

      {!isAdmin && stats && (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm tracking-tight">My Financial Overview</h4>
              <p className="text-[10px] text-slate-400">Savings, loans and net balance</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                <p className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider mb-0.5">Net Balance</p>
                <p className="text-base font-extrabold text-emerald-700 font-mono">{rwf(stats?.myNetBalance || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-center">
                <p className="text-[9px] text-blue-700 font-bold uppercase tracking-wider mb-0.5">Total Savings</p>
                <p className="text-base font-extrabold text-blue-700 font-mono">{rwf(stats?.myTotalSavings || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">Shares Value</p>
                <p className="text-base font-extrabold text-slate-700 font-mono">{rwf(stats?.myTotalSharesValue || 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-900 text-sm tracking-tight">My Attendance</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">Attendance Rate</span>
                <span className="text-sm font-extrabold text-blue-700 font-mono">{stats?.myAttendanceRate || 0}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats?.myAttendanceRate || 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                {stats?.myVerifiedCount || 0} of {stats?.myAttendanceCount || 0} meetings verified
              </p>
            </div>
          </div>
        </motion.section>
      )}
    </div>
  );
}