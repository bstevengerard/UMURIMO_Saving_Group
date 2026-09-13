import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Receipt,
  FilePlus,
  TableProperties,
  ArrowRight,
  Calendar,
  TrendingUp,
  Share2,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StatusBadge from "../components/StatusBadge";
import CurrencyDisplay from "../components/CurrencyDisplay";
import ConfirmDialog from "../components/ConfirmDialog";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";

export default function SharesModule() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [shares, setShares] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalShares: 0, totalMembers: 0 });
  const [distributions, setDistributions] = useState([]);
  const isInitialMount = useRef(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [activeTab, setActiveTab] = useState("ledger");
  const [submittingShares, setSubmittingShares] = useState(false);
  const [submittingDistribution, setSubmittingDistribution] = useState(false);
  const [formData, setFormData] = useState({ memberId: "", numberOfShares: 0, shareValue: 1000 });
  const [distributionForm, setDistributionForm] = useState({ distributionPeriod: "quarterly", periodStart: "", periodEnd: "" });

  const loadData = async () => {
    const showLoader = isInitialMount.current;
    if (showLoader) setLoading(true);
    try {
      if (user.role === "member") {
        const myShare = await apiFetch("/api/shares/me");
        const list = Array.isArray(myShare) ? myShare : [myShare].filter(Boolean);
        const normalized = list.map((s) => ({
          ...s,
          memberName: s.memberId?.fullName || user.fullName
        }));
        setShares(normalized);

        const ownTotalShares = normalized.reduce((sum, s) => sum + (s.numberOfShares || 0), 0);
        const ownTotalValue = normalized.reduce((sum, s) => sum + ((s.numberOfShares || 0) * (s.shareValue || 0)), 0);
        setSummary({
          totalShares: ownTotalShares,
          totalValue: ownTotalValue,
          totalMembers: 1,
          isOwnSummary: true
        });
      } else {
        const sharesData = await apiFetch("/api/shares");
        setShares(Array.isArray(sharesData) ? sharesData : []);

        const membersData = await apiFetch("/api/members");
        setMembers(Array.isArray(membersData) ? membersData.map(m => ({ ...m, id: m._id || m.id })) : []);

        const summaryData = await apiFetch("/api/shares/summary").catch(() => null);
        if (summaryData) {
          summaryData.isOwnSummary = false;
          setSummary(summaryData);
        }
      }

      if (user.role === "admin") {
        const distData = await apiFetch("/api/shares/distributions").catch(() => []);
        setDistributions(distData || []);
      }
    } catch (e) {
      addNotification(e.message || "Failed to load shares data", "error");
    } finally {
      if (showLoader) {
        setLoading(false);
        isInitialMount.current = false;
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleUpsertShares = async (e) => {
    e.preventDefault();
    setSubmittingShares(true);
    try {
      await apiFetch("/api/shares", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      addNotification("Shares updated successfully!", "success");
      setFormData({ memberId: "", numberOfShares: 0, shareValue: 1000 });
      loadData();
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    } finally {
      setSubmittingShares(false);
    }
  };

  const handleDistributeProfit = async (e) => {
    e.preventDefault();
    setSubmittingDistribution(true);
    try {
      const result = await apiFetch("/api/shares/distribute", {
        method: "POST",
        body: JSON.stringify(distributionForm),
      });
      const count = result.distributions?.length || 0;
      if (count === 0) {
        addNotification("No members with shares found. Please set up member shares first.", "error");
      } else {
        addNotification(`Profit distributed to ${count} members.`, "success");
      }
      setDistributionForm({ distributionPeriod: "quarterly", periodStart: "", periodEnd: "" });
      loadData();
    } catch (err) {
      addNotification(err.message || "Distribution failed", "error");
    } finally {
      setSubmittingDistribution(false);
    }
  };

  const filteredShares = shares.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (s.memberId?.fullName || "").toLowerCase().includes(q);
  }).filter((s) => {
    if (!filterMember) return true;
    const sid = typeof s.memberId === 'object' ? (s.memberId._id || s.memberId.id) : s.memberId;
    return sid === filterMember;
  }).filter((s) => (s.numberOfShares || 0) > 0);

  const totalItems = filteredShares.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedShares = filteredShares.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalValue = shares.reduce((sum, s) => sum + ((s.numberOfShares || 0) * (s.shareValue || 0)), 0);
  const totalProfit = shares.reduce((sum, s) => sum + (s.totalProfit || 0), 0);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Shares & Profit</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Share ownership and profit distributions</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase leading-none">{summary.isOwnSummary ? 'My Total Shares' : 'Total Shares'}</span>
            <p className="text-sm font-extrabold text-emerald-700 mt-1 font-mono">{summary.totalShares} Shares {summary.isOwnSummary && <span className="text-emerald-600"><CurrencyDisplay value={summary.totalValue || 0} /></span>}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.25 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {[
          { label: "Total Shares", value: summary.totalShares, icon: Share2, color: "brand" },
          { label: "Members", value: summary.totalMembers, icon: Users, color: "emerald" },
          { label: "Total Value", value: <CurrencyDisplay value={totalValue} />, icon: TrendingUp, color: "violet" },
          { label: "Total Profit", value: <CurrencyDisplay value={totalProfit} />, icon: CheckCircle, color: "amber" }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <Icon className="w-4 h-4 text-slate-700" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-sm font-extrabold text-slate-900 font-mono leading-none mt-0.5">{stat.value}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25 }}
        className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm inline-flex"
      >
        <button onClick={() => setActiveTab("ledger")} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "ledger" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
          <TableProperties className="w-4 h-4" />
          Shares Ledger
        </button>
        {hasPermission("manage_members") && (
          <button onClick={() => setActiveTab("manage")} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "manage" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
            <Share2 className="w-4 h-4" />
            Manage Shares
          </button>
        )}
        {hasPermission("manage_members") && (
          <button onClick={() => setActiveTab("distribute")} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "distribute" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
            <TrendingUp className="w-4 h-4" />
            Distribute Profit
          </button>
        )}
        <button onClick={() => setActiveTab("history")} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "history" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
          <History className="w-4 h-4" />
          History
        </button>
      </motion.div>

      {activeTab === "ledger" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="space-y-4"
        >
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by member name..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
              </div>
              {user.role === "admin" && (
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={filterMember}
                    onChange={(e) => setFilterMember(e.target.value)}
                    className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                  >
                    <option value="">All Members</option>
                    {members.filter(m => m.isApproved !== false).map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 animate-shimmer shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-slate-100 rounded animate-shimmer"></div>
                        <div className="h-2.5 w-48 bg-slate-100 rounded animate-shimmer"></div>
                      </div>
                      <div className="h-6 w-16 bg-slate-100 rounded-lg animate-shimmer"></div>
                      <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                      <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                      <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                    </div>
                  ))}
                </div>
              ) : paginatedShares.length === 0 ? (
                <div className="py-16 px-4">
                  <EmptyState title="No shares records found" description="Shares will appear here once assigned." />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shares</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Share Value</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Value</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    <AnimatePresence>
                      {paginatedShares.map((s, idx) => (
                        <motion.tr
                          key={s._id || s.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-900 block leading-tight">{s.memberName || s.memberId?.fullName || "Unknown"}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-800">{s.numberOfShares}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-700"><CurrencyDisplay value={s.shareValue} /></td>
                          <td className="px-5 py-3.5 text-right font-mono font-extrabold text-emerald-800"><CurrencyDisplay value={(s.numberOfShares || 0) * (s.shareValue || 0)} /></td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-brand-700"><CurrencyDisplay value={s.totalProfit || 0} /></td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === "manage" && hasPermission("manage_members") && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="max-w-xl bg-white border border-slate-200 shadow-sm rounded-xl p-6"
        >
          <form onSubmit={handleUpsertShares} className="space-y-5 text-sm font-medium">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">Manage Shares</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Set or update the number of shares for a member</p>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Member</label>
              <select required value={formData.memberId} onChange={(e) => setFormData({ ...formData, memberId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition">
                <option value="">Select Member...</option>
                {members.filter(m => m.isApproved).map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName} — {m.phone}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Number of Shares</label>
                <input required type="number" min="0" value={formData.numberOfShares} onChange={(e) => setFormData({ ...formData, numberOfShares: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono font-bold bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Share Value (RWF)</label>
                <input required type="number" min="0" value={formData.shareValue} onChange={(e) => setFormData({ ...formData, shareValue: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono font-bold bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setActiveTab("ledger")} className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition">Cancel</button>
              <button type="submit" disabled={submittingShares} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
                {submittingShares ? "Saving..." : "Save Shares"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {activeTab === "distribute" && hasPermission("manage_members") && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="max-w-xl bg-white border border-slate-200 shadow-sm rounded-xl p-6"
        >
          <form onSubmit={handleDistributeProfit} className="space-y-5 text-sm font-medium">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">Distribute Share Profit</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Allocate profit to members based on their share proportion</p>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Distribution Period</label>
              <select value={distributionForm.distributionPeriod} onChange={(e) => setDistributionForm({ ...distributionForm, distributionPeriod: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Period Start</label>
                <input type="date" required value={distributionForm.periodStart} onChange={(e) => setDistributionForm({ ...distributionForm, periodStart: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Period End</label>
                <input type="date" required value={distributionForm.periodEnd} onChange={(e) => setDistributionForm({ ...distributionForm, periodEnd: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              This will calculate total profit for the period and distribute it proportionally based on each member's shares.
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setActiveTab("ledger")} className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition">Cancel</button>
              <button type="submit" disabled={submittingDistribution} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
                {submittingDistribution ? "Distributing..." : "Distribute Profit"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {activeTab === "history" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0">
                      <div className="h-4 w-24 bg-slate-100 rounded animate-shimmer"></div>
                      <div className="h-4 w-24 bg-slate-100 rounded animate-shimmer"></div>
                      <div className="h-4 w-24 bg-slate-100 rounded animate-shimmer"></div>
                      <div className="h-4 w-24 bg-slate-100 rounded animate-shimmer"></div>
                      <div className="h-4 w-16 bg-slate-100 rounded animate-shimmer"></div>
                      <div className="h-4 w-16 bg-slate-100 rounded animate-shimmer"></div>
                      <div className="h-4 w-24 bg-slate-100 rounded animate-shimmer"></div>
                    </div>
                  ))}
                </div>
              ) : distributions.length === 0 ? (
                <div className="py-16 px-4">
                  <EmptyState title="No profit distributions yet" description="Distributions will appear here once profit is allocated." />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Period</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Profit</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Allocation %</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Distributed On</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Created By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    <AnimatePresence>
                      {distributions.map((d, idx) => (
                        <motion.tr
                          key={d.id || d._id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-900 block leading-tight capitalize">{d.distributionPeriod?.replace('_', ' ')}</span>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-slate-700">{d.periodStart ? new Date(d.periodStart).toLocaleDateString() : '-'}</td>
                          <td className="px-5 py-3.5 text-xs font-mono text-slate-700">{d.periodEnd ? new Date(d.periodEnd).toLocaleDateString() : '-'}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-extrabold text-emerald-800"><CurrencyDisplay value={d.totalProfit || 0} /></td>
                          <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-800">{d.allocatedPercent || 0}%</td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">{d.distributedAt ? new Date(d.distributedAt).toLocaleDateString() : '-'}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">{d.createdBy?.fullName || "System"}</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
