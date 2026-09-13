import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Calendar,
  Calculator,
  FileText,
  AlertCircle,
  ArrowLeftRight,
  Download
} from "lucide-react";
import CurrencyDisplay from "../components/CurrencyDisplay";
import StatusBadge from "../components/StatusBadge";
import { SkeletonCard, SkeletonTableRow } from "../components/Skeleton";
import LoadingSpinner from "../components/LoadingSpinner";

export default function LoanStatementPage() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = user?.role === "admin";

  const loadLoans = async () => {
    setLoading(true);
    setError("");
    try {
      let q = "/api/loans";
      if (!isAdmin) {
        q += `?memberId=${user.id}`;
      }
      const data = await apiFetch(q);
      const loanList = (data || []).map(l => ({ ...l, id: l._id || l.id }));
      setLoans(loanList);
      if (loanList.length > 0 && !selectedLoan) {
        setSelectedLoan(loanList[0]);
      }
    } catch (e) {
      setError(e.message || "Failed to load loans");
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLoanDetail = async (loanId) => {
    try {
      const data = await apiFetch(`/api/loans/${loanId}`);
      setSelectedLoan({ ...data, id: loanId });
    } catch (e) {
      addNotification(e.message || "Failed to load loan details", "error");
    }
  };

  const loadSchedule = async (loanId) => {
    setScheduleLoading(true);
    try {
      const data = await apiFetch(`/api/loans/${loanId}/schedule`);
      setSchedule(data || []);
    } catch (e) {
      addNotification(e.message || "Failed to load repayment schedule", "error");
      setSchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const loadPaymentHistory = async (loanId) => {
    setHistoryLoading(true);
    try {
      const data = await apiFetch(`/api/loans/${loanId}/payments`);
      setPaymentHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      addNotification(e.message || "Failed to load payment history", "error");
      setPaymentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  useEffect(() => {
    if (selectedLoan?.id) {
      loadLoanDetail(selectedLoan.id);
      loadSchedule(selectedLoan.id);
      loadPaymentHistory(selectedLoan.id);
    }
  }, [selectedLoan?.id]);

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" });
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "paid")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-50 text-brand-700 border border-brand-100">{status}</span>;
    if (s === "disbursed" || s === "approved")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-100">{status}</span>;
    if (s === "overdue")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-100">{status}</span>;
    if (s === "pending")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-100">{status}</span>;
    if (s === "rejected")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-50 text-slate-600 border border-slate-100">{status}</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-50 text-slate-700 border border-slate-100">{status}</span>;
  };

  const getInstallmentStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "paid")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-50 text-brand-700 border border-brand-100">{status}</span>;
    if (s === "overdue")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-100">{status}</span>;
    if (s === "pending")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-100">{status}</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-50 text-slate-600 border border-slate-100">{status}</span>;
  };

  const filteredSchedule = useMemo(() => {
    if (!searchQuery || !schedule.length) return schedule;
    const q = searchQuery.toLowerCase();
    return schedule.filter(inst =>
      String(inst.installmentNumber || "").includes(q) ||
      formatDate(inst.dueDate).toLowerCase().includes(q) ||
      (inst.status || "").toLowerCase().includes(q)
    );
  }, [schedule, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery || !paymentHistory.length) return paymentHistory;
    const q = searchQuery.toLowerCase();
    return paymentHistory.filter(p =>
      (p.reference || p.id || "").toLowerCase().includes(q) ||
      (p.status || "").toLowerCase().includes(q)
    );
  }, [paymentHistory, searchQuery]);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Loan Statement</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Detailed loan breakdown with complete repayment schedule
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Select Loan</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{isAdmin ? "All member loans" : "Your loans"}</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-full px-5 py-3.5 border-b border-slate-100 animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 rounded-lg w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded-lg w-1/2"></div>
                  </div>
                ))
              ) : loans.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No loans found.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {loans.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLoan(l)}
                      className={`w-full text-left px-5 py-3.5 transition hover:bg-slate-50 cursor-pointer ${
                         selectedLoan?.id === l.id ? "bg-brand-50 border-l-4 border-brand-600" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {l.memberName || "Member"}
                        </span>
                        {getStatusBadge(l.status)}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {l.termMonths} months @ {l.interestRate ?? 5}%
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 font-mono">
                          {rwf(l.amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          {selectedLoan ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedLoan.memberName || "Member Loan"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Loan ID: {selectedLoan.id}
                    </p>
                  </div>
                  {getStatusBadge(selectedLoan.status)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Principal</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono mt-1 block">{rwf(selectedLoan.amount)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Interest Rate</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono mt-1 block">{selectedLoan.interestRate ?? 5}%</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Term</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono mt-1 block">{selectedLoan.termMonths} Months</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Payable</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono mt-1 block">
                      {rwf(selectedLoan.totalRepayment || (selectedLoan.amount + (selectedLoan.totalInterest || 0)))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-brand-50 rounded-xl border border-brand-100">
                    <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">Total Paid</span>
                    <span className="text-sm font-extrabold text-brand-800 font-mono mt-1 block">
                      {rwf(selectedLoan.totalPaid || selectedLoan.amountPaid || 0)}
                    </span>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                    <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Principal Paid</span>
                    <span className="text-sm font-extrabold text-sky-800 font-mono mt-1 block">
                      {rwf(selectedLoan.principalPaid || 0)}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Interest Paid</span>
                    <span className="text-sm font-extrabold text-amber-800 font-mono mt-1 block">
                      {rwf(selectedLoan.interestPaid || 0)}
                    </span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Outstanding</span>
                    <span className="text-sm font-extrabold text-rose-800 font-mono mt-1 block">
                      {rwf(selectedLoan.balance || selectedLoan.outstandingBalance || 0)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Disbursement Date</span>
                    <span className="text-xs font-semibold text-slate-700 mt-1 block">
                      {formatDate(selectedLoan.disbursementDate)}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Due Date</span>
                    <span className="text-xs font-semibold text-slate-700 mt-1 block">
                      {formatDate(selectedLoan.dueDate)}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Request Date</span>
                    <span className="text-xs font-semibold text-slate-700 mt-1 block">
                      {formatDate(selectedLoan.requestDate)}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Penalties</span>
                    <span className="text-xs font-semibold text-rose-700 mt-1 block">
                      {rwf(selectedLoan.penalties || selectedLoan.penaltyAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Repayment Schedule</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {schedule.length} installments
                    </p>
                  </div>
                  {scheduleLoading && (
                    <div className="flex items-center gap-1.5">
                      <LoadingSpinner size="sm" />
                      <span className="text-[10px] text-slate-400 font-medium">Loading schedule...</span>
                    </div>
                  )}
                </div>
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search schedule..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                 <div className="overflow-x-auto">
                   {scheduleLoading ? (
                     <table className="min-w-full divide-y divide-slate-200">
                        <thead>
                          <tr className="bg-brand-700 dark:bg-slate-800">
                            {["#", "Due Date", "Principal", "Interest", "Total", "Paid", "Remaining", "Status"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200"><div className="h-3 bg-white/20 rounded-lg w-3/4"></div></th>
                            ))}
                          </tr>
                        </thead>
                       <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                         {Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}
                       </tbody>
                     </table>
                   ) : schedule.length === 0 ? (
                    <div className="py-16 text-center">
                      <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500 mt-3">No repayment schedule generated yet</p>
                      <p className="text-[10px] text-slate-400 mt-1">Schedule is created when the loan is disbursed</p>
                    </div>
                  ) : (
                     <table className="min-w-full divide-y divide-slate-200">
                       <thead>
                         <tr className="bg-brand-700 dark:bg-slate-800">
                           <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">#</th>
                           <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Due Date</th>
                           <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Principal</th>
                           <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Interest</th>
                           <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Total</th>
                           <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Paid</th>
                           <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Remaining</th>
                           <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Status</th>
                         </tr>
                       </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {filteredSchedule.map((inst, idx) => (
                          <tr key={inst.installmentId || idx} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 text-xs font-bold text-slate-500">
                              {inst.installmentNumber || idx + 1}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">
                              {formatDate(inst.dueDate)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono text-slate-700 whitespace-nowrap">
                              {rwf(inst.principalAmount || 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono text-amber-700 whitespace-nowrap">
                              {rwf(inst.interestAmount || 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                              {rwf(inst.totalAmount || inst.amountDue || 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono text-brand-700 whitespace-nowrap">
                              {rwf(inst.paidAmount || inst.approvedPaidAmount || 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono font-bold text-rose-700 whitespace-nowrap">
                              {rwf((inst.totalAmount || inst.amountDue || 0) - (inst.paidAmount || inst.approvedPaidAmount || 0))}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {getInstallmentStatusBadge(inst.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Payment History</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {paymentHistory.length} payments recorded
                    </p>
                  </div>
                  {historyLoading && (
                    <div className="flex items-center gap-1.5">
                      <LoadingSpinner size="sm" />
                      <span className="text-[10px] text-slate-400 font-medium">Loading history...</span>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  {historyLoading ? (
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {["Date", "Reference", "Amount", "Status"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500"><div className="h-3 bg-slate-200 rounded-lg w-3/4"></div></th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={4} />)}
                      </tbody>
                    </table>
                  ) : paymentHistory.length === 0 ? (
                    <div className="py-16 text-center">
                      <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500 mt-3">No payment history yet</p>
                    </div>
                  ) : (
                     <table className="min-w-full divide-y divide-slate-200">
                       <thead>
                         <tr className="bg-brand-700 dark:bg-slate-800">
                           <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Date</th>
                           <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Reference</th>
                           <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Amount</th>
                           <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Status</th>
                         </tr>
                       </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {filteredPayments.map((p, idx) => (
                          <tr key={p._id || p.id || idx} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">
                              {formatDate(p.paymentDate || p.date || p.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-500">
                              {p.reference || p._id || p.id || "-"}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                              <CurrencyDisplay value={p.amount} />
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <StatusBadge status={p.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 mt-4">
                {isAdmin ? "Select a Loan" : "Your Loans"}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {isAdmin
                  ? "Choose a loan from the list to view its amortization schedule and financial details."
                  : "You do not have any active loans to display."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
