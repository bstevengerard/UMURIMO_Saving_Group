import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Calendar,
  FileText,
  Lock,
  ArrowLeftRight,
  BookOpen,
  Eye,
  X,
  Download
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import CurrencyDisplay from "../components/CurrencyDisplay";
import { SkeletonTableRow } from "../components/Skeleton";

export default function GeneralLedgerPage() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("transactions");

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterAccountType, setFilterAccountType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [viewingTransaction, setViewingTransaction] = useState(null);

  const isAdmin = user?.role === "admin";
  const canAccess = isAdmin || hasPermission("view_all_roles");

  const accountTypes = [
    { value: "", label: "All Types" },
    { value: "asset", label: "Asset" },
    { value: "liability", label: "Liability" },
    { value: "equity", label: "Equity" },
    { value: "revenue", label: "Revenue" },
    { value: "expense", label: "Expense" },
  ];

  const sourceModules = [
    { value: "", label: "All Sources" },
    { value: "loan", label: "Loan" },
    { value: "repayment", label: "Repayment" },
    { value: "contribution", label: "Contribution" },
    { value: "savings", label: "Savings" },
    { value: "emergency_aid", label: "Emergency Aid" },
    { value: "share", label: "Shares" },
    { value: "member", label: "Member" },
  ];

  const statuses = [
    { value: "", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "posted", label: "Posted" },
    { value: "reversed", label: "Reversed" },
  ];

  const loadAccounts = async () => {
    try {
      const data = await apiFetch("/api/ledger/accounts");
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      addNotification(e.message || "Failed to load chart of accounts", "error");
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/ledger/transactions";
      const params = new URLSearchParams();
      if (filterFrom) params.append("fromDate", filterFrom);
      if (filterTo) params.append("toDate", filterTo);
      if (filterAccountType) params.append("accountType", filterAccountType);
      if (filterSource) params.append("sourceModule", filterSource);
      if (filterStatus) params.append("status", filterStatus);
      if (searchQuery) params.append("search", searchQuery);
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const data = await apiFetch(url);
      setTransactions(data?.entries || []);
    } catch (e) {
      setError(e.message || "Failed to load ledger transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    loadAccounts();
  }, [canAccess]);

  useEffect(() => {
    if (activeTab === "transactions") {
      loadTransactions();
    }
  }, [activeTab, filterFrom, filterTo, filterAccountType, filterSource, filterStatus, searchQuery]);

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" });
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "posted")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-50 text-brand-700 border border-brand-100">{status}</span>;
    if (s === "draft")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-100">{status}</span>;
    if (s === "reversed")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-100">{status}</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-50 text-slate-700 border border-slate-100">{status}</span>;
  };

  const filteredAccounts = useMemo(() => {
    if (!accounts.length) return [];
    let data = [...accounts];
    if (filterAccountType) {
      data = data.filter(acc => (acc.account_type || acc.accountType) === filterAccountType);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(acc =>
        (acc.name || "").toLowerCase().includes(q) ||
        (acc.code || "").toLowerCase().includes(q)
      );
    }
    return data;
  }, [accounts, filterAccountType, searchQuery]);

  if (!canAccess) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <Lock className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-extrabold text-slate-900">Access Restricted</h3>
           <p className="text-xs text-slate-500 font-medium">
             This page is for administrators only. Please contact your administrator for access.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">General Ledger</h2>
             <p className="text-xs text-slate-500 font-medium">Account records and transactions</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm inline-flex">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "transactions" ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
           Entries
        </button>
        <button
          onClick={() => setActiveTab("accounts")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "accounts" ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Chart of Accounts
        </button>
      </div>

      {activeTab === "transactions" && (
        <>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Type</label>
                <select
                  value={filterAccountType}
                  onChange={(e) => setFilterAccountType(e.target.value)}
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500"
                >
                  {accountTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source Module</label>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500"
                >
                  {sourceModules.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
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

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 placeholder-slate-400"
              />
            </div>
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-slate-200">
                 <thead>
                   <tr className="bg-brand-700 dark:bg-slate-800">
                     <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Date</th>
                     <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Reference</th>
                     <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Account</th>
                     <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Description</th>
                     <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Debit</th>
                     <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Credit</th>
                     <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Source</th>
                     <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                   {loading ? (
                     Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)
                   ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-400 font-medium">
                        No ledger entries found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => (
                      <tr key={tx._id || tx.id || idx} onClick={() => setViewingTransaction(tx)} className="hover:bg-slate-50 transition cursor-pointer">
                        <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">
                          {formatDate(tx.transaction_date || tx.date)}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {tx.reference || tx._id || tx.id || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                          {tx.account?.name || tx.account_name || "-"}
                          {tx.account?.code && (
                            <span className="text-[10px] text-slate-400 font-mono block">{tx.account.code}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate">
                          {tx.description || "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-rose-700 whitespace-nowrap">
                          {tx.debit ? rwf(tx.debit) : "-"}
                        </td>
                         <td className="px-4 py-3 text-right text-xs font-mono text-brand-700 whitespace-nowrap">
                          {tx.credit ? rwf(tx.credit) : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {tx.source_module || tx.sourceModule || "-"}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {getStatusBadge(tx.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "accounts" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search accounts..."
              className="flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 placeholder-slate-400"
            />
          </div>
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-200">
               <thead>
                 <tr className="bg-brand-700 dark:bg-slate-800">
                   <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Code</th>
                   <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Name</th>
                   <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Type</th>
                   <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Category</th>
                   <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Parent</th>
                   <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Status</th>
                 </tr>
               </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400 font-medium">
                      No chart of accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc, idx) => (
                    <tr key={acc._id || acc.id || idx} onClick={() => setSelectedAccount(acc)} className="hover:bg-slate-50 transition cursor-pointer">
                      <td className="px-4 py-3 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
                        {acc.code}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-900">
                        {acc.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {acc.account_type || acc.accountType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {acc.category || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {acc.parent?.name || acc.parent?.code || "-"}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                           acc.is_active ? "bg-brand-50 text-brand-700 border border-brand-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}>
                          {acc.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewingTransaction(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Transaction Details</h3>
              <button onClick={() => setViewingTransaction(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono font-bold">{viewingTransaction.reference || viewingTransaction._id || viewingTransaction.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-bold">{formatDate(viewingTransaction.transaction_date || viewingTransaction.date)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Account</span><span className="font-bold">{viewingTransaction.account?.name || viewingTransaction.account_name || "-"} {viewingTransaction.account?.code && <span className="text-slate-400 font-mono text-xs ml-2">{viewingTransaction.account.code}</span>}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Description</span><span className="font-bold text-right max-w-md">{viewingTransaction.description || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Debit</span><span className="font-bold text-rose-700"><CurrencyDisplay value={viewingTransaction.debit} /></span></div>
              <div className="flex justify-between"><span className="text-slate-500">Credit</span><span className="font-bold text-brand-700"><CurrencyDisplay value={viewingTransaction.credit} /></span></div>
              <div className="flex justify-between"><span className="text-slate-500">Source</span><span className="font-bold uppercase">{viewingTransaction.source_module || viewingTransaction.sourceModule || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={viewingTransaction.status} /></div>
            </div>
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedAccount(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Account Details</h3>
              <button onClick={() => setSelectedAccount(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-500">Code</span><span className="font-mono font-bold">{selectedAccount.code}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-bold">{selectedAccount.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-bold uppercase">{selectedAccount.account_type || selectedAccount.accountType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-bold">{selectedAccount.category || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Parent</span><span className="font-bold">{selectedAccount.parent?.name || selectedAccount.parent?.code || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${selectedAccount.is_active ? "bg-brand-50 text-brand-700" : "bg-rose-50 text-rose-700"}`}>{selectedAccount.is_active ? "Active" : "Inactive"}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
