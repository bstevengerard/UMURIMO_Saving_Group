import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Calendar,
  Download,
  FileText,
  Filter,
  User,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowLeftRight
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import CurrencyDisplay from "../components/CurrencyDisplay";
import LoadingSpinner from "../components/LoadingSpinner";

export default function MemberStatementPage() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [statement, setStatement] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [exporting, setExporting] = useState(false);

  const isAdmin = user?.role === "admin";
  const requestIdRef = useRef(0);

  const transactionTypes = [
    { value: "", label: "All Types" },
    { value: "contribution", label: "Contribution" },
    { value: "savings", label: "Savings" },
    { value: "loan_disbursement", label: "Loan Disbursement" },
    { value: "loan_repayment", label: "Loan Repayment" },
    { value: "interest", label: "Interest" },
    { value: "penalty", label: "Penalty / Fine" },
    { value: "emergency_aid", label: "Emergency Aid" },
    { value: "share_capital", label: "Share Capital" },
    { value: "share_profit_distribution", label: "Share Profit Distribution" },
  ];

  const statuses = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "posted", label: "Posted" },
    { value: "reversed", label: "Reversed" },
  ];

  const loadMembers = async () => {
    if (!isAdmin) return;
    setMembersLoading(true);
    try {
      const data = await apiFetch("/api/members");
      const list = Array.isArray(data) ? data.map(m => ({ ...m, id: m._id || m.id })) : [];
      setMembers(list);
      if (list.length > 0 && !selectedMemberId) {
        setSelectedMemberId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load members", e);
    } finally {
      setMembersLoading(false);
    }
  };

  const loadStatement = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const memberId = isAdmin ? selectedMemberId : user.id;
      if (!memberId) {
        setStatement([]);
        setLoading(false);
        return;
      }

      let url = `/api/ledger/member/${memberId}/statement`;
      const params = new URLSearchParams();
      if (filterFrom) params.append("fromDate", filterFrom);
      if (filterTo) params.append("toDate", filterTo);
      if (filterType) params.append("transactionType", filterType);
      if (filterStatus) params.append("status", filterStatus);
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const payload = await apiFetch(url);
      const entries = payload?.entries || [];
      if (requestId === requestIdRef.current) {
        setStatement(entries);
      }
    } catch (e) {
      if (requestId === requestIdRef.current) {
        setError(e.message || "Failed to load member statement");
        setStatement([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [isAdmin, selectedMemberId, user, filterFrom, filterTo, filterType, filterStatus]);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (!selectedMemberId) {
      setStatement([]);
      setLoading(false);
      return;
    }
    loadStatement();
  }, [selectedMemberId, filterFrom, filterTo, filterType, filterStatus, isAdmin, loadStatement]);

  const summary = useMemo(() => {
    const totalDebits = statement.reduce((sum, tx) => sum + (tx.debit || 0), 0);
    const totalCredits = statement.reduce((sum, tx) => sum + (tx.credit || 0), 0);
    const netBalance = totalCredits - totalDebits;
    return { totalDebits, totalCredits, netBalance, count: statement.length };
  }, [statement]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const memberId = isAdmin ? selectedMemberId : user.id;
      const blob = await apiFetch(`/api/ledger/member/${memberId}/statement/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `member-statement-${memberId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      addNotification("Export not available for this statement", "error");
    } finally {
      setExporting(false);
    }
  };

  const selectedMember = members.find(m => m.id === selectedMemberId) || null;

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Member Financial Statement</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isAdmin ? "View financial history for any member" : "Your complete financial transaction history"}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={statement.length === 0 || exporting}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Exporting..." : "Export Statement"}
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Member</label>
            {membersLoading && <LoadingSpinner size="sm" />}
          </div>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            disabled={membersLoading}
             className="w-full md:w-96 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">{
              membersLoading 
                ? "Loading members..." 
                : members.length === 0 
                  ? "No members available" 
                  : "Choose a member..."
            }</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.fullName} — {m.email}</option>
            ))}
          </select>
          {membersLoading && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
              <LoadingSpinner size="sm" />
              Fetching member list...
            </div>
          )}
        </div>
      )}

      {(selectedMember || loading) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Transactions</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">{summary.count}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-brand-200 shadow-sm">
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">Total Credits</span>
            <span className="text-xl font-extrabold text-brand-700 font-mono mt-1 block"><CurrencyDisplay value={summary.totalCredits} /></span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Total Debits</span>
            <span className="text-xl font-extrabold text-rose-700 font-mono mt-1 block"><CurrencyDisplay value={summary.totalDebits} /></span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Balance</span>
            <span className={`text-xl font-extrabold font-mono mt-1 block ${summary.netBalance >= 0 ? "text-brand-700" : "text-rose-700"}`}>
              <CurrencyDisplay value={summary.netBalance} />
            </span>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transaction Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500"
            >
              {transactionTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500"
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedMember && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-brand-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-brand-900">
              Statement for: {selectedMember.fullName}
            </p>
            <p className="text-[10px] text-brand-700 font-mono">
              ID: {selectedMember.id} &bull; Role: {selectedMember.role}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
              <LoadingSpinner size="sm" text="Loading statement..." />
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-brand-700 dark:bg-slate-800">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Reference</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Description</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Type</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Debit</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Credit</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Amount</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Balance</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Status</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <LoadingSpinner size="md" text="Loading statement..." centered />
                  </td>
                </tr>
              ) : statement.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-400 font-medium">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                statement.map((tx, idx) => (
                  <tr key={tx._id || tx.id || idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">
                      {new Date(tx.transaction_date || tx.date).toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                      {tx.reference || tx._id || tx.id || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 max-w-[250px] truncate">
                      {tx.description || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {tx.transaction_type || tx.type || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-rose-700 whitespace-nowrap">
                      {tx.debit ? <CurrencyDisplay value={tx.debit} /> : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-brand-700 whitespace-nowrap">
                      {tx.credit ? <CurrencyDisplay value={tx.credit} /> : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                      {tx.amount ? <CurrencyDisplay value={tx.amount} /> : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                      {tx.running_balance != null ? <CurrencyDisplay value={tx.running_balance} /> : "-"}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
