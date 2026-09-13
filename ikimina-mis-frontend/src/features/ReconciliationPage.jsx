import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Lock,
  AlertCircle,
  CheckCircle,
  ArrowLeftRight,
  RefreshCw,
  FileSpreadsheet,
  Eye
} from "lucide-react";
import CurrencyDisplay from "../components/CurrencyDisplay";
import { SkeletonCard, SkeletonTableRow } from "../components/Skeleton";

export default function ReconciliationPage() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState({ loans: "", contributions: "", shares: "" });
  const [activeTab, setActiveTab] = useState("loans");

  const [loanData, setLoanData] = useState([]);
  const [contributionData, setContributionData] = useState([]);
  const [sharesData, setSharesData] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);

  const isAdmin = user?.role === "admin";
  const canAccess = isAdmin || hasPermission("view_all_roles");

  const loadLoanCheck = async () => {
    try {
      const data = await apiFetch("/api/ledger/reconciliation/loans");
      setLoanData(Array.isArray(data) ? data : []);
      setError(prev => ({ ...prev, loans: "" }));
    } catch (e) {
      setError(prev => ({ ...prev, loans: e.message || "Failed to load loan check" }));
      setLoanData([]);
    }
  };

  const loadContributionCheck = async () => {
    try {
      const data = await apiFetch("/api/ledger/reconciliation/contributions");
      setContributionData(Array.isArray(data) ? data : []);
      setError(prev => ({ ...prev, contributions: "" }));
    } catch (e) {
      setError(prev => ({ ...prev, contributions: e.message || "Failed to load contributions check" }));
      setContributionData([]);
    }
  };

  const loadSharesCheck = async () => {
    try {
      const data = await apiFetch("/api/ledger/reconciliation/shares");
      setSharesData(Array.isArray(data) ? data : []);
      setError(prev => ({ ...prev, shares: "" }));
    } catch (e) {
      setError(prev => ({ ...prev, shares: e.message || "Failed to load shares check" }));
      setSharesData([]);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    if (activeTab === "loans") await loadLoanCheck();
    if (activeTab === "contributions") await loadContributionCheck();
    if (activeTab === "shares") await loadSharesCheck();
    setLoading(false);
  };

  useEffect(() => {
    if (!canAccess) return;
    refreshData();
  }, [activeTab, canAccess]);

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const getMatchBadge = (matched) => {
    if (matched === true || matched === "matched" || matched === "balanced")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-brand-50 text-brand-700 border border-brand-100">
          <CheckCircle className="w-3 h-3" />
          Balanced
        </span>
      );
    if (matched === false || matched === "mismatch" || matched === "requires_review")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-100">
          <AlertCircle className="w-3 h-3" />
          Review
        </span>
      );
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">-</span>;
  };

  const currentData = activeTab === "loans" ? loanData : activeTab === "contributions" ? contributionData : sharesData;
  const currentColumns = activeTab === "loans" ? [
    { key: "loanId", label: "Loan ID" },
    { key: "memberName", label: "Member" },
    { key: "ledgerTotal", label: "Ledger Total", align: "right", render: (v) => <CurrencyDisplay value={v} /> },
    { key: "loanTotal", label: "Loan Total", align: "right", render: (v) => <CurrencyDisplay value={v} /> },
    { key: "difference", label: "Difference", align: "right", render: (v) => <span className="font-bold">{Math.abs(v) < 0.01 ? <span className="text-brand-700">0</span> : <span className="text-rose-700"><CurrencyDisplay value={v} /></span>}</span> },
    { key: "matched", label: "Status", align: "center", render: (v) => getMatchBadge(v) },
  ] : activeTab === "contributions" ? [
    { key: "period", label: "Period" },
    { key: "ledgerTotal", label: "Ledger Total", align: "right", render: (v) => <CurrencyDisplay value={v} /> },
    { key: "contributionsTotal", label: "Contributions Total", align: "right", render: (v) => <CurrencyDisplay value={v} /> },
    { key: "difference", label: "Difference", align: "right", render: (v) => <span className="font-bold">{Math.abs(v) < 0.01 ? <span className="text-brand-700">0</span> : <span className="text-rose-700"><CurrencyDisplay value={v} /></span>}</span> },
    { key: "matched", label: "Status", align: "center", render: (v) => getMatchBadge(v) },
  ] : [
    { key: "memberName", label: "Member" },
    { key: "ledgerTotal", label: "Ledger Total", align: "right", render: (v) => <CurrencyDisplay value={v} /> },
    { key: "sharesTotal", label: "Shares Total", align: "right", render: (v) => <CurrencyDisplay value={v} /> },
    { key: "difference", label: "Difference", align: "right", render: (v) => <span className="font-bold">{Math.abs(v) < 0.01 ? <span className="text-brand-700">0</span> : <span className="text-rose-700"><CurrencyDisplay value={v} /></span>}</span> },
    { key: "matched", label: "Status", align: "center", render: (v) => getMatchBadge(v) },
  ];

  const filteredData = useMemo(() => {
    if (!searchQuery || !currentData.length) return currentData;
    const q = searchQuery.toLowerCase();
    return currentData.filter(row =>
      Object.values(row).some(val =>
        String(val || "").toLowerCase().includes(q)
      )
    );
  }, [currentData, searchQuery]);

  const summary = useMemo(() => {
    const total = filteredData.length;
    const balanced = filteredData.filter(r => r.matched === true || r.matched === "matched" || r.matched === "balanced").length;
    const mismatched = total - balanced;
    return { total, balanced, mismatched };
  }, [filteredData]);

  if (!canAccess) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <Lock className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-extrabold text-slate-900">Access Restricted</h3>
           <p className="text-xs text-slate-500 font-medium">
             This page is for administrators only.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
             <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Records Check</h2>
             <p className="text-xs text-slate-500 font-medium">Compare system totals against module records</p>
            </div>
          </div>
          <button
            onClick={refreshData}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {(activeTab === "loans" && error.loans) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium">
          {error.loans}
        </div>
      )}
      {(activeTab === "contributions" && error.contributions) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium">
          {error.contributions}
        </div>
      )}
      {(activeTab === "shares" && error.shares) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium">
          {error.shares}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Records</p>
              <p className="text-xl font-extrabold text-slate-900 font-mono">{summary.total}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-brand-200 shadow-sm">
              <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-1">Balanced</p>
              <p className="text-xl font-extrabold text-brand-700 font-mono">{summary.balanced}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Mismatched</p>
              <p className="text-xl font-extrabold text-amber-700 font-mono">{summary.mismatched}</p>
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Search</span>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
           placeholder="Search records..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm inline-flex">
        <button
          onClick={() => setActiveTab("loans")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "loans" ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Loans
        </button>
        <button
          onClick={() => setActiveTab("contributions")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "contributions" ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Contributions
        </button>
        <button
          onClick={() => setActiveTab("shares")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "shares" ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Shares
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {currentColumns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <div className="h-3 bg-slate-200 rounded-lg w-3/4"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {currentColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 bg-slate-200 rounded-lg w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-200">
               <thead>
                 <tr className="bg-brand-700 dark:bg-slate-800">
                   {currentColumns.map((col) => (
                     <th
                       key={col.key}
                       className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                     >
                       {col.label}
                     </th>
                   ))}
                 </tr>
               </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredData.map((row, idx) => (
                  <tr key={row._id || row.id || idx} onClick={() => setSelectedRow(row)} className="hover:bg-slate-50 transition cursor-pointer">
                    {currentColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                      >
                        {col.render ? col.render(row[col.key], row, rwf) : (
                          <span className="text-xs">{row[col.key] || "-"}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedRow(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold text-slate-900">Record Details</h3>
              <button onClick={() => setSelectedRow(null)} className="text-slate-400 hover:text-slate-600"><Eye className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {currentColumns.map(col => (
                <div key={col.key} className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">{col.label}</span>
                  <span className="font-bold text-sm">{col.render ? col.render(selectedRow[col.key], selectedRow, rwf) : (selectedRow[col.key] || "-")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
