import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  Coins,
  Search,
  CheckCircle,
  AlertOctagon,
  Clock,
  Calendar,
  Receipt,
  FileSpreadsheet,
  Info,
  XCircle,
  Users
} from "lucide-react";
import { motion } from "motion/react";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";

export default function RepaymentsModule() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [history, setHistory] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentOverduePage, setCurrentOverduePage] = useState(1);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const [currentPendingPage, setCurrentPendingPage] = useState(1);
  const itemsPerPage = 6;

  const [activeTab, setActiveTab] = useState("overdue");

  useEffect(() => {
    setCurrentOverduePage(1);
    setCurrentHistoryPage(1);
    setCurrentPendingPage(1);
  }, [activeTab]);

  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "Mobile Money" });
  const [approvalNote, setApprovalNote] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const loadRepayData = async () => {
    setLoading(true);
    try {
      const hist = await apiFetch("/api/repayments/history");
      setHistory(Array.isArray(hist) ? hist : []);

      const over = await apiFetch("/api/repayments/overdue");
      setOverdue(Array.isArray(over) ? over : []);

      if (hasPermission("updateLoanStatus") || user.role === "admin") {
        const pend = await apiFetch("/api/repayments/pending");
        setPending(Array.isArray(pend) ? pend : []);
      }
    } catch (e) {
      addNotification(e.message || "Failed to load repayments", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepayData();
  }, [activeTab]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/repayments/installments/${selectedInstallment.installmentId}/pay`, {
        method: "PUT",
        body: JSON.stringify({
          amount: Number(payForm.amount || selectedInstallment.amountDue),
          paymentMethod: payForm.paymentMethod
        }),
      });
      addNotification("Payment recorded successfully", "success");
      setSelectedInstallment(null);
      setPayForm({ amount: "", paymentMethod: "Mobile Money" });
      loadRepayData();
    } catch (e) {
      addNotification(e.message || "Operation failed", "error");
    }
  };

  const handleApprove = async (installmentId) => {
    setActionLoading(installmentId);
    try {
      await apiFetch(`/api/repayments/installments/${installmentId}/approve`, {
        method: "PUT",
        body: JSON.stringify({ approvalNote: approvalNote || "" })
      });
      addNotification("Repayment approved", "success");
      setApprovalNote("");
      loadRepayData();
    } catch (e) {
      addNotification(e.message || "Failed to approve", "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleDeny = async (installmentId) => {
    setActionLoading(installmentId);
    try {
      await apiFetch(`/api/repayments/installments/${installmentId}/deny`, {
        method: "PUT",
        body: JSON.stringify({ approvalNote: approvalNote || "Denied by admin" })
      });
      addNotification("Repayment denied", "success");
      setApprovalNote("");
      loadRepayData();
    } catch (e) {
      addNotification(e.message || "Failed to deny", "error");
    } finally {
      setActionLoading("");
    }
  };

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const totalOverdueItems = overdue.length;
  const totalOverduePages = Math.ceil(totalOverdueItems / itemsPerPage);
  const paginatedOverdue = overdue.slice((currentOverduePage - 1) * itemsPerPage, currentOverduePage * itemsPerPage);

  const totalHistoryItems = history.length;
  const totalHistoryPages = Math.ceil(totalHistoryItems / itemsPerPage);
  const paginatedHistory = history.slice((currentHistoryPage - 1) * itemsPerPage, currentHistoryPage * itemsPerPage);

  const totalPendingItems = pending.length;
  const totalPendingPages = Math.ceil(totalPendingItems / itemsPerPage);
  const paginatedPending = pending.slice((currentPendingPage - 1) * itemsPerPage, currentPendingPage * itemsPerPage);

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
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Repayments</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Track loan repayments and overdue accounts</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase leading-none">Payments</span>
            <p className="text-sm font-extrabold text-brand-700 mt-1 font-mono">{history.length} recorded</p>
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
          { label: "Overdue", value: overdue.length, icon: AlertOctagon, color: overdue.length > 0 ? "rose" : "emerald" },
          { label: "Pending", value: pending.length, icon: Clock, color: "amber" },
          { label: "History", value: history.length, icon: FileSpreadsheet, color: "brand" },
          { label: "Total Collected", value: rwf(history.reduce((sum, h) => sum + (h.amountPaid || 0), 0)), icon: CheckCircle, color: "emerald" }
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
        <button onClick={() => { setActiveTab("overdue"); setSelectedInstallment(null); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "overdue" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
          <AlertOctagon className="w-4 h-4 text-rose-500" /><span>Overdue</span>
        </button>

        {(hasPermission("updateLoanStatus") || user.role === "admin") && (
          <button onClick={() => { setActiveTab("pending"); setSelectedInstallment(null); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "pending" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
            <Clock className="w-4 h-4 text-amber-500" /><span>Pending Approvals</span>
            {pending.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-extrabold">{pending.length}</span>}
          </button>
        )}

        <button onClick={() => { setActiveTab("history"); setSelectedInstallment(null); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "history" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
          <FileSpreadsheet className="w-4 h-4 text-brand-600" /><span>Payment History</span>
        </button>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 space-y-4">
          {activeTab === "overdue" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-950 text-sm">Overdue</h4>
                  <span className="text-[10px] text-slate-400 mt-0.5">Pending payments past their due dates</span>
                </div>
                <span className="text-xs bg-rose-50 text-rose-700 px-3 py-1 font-bold rounded-full font-mono">{overdue.length} overdue</span>
              </div>
              <div className="overflow-x-auto max-h-[600px]">
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
                        <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                        <div className="h-10 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                      </div>
                    ))}
                  </div>
                ) : overdue.length === 0 ? (
                  <div className="py-16 px-4">
                    <EmptyState title="All accounts are fully paid" description="There are no overdue repayments at this time." />
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Loan ID</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedOverdue.map((item) => (
                        <motion.tr
                          key={item.installmentId}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.02 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-900 block leading-tight">{item.memberName || "Borrower"}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">ID: {item.memberId}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-700 text-xs">{item.loanId}</td>
                          <td className="px-5 py-3.5 font-mono font-semibold text-rose-600">{rwf(item.amountDue)}</td>
                          <td className="px-5 py-3.5 space-y-1">
                            <span className="text-xs text-slate-800 font-bold block font-mono leading-none">{item.dueDate}</span>
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] bg-rose-50 text-rose-700 font-extrabold font-mono tracking-wider leading-none uppercase">{item.daysOverdue} days overdue</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => { setSelectedInstallment(item); setPayForm({ amount: String(item.amountDue), paymentMethod: "Mobile Money" }); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition">Record Pay</button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {totalOverduePages > 1 && (
                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50">
                  <Pagination currentPage={currentOverduePage} totalPages={totalOverduePages} onPageChange={setCurrentOverduePage} totalItems={totalOverdueItems} itemsPerPage={itemsPerPage} />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-950 text-sm">Pending Approvals</h4>
                  <span className="text-[10px] text-slate-400 mt-0.5">Repayments awaiting review</span>
                </div>
                <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 font-bold rounded-full font-mono">{pending.length} pending</span>
              </div>
              <div className="overflow-x-auto max-h-[600px]">
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
                        <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                        <div className="h-8 w-20 bg-slate-100 rounded-lg animate-shimmer"></div>
                      </div>
                    ))}
                  </div>
                ) : pending.length === 0 ? (
                  <div className="py-16 px-4">
                    <EmptyState title="No pending approvals" description="All repayments have been reviewed." />
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Installment</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount Due</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paid Amount</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedPending.map((inst) => (
                        <motion.tr
                          key={inst.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.02 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-900 block leading-tight">{inst.loan?.member?.fullName || "Unknown"}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Loan: {inst.loanId}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-slate-700">#{inst.installmentNumber}</td>
                          <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">{rwf(inst.totalAmount)}</td>
                          <td className="px-5 py-3.5 font-mono font-bold text-brand-700">{rwf(inst.paidAmount)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleApprove(inst.id)} disabled={actionLoading === inst.id} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[11px] font-bold transition disabled:opacity-50">{actionLoading === inst.id ? "..." : "Approve"}</button>
                              <button onClick={() => handleDeny(inst.id)} disabled={actionLoading === inst.id} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition disabled:opacity-50">{actionLoading === inst.id ? "..." : "Deny"}</button>
                            </div>
                            <input type="text" value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="Note (optional)" className="mt-2 w-full px-2 py-1 border border-slate-200 rounded-lg text-[10px]" />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {totalPendingPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50">
                  <Pagination currentPage={currentPendingPage} totalPages={totalPendingPages} onPageChange={setCurrentPendingPage} totalItems={totalPendingItems} itemsPerPage={itemsPerPage} />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-950 text-sm">Payments</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">All received loan payments</p>
                </div>
                <span className="text-xs bg-brand-50 text-brand-700 px-3 py-1 font-bold rounded-full font-mono">{history.length} recorded</span>
              </div>
              <div className="overflow-x-auto max-h-[600px]">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 animate-shimmer shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-32 bg-slate-100 rounded animate-shimmer"></div>
                          <div className="h-2.5 w-48 bg-slate-100 rounded animate-shimmer"></div>
                        </div>
                        <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                        <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                        <div className="h-6 w-20 bg-slate-100 rounded-lg animate-shimmer"></div>
                      </div>
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-16 px-4">
                    <EmptyState title="No payments received yet" description="Recorded repayments will appear here." />
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Borrower</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment ID</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Method</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedHistory.map((h) => (
                        <motion.tr
                          key={h.installmentId}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.02 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-900 block leading-tight">{h.memberName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">Loan ID: {h.loanId}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-medium text-xs text-slate-500">{h.installmentId}</td>
                          <td className="px-5 py-3.5 font-mono font-bold text-brand-800">{rwf(h.amountPaid)}</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">{h.paymentMethod || "Mobile Money"}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{h.paidDate}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {totalHistoryPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50">
                  <Pagination currentPage={currentHistoryPage} totalPages={totalHistoryPages} onPageChange={setCurrentHistoryPage} totalItems={totalHistoryItems} itemsPerPage={itemsPerPage} />
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-md flex items-center gap-2">
              <Coins className="w-5 h-5 text-brand-600" />
              <span>Record</span>
            </h4>
          </div>

          {selectedInstallment ? (
            <motion.form
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handlePaymentSubmit}
              className="space-y-4 text-sm font-medium"
            >
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Details</span>
                <p className="font-bold text-slate-900 text-sm">{selectedInstallment.memberName}</p>
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-slate-500 font-mono">Amount due:</span>
                  <strong className="text-brand-700 font-mono font-extrabold">{rwf(selectedInstallment.amountDue)}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Amount (RWF)</label>
                <input required type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Method</label>
                <select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition">
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash Ledger">Cash</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3.5">
                <button type="button" onClick={() => setSelectedInstallment(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl shadow-sm transition">Record Payment</button>
              </div>
            </motion.form>
          ) : (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center p-4">
              <Receipt className="w-12 h-12 text-slate-300" />
              <h5 className="font-bold text-sm text-slate-700 mt-3">Record payment</h5>
              <p className="text-xs max-w-[200px] mt-1.5">Select an overdue item from the table to record a payment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
