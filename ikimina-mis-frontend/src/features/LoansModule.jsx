import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  HandCoins,
  ArrowRight,
  Clock,
  Calendar,
  AlertCircle,
  ChevronRight,
  Calculator,
  User,
  Info,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";

export default function LoansModule() {
  const { apiFetch, user, loanConfig, hasPermission, addNotification } = useApp();
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [activeTab, setActiveTab] = useState("ledger");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [cancelError, setCancelError] = useState("");

  const [applyForm, setApplyForm] = useState({ amount: "", termMonths: "3" });
  const [eligibility, setEligibility] = useState(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState("");

  const loadLoans = async () => {
    setLoading(true);
    try {
      let q = `/api/loans?status=${filterStatus}`;
      if (user.role === "member") {
        q += `&memberId=${user.id}`;
      }
      const data = await apiFetch(q);
      setLoans(Array.isArray(data) ? data.map(l => ({ ...l, id: String(l._id || l.id), memberName: l.memberId?.fullName || 'Unknown' })) : []);

      if (user.role === "admin") {
        const mems = await apiFetch("/api/members");
        setMembers(Array.isArray(mems) ? mems.map(m => ({ ...m, id: m._id || m.id })) : []);
      }
    } catch (e) {
      addNotification(e.message || "Failed to load loans", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, [filterStatus, filterMember, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterMember]);

  const loadEligibility = async () => {
    if (user.role !== "member") return;
    setLoadingEligibility(true);
    setEligibilityError("");
    try {
      const data = await apiFetch("/api/loans/eligibility");
      setEligibility(data);
    } catch (err) {
      setEligibilityError(err.message || "Could not load eligibility");
    } finally {
      setLoadingEligibility(false);
    }
  };

  useEffect(() => {
    if (activeTab === "apply" && user.role === "member") {
      loadEligibility();
    }
  }, [activeTab]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    const amountVal = Number(applyForm.amount);

    if (eligibility) {
      if (amountVal > Number(eligibility.maxAllowed)) {
        addNotification(`Requested amount exceeds your limit. Maximum allowed: RWF ${Number(eligibility.maxAllowed).toLocaleString()}`, "error");
        return;
      }
      if (amountVal < Number(eligibility.minLoanAmount)) {
        addNotification(`Amount is below minimum. Minimum: RWF ${Number(eligibility.minLoanAmount).toLocaleString()}`, "error");
        return;
      }
      if (eligibility.eligibilityStatus === "not_eligible") {
        addNotification("You are currently not eligible for a loan. Please clear any outstanding obligations.", "error");
        return;
      }
    }

    if (loanConfig) {
      if (amountVal > Number(loanConfig.maxLoanAmount)) {
        addNotification(`Maximum loan limit exceeded. Maximum: RWF ${Number(loanConfig.maxLoanAmount).toLocaleString()}`, "error");
        return;
      }
      if (amountVal < Number(loanConfig.minLoanAmount)) {
        addNotification(`Loan is below minimum entry threshold. Minimum: RWF ${Number(loanConfig.minLoanAmount).toLocaleString()}`, "error");
        return;
      }
    }

    try {
      await apiFetch("/api/loans", {
        method: "POST",
        body: JSON.stringify({
          amount: amountVal,
          termMonths: Number(applyForm.termMonths)
        })
      });
      addNotification("Loan request submitted. Under review.", "success");
      setApplyForm({ amount: "", termMonths: "3" });
      setActiveTab("ledger");
      loadLoans();
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    }
  };

  const handleCancelLoan = async (loanId) => {
    if (!loanId) {
      addNotification("Invalid loan selection", "error");
      return;
    }
    try {
      await apiFetch(`/api/loans/${loanId}/cancel`, { method: "PUT" });
      addNotification("Loan application cancelled.", "success");
      setCancelError("");
      setSelectedLoan(null);
      loadLoans();
    } catch (e) {
      setCancelError(e.message || "Failed to cancel application");
      addNotification(e.message || "Failed to cancel application", "error");
    }
  };

  const handleLoanWorkflow = async (loanId, targetStatus) => {
    try {
      const payload = await apiFetch(`/api/loans/${loanId}`, {
        method: "PUT",
        body: JSON.stringify({ status: targetStatus })
      });
      addNotification(`Loan status changed to ${targetStatus}`, "success");

      if (selectedLoan && selectedLoan.id === loanId) {
        setSelectedLoan({ ...payload, id: loanId });
      }
      loadLoans();
    } catch (e) {
      addNotification(e.message || "Operation failed", "error");
    }
  };

  const handleGenerateSchedule = async (loanId) => {
    try {
      const schedule = await apiFetch(`/api/loans/${loanId}/schedule`, { method: "POST" });
      addNotification("Payment schedule updated", "success");
      const detailed = await apiFetch(`/api/loans/${loanId}`);
      setSelectedLoan({ ...detailed, id: loanId });
    } catch (e) {
      addNotification(e.message || "Operation failed", "error");
    }
  };

  const handleApplyInterestIncrement = async (loanId) => {
    try {
      const updated = await apiFetch(`/api/loans/${loanId}/apply-interest-increment`, { method: "POST" });
      addNotification("Interest increment applied successfully", "success");
      if (selectedLoan && selectedLoan.id === loanId) {
        setSelectedLoan({ ...selectedLoan, ...updated });
      }
      loadLoans();
    } catch (e) {
      addNotification(e.message || "Failed to apply interest increment", "error");
    }
  };

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const totalItems = loans.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedLoans = loans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const estimatedInterest = eligibility && applyForm.amount
    ? calculateInterest(Number(applyForm.amount), eligibility.baseInterestRate, Number(applyForm.termMonths))
    : 0;
  const estimatedTotal = eligibility && applyForm.amount
    ? Number(applyForm.amount) + estimatedInterest
    : 0;

  function calculateInterest(principal, rate, months) {
    if (!principal || !rate || !months) return 0;
    return Math.round((principal * (rate / 100) * months / 12) * 100) / 100;
  }

  const totalDisbursed = loans.filter(l => l.status === "disbursed").reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalPending = loans.filter(l => l.status === "pending").reduce((sum, l) => sum + (l.amount || 0), 0);
  const overdueCount = loans.filter(l => l.status === "overdue").length;

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
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Loans</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage loan applications and disbursements</p>
          </div>
          {loanConfig && (
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase leading-none">Limits</span>
              <p className="text-xs font-extrabold text-slate-700 mt-1 font-mono">Min {rwf(Number(loanConfig.minLoanAmount))} / Max {rwf(Number(loanConfig.maxLoanAmount))}</p>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.25 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {[
          { label: "Total Loans", value: loans.length, icon: FileText, color: "brand" },
          { label: "Disbursed", value: rwf(totalDisbursed), icon: HandCoins, color: "emerald" },
          { label: "Pending", value: rwf(totalPending), icon: Clock, color: "amber" },
          { label: "Overdue", value: overdueCount, icon: AlertOctagon, color: overdueCount > 0 ? "rose" : "emerald" }
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
            onClick={() => { setActiveTab("ledger"); setSelectedLoan(null); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "ledger" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Loans</span>
          </button>

          {user.role === "member" && (
            <button
              onClick={() => { setActiveTab("apply"); setSelectedLoan(null); }}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "apply" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Request</span>
            </button>
          )}
        </div>
      </motion.div>

      {activeTab === "ledger" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start"
        >
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                  >
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="disbursed">Disbursed</option>
                    <option value="overdue">Overdue</option>
                    <option value="completed">Completed</option>
                  </select>
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
                        <div className="h-6 w-20 bg-slate-100 rounded-lg animate-shimmer"></div>
                        <div className="h-6 w-20 bg-slate-100 rounded-lg animate-shimmer"></div>
                        <div className="h-6 w-20 bg-slate-100 rounded-lg animate-shimmer"></div>
                      </div>
                    ))}
                  </div>
                ) : paginatedLoans.length === 0 ? (
                  <div className="py-16 px-4">
                    <EmptyState title="No loans found" description="Loan applications will appear here." />
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Term</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {paginatedLoans.map((l, idx) => (
                          <motion.tr
                            key={l.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ delay: idx * 0.02 }}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                            onClick={() => setSelectedLoan(l)}
                          >
                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-slate-900 block leading-tight">{l.memberName}</span>
                            </td>
                            <td className="px-5 py-3.5 font-mono font-extrabold text-brand-800">{rwf(l.amount)}</td>
                            <td className="px-5 py-3.5 text-xs font-bold font-mono text-slate-800">{l.termMonths} Months @ {l.interestRate ?? 5}%</td>
                            <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{new Date(l.requestDate).toLocaleDateString()}</td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={l.status} type="loan" />
                            </td>
                            <td className="px-5 py-3.5 text-right"><ChevronRight className="w-5 h-5 text-slate-300 ml-auto" /></td>
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
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            {selectedLoan ? (
              <div className="space-y-6">
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase leading-none">Actions</span>
                  <h4 className="font-bold text-slate-950 text-md">Details for {selectedLoan.memberName}</h4>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-brand-50 text-brand-700 uppercase tracking-wide">RWF {selectedLoan.amount.toLocaleString()}</span>
                    {selectedLoan.interest_increment_applied && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-amber-50 text-amber-700 uppercase tracking-wide">+{selectedLoan.total_interest_rate - selectedLoan.original_interest_rate}% increment</span>
                    )}
                  </div>
                </div>

                {selectedLoan.status === "pending" && (hasPermission("approve_loan") || hasPermission("updateLoanStatus")) && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 font-medium">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" /><span>Review this loan:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => handleLoanWorkflow(selectedLoan.id, "rejected")} className="py-2.5 bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition">Reject</button>
                      <button type="button" onClick={() => handleLoanWorkflow(selectedLoan.id, "approved")} className="py-2.5 bg-brand-700 text-white hover:bg-brand-800 rounded-xl text-xs font-bold transition shadow-sm">Approve</button>
                    </div>
                  </div>
                )}

                {selectedLoan.status === "approved" && hasPermission("manage_loans") && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 font-medium">
                    <div className="flex items-center justify-between text-xs text-slate-600"><span>Awaiting disbursement:</span></div>
                    <button type="button" onClick={() => handleLoanWorkflow(selectedLoan.id, "disbursed")} className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95">
                      <HandCoins className="w-4 h-4" /><span>Disburse</span>
                    </button>
                  </div>
                )}

                {selectedLoan.status === "disbursed" && hasPermission("updateLoanStatus") && !selectedLoan.interest_increment_applied && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-3 font-medium">
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      <Info className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Interest can be incremented by {loanConfig?.interestIncrement || 3}% if conditions are met.</span>
                    </div>
                    <button type="button" onClick={() => handleApplyInterestIncrement(selectedLoan.id)} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition">
                      Apply +{loanConfig?.interestIncrement || 3}% Interest Increment
                    </button>
                  </div>
                )}

                {user.role === "member" && selectedLoan.status === "pending" && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-3 font-medium">
                    <div className="flex items-center gap-2 text-xs text-rose-700">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /><span>Your request is pending. You can cancel it if you no longer need it.</span>
                    </div>
                    <button type="button" onClick={() => selectedLoan?.id && handleCancelLoan(selectedLoan.id)} className="w-full py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition">Cancel Request</button>
                    {cancelError && <div className="text-xs text-rose-700 bg-rose-100 p-2 rounded">{cancelError}</div>}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Schedule</h5>
                    {selectedLoan.status !== "pending" && (!selectedLoan.repaymentSchedule || selectedLoan.repaymentSchedule.length === 0) && (
                      <button onClick={() => handleGenerateSchedule(selectedLoan.id)} className="text-[10px] text-brand-700 font-bold hover:underline">Create Schedule</button>
                    )}
                  </div>

                  {(!selectedLoan.repaymentSchedule || selectedLoan.repaymentSchedule.length === 0) ? (
                    <div className="py-12 bg-slate-50/50 border border-slate-100 rounded-xl flex flex-col items-center justify-center text-center p-4">
                      <Clock className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-bold text-slate-500 mt-2">Payments scheduled</p>
                      <span className="text-[10px] text-slate-400 mt-1 max-w-[180px]">Payment schedule will be created once the loan is approved.</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {selectedLoan.repaymentSchedule.map((inst) => (
                        <div key={inst.id} className="p-3.5 bg-slate-50 border border-slate-100/50 rounded-xl flex items-center justify-between text-xs font-medium">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-mono uppercase">Payment {inst.installmentNumber}</span>
                            <span className="block font-extrabold text-slate-900 font-mono">{rwf(inst.totalAmount)}</span>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                              <Calendar className="w-3.5 h-3.5" /><span>Due: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : '-'}</span>
                            </div>
                          </div>
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              inst.status === "paid" ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"
                            }`}>{inst.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center p-4">
                <FileText className="w-12 h-12 text-slate-300" />
                {user.role === "member" ? (
                  <>
                    <h5 className="font-bold text-sm text-slate-700 mt-3">Your Loans</h5>
                    <p className="text-xs max-w-[200px] mt-1.5">Select a loan from the list to view details or cancel a pending request.</p>
                  </>
                ) : (
                  <>
                    <h5 className="font-bold text-sm text-slate-700 mt-3">Select a loan</h5>
                    <p className="text-xs max-w-[200px] mt-1.5">Choose a loan from the table to approve, disburse, or view payments</p>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === "apply" && user.role === "member" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="max-w-xl bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-6"
        >
          <form onSubmit={handleApplySubmit} className="space-y-5 text-sm font-medium">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-md">Request a Loan</h4>
              <p className="text-xs text-slate-400 mt-1">Enter amount and term below</p>
            </div>

            {eligibility && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Info className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="font-bold">Your Loan Eligibility</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Status:</span> <span className={`font-bold ${eligibility.eligibilityStatus === "eligible" ? "text-brand-700" : "text-rose-700"}`}>{eligibility.eligibilityStatus === "eligible" ? "Eligible" : "Not Eligible"}</span></div>
                  <div><span className="text-slate-500">Max Allowed:</span> <span className="font-bold text-brand-700">{rwf(eligibility.maxAllowed)}</span></div>
                  <div><span className="text-slate-500">Base Rate:</span> <span className="font-bold">{eligibility.baseInterestRate}%</span></div>
                  <div><span className="text-slate-500">Increment:</span> <span className="font-bold">+{eligibility.interestIncrement}%</span></div>
                  <div><span className="text-slate-500">Active Loans:</span> <span className="font-bold">{eligibility.activeLoans} / {loanConfig?.maxActiveLoans || 1}</span></div>
                  <div><span className="text-slate-500">Monthly Used:</span> <span className="font-bold">{rwf(eligibility.monthlyBorrowed)} / {rwf(eligibility.monthlyLoanLimit)}</span></div>
                </div>
                {eligibilityError && <p className="text-[10px] text-rose-600">{eligibilityError}</p>}
              </div>
            )}

            {eligibility && eligibility.eligibilityStatus !== "eligible" && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {eligibility.eligibilityStatus === "not_eligible" ? "You are currently not eligible for a new loan." : "Please review your eligibility above."}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Your Information</label>
              <div className="p-3.5 bg-brand-50 border border-brand-100/50 rounded-xl text-brand-800 flex items-center gap-2.5">
                <User className="w-5 h-5" />
                <div>
                  <h5 className="font-bold leading-none">{user.fullName}</h5>
                  <span className="text-[10px] font-medium block mt-0.5">{user.phone} &bull; Member</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Amount (RWF)</label>
              <input required type="number" value={applyForm.amount} onChange={(e) => setApplyForm({ ...applyForm, amount: e.target.value })} placeholder="200000" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-mono font-extrabold text-brand-800 text-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
            </div>

            {eligibility && applyForm.amount && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Estimated interest:</span><span className="font-bold">{rwf(estimatedInterest)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Estimated total repayment:</span><span className="font-extrabold text-brand-700">{rwf(estimatedTotal)}</span></div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Term</label>
              <select value={applyForm.termMonths} onChange={(e) => setApplyForm({ ...applyForm, termMonths: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition">
                <option value="1">1 Month</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3.5">
              <button type="button" onClick={() => setActiveTab("ledger")} className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold flex items-center gap-2 transition shadow-sm">
                <span>Submit</span>
                <ArrowRight className="w-5 h-5 shrink-0" />
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
}
