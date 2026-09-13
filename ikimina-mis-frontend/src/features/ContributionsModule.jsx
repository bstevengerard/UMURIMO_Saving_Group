import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  PiggyBank,
  CheckCircle,
  Clock,
  AlertTriangle,
  Receipt,
  FilePlus,
  TableProperties,
  ArrowRight,
  Calendar,
  Users,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";

export default function ContributionsModule() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [contributions, setContributions] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterWeek, setFilterWeek] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [activeTab, setActiveTab] = useState("logs");

  const [singleForm, setSingleForm] = useState({ memberId: "", week: "", amount: "25000", paymentMethod: "Mobile Money" });

  const [batchEntries, setBatchEntries] = useState([
    { memberId: "", amount: 25000, week: "", paymentMethod: "Mobile Money" },
    { memberId: "", amount: 25000, week: "", paymentMethod: "Mobile Money" },
  ]);

  const [allWeeks, setAllWeeks] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      let q = `/api/contributions?week=${filterWeek}&status=${filterStatus}`;
      if (user.role === "member") {
        const memberId = user._id || user.id;
        q += `&memberId=${memberId}`;
      }
      const logs = await apiFetch(q);
      setContributions(Array.isArray(logs) ? logs : []);

      const weeks = Array.from(new Set((Array.isArray(logs) ? logs : []).map(c => c.week).filter(Boolean))).sort();
      setAllWeeks(weeks);

      if (user.role === "admin") {
        const mems = await apiFetch("/api/members");
        setMembers(Array.isArray(mems) ? mems.map(m => ({ ...m, id: m._id || m.id })) : []);
      }
    } catch (e) {
      addNotification(e.message || "Failed to load contributions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterWeek, filterStatus, filterMember, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterWeek, filterStatus, filterMember, searchQuery, activeTab]);

  useEffect(() => {
    const w = contributions.map(c => c.week).filter(Boolean);
    setAllWeeks(Array.from(new Set(w)).sort());
  }, [contributions]);

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/contributions", {
        method: "POST",
        body: JSON.stringify(singleForm),
      });
      addNotification("Savings transaction recorded successfully!", "success");
      setSingleForm({ memberId: "", week: "", amount: "25000", paymentMethod: "Mobile Money" });
      setActiveTab("logs");
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    }
  };

  const handleBatchRowChange = (index, field, value) => {
    const updated = [...batchEntries];
    updated[index][field] = value;
    setBatchEntries(updated);
  };

  const addBatchRow = () => {
    setBatchEntries([...batchEntries, { memberId: "", amount: 25000, week: "", paymentMethod: "Mobile Money" }]);
  };

  const removeBatchRow = (index) => {
    if (batchEntries.length <= 1) return;
    setBatchEntries(batchEntries.filter((_, i) => i !== index));
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    const cleanEntries = batchEntries.filter((e) => e.memberId !== "");
    if (cleanEntries.length === 0) {
      addNotification("Please configure at least one valid member row", "error");
      return;
    }

    try {
      await apiFetch("/api/contributions/batch", {
        method: "POST",
        body: JSON.stringify({ contributions: cleanEntries }),
      });
      addNotification(`Recorded ${cleanEntries.length} contributions!`, "success");
      setBatchEntries([
        { memberId: "", amount: 25000, week: "", paymentMethod: "Mobile Money" },
        { memberId: "", amount: 25000, week: "", paymentMethod: "Mobile Money" },
      ]);
      setActiveTab("logs");
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    }
  };

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const filteredContributions = contributions.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (c.memberName || "").toLowerCase().includes(q) || (c.week || "").toLowerCase().includes(q);
  }).filter((c) => {
    if (!filterMember) return true;
    return c.memberId === filterMember;
  });

  const totalItems = filteredContributions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedContributions = filteredContributions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPaid = contributions.filter((c) => c.status === "paid").reduce((acc, current) => acc + current.amount, 0);
  const totalPending = contributions.filter((c) => c.status === "pending").reduce((acc, current) => acc + current.amount, 0);
  const paidCount = contributions.filter((c) => c.status === "paid").length;
  const avgContribution = paidCount > 0 ? totalPaid / paidCount : 0;

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
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Money / Savings</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Track member contributions and savings</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase leading-none">Total Savings</span>
            <p className="text-sm font-extrabold text-brand-700 mt-1 font-mono">{rwf(totalPaid)} total</p>
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
          { label: "Total Contributions", value: contributions.length, icon: PiggyBank, color: "brand" },
          { label: "Total Saved", value: rwf(totalPaid), icon: CheckCircle, color: "emerald" },
          { label: "Pending", value: rwf(totalPending), icon: Clock, color: "amber" },
          { label: "Avg Contribution", value: rwf(avgContribution), icon: TrendingUp, color: "violet" }
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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-4 sm:px-6 py-4 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "logs" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <TableProperties className="w-4 h-4" />
            <span>Contributions</span>
          </button>

          {hasPermission("manage_contributions") && (
            <>
              <button
                onClick={() => setActiveTab("record")}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === "record" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <FilePlus className="w-4 h-4" />
                <span>Record</span>
              </button>
              <button
                onClick={() => setActiveTab("batch")}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === "batch" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Bulk Record</span>
              </button>
            </>
          )}
        </div>
      </motion.div>

      {activeTab === "logs" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="space-y-4"
        >
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by member name or week..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                  />
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
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={filterWeek}
                    onChange={(e) => setFilterWeek(e.target.value)}
                    className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                  />
                </div>
              </div>
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
                      <div className="h-6 w-20 bg-slate-100 rounded-lg animate-shimmer"></div>
                      <div className="h-6 w-16 bg-slate-100 rounded-lg animate-shimmer"></div>
                      <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                      <div className="h-6 w-20 bg-slate-100 rounded-lg animate-shimmer"></div>
                    </div>
                  ))}
                </div>
              ) : paginatedContributions.length === 0 ? (
                <div className="py-16 px-4">
                  <EmptyState title="No contributions found" description="Record your first contribution to see it here." />
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Week</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Method</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <AnimatePresence>
                      {paginatedContributions.map((c, idx) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-900 text-sm block leading-tight">{c.memberName}</span>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-slate-700">{c.week}</td>
                          <td className="px-5 py-3.5 font-mono font-extrabold text-brand-800">{rwf(c.amount)}</td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={c.status} type="contribution" />
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">{c.paymentMethod}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                            {c.paymentDate ? new Date(c.paymentDate).toLocaleString() : '-'}
                          </td>
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

      {activeTab === "record" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="max-w-xl bg-white border border-slate-200 shadow-sm rounded-xl p-6"
        >
          <form onSubmit={handleSingleSubmit} className="space-y-5 text-sm font-medium">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-md">Record Payment</h4>
              <p className="text-xs text-slate-400 mt-1">Record a savings payment for a member</p>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Member</label>
              <select
                required
                value={singleForm.memberId}
                onChange={(e) => setSingleForm({ ...singleForm, memberId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
              >
                <option value="">Select Member...</option>
                {members.filter(m => m.isApproved).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} — {m.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Week</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={singleForm.week}
                    onChange={(e) => setSingleForm({ ...singleForm, week: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-xs focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Payment Method</label>
                <select
                  value={singleForm.paymentMethod}
                  onChange={(e) => setSingleForm({ ...singleForm, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                >
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash Ledger">Cash</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Savings Amount (RWF)</label>
              <input
                required
                type="number"
                value={singleForm.amount}
                onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-mono font-extrabold text-brand-800 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3.5">
              <button
                type="button"
                onClick={() => setActiveTab("logs")}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold transition shadow-sm"
              >
                Record Payment
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {activeTab === "batch" && (
        <motion.form
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          onSubmit={handleBatchSubmit}
          className="space-y-6 bg-white border border-slate-200 shadow-sm rounded-xl p-6"
        >
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center bg-white">
            <div>
              <h4 className="font-bold text-slate-900 text-md">Bulk Record</h4>
              <p className="text-xs text-slate-400 mt-1">Add savings payments for multiple members at the same time.</p>
            </div>
            <button
              type="button"
              onClick={addBatchRow}
              className="px-4 py-2 bg-slate-900 text-white hover:bg-brand-700 font-bold text-xs rounded-xl transition"
            >
              Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-medium">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Member</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Amount (RWF)</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Week</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Method</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchEntries.map((entry, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="py-3 pr-4">
                      <select
                        required
                        value={entry.memberId}
                        onChange={(e) => handleBatchRowChange(index, "memberId", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                      >
                        <option value="">Select Member...</option>
                        {members.filter(m => m.isApproved).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        required
                        value={entry.amount}
                        onChange={(e) => handleBatchRowChange(index, "amount", e.target.value)}
                        className="w-32 px-3 py-2 border border-slate-200 bg-white font-mono font-bold rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="date"
                        value={entry.week}
                        onChange={(e) => handleBatchRowChange(index, "week", e.target.value)}
                        className="w-32 px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={entry.paymentMethod}
                        onChange={(e) => handleBatchRowChange(index, "paymentMethod", e.target.value)}
                        className="w-40 px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                      >
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash Ledger">Cash</option>
                      </select>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        disabled={batchEntries.length <= 1}
                        onClick={() => removeBatchRow(index)}
                        className={`text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg transition font-semibold ${
                          batchEntries.length <= 1 ? "text-slate-300 pointer-events-none" : "text-rose-600 hover:bg-rose-50 border-rose-100"
                        }`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold flex items-center gap-2 transition shadow-sm"
            >
              <span>Save Bulk Payments</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.form>
      )}
    </div>
  );
}
