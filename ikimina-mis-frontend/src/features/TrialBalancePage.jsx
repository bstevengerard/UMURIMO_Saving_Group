import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Calendar,
  FileSpreadsheet,
  Lock,
  ArrowLeftRight,
  CheckCircle,
  AlertCircle,
  Eye
} from "lucide-react";
import CurrencyDisplay from "../components/CurrencyDisplay";
import { SkeletonCard, SkeletonTableRow } from "../components/Skeleton";

export default function TrialBalancePage() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);

  const isAdmin = user?.role === "admin";
  const canAccess = isAdmin || hasPermission("view_all_roles");

  const loadTrialBalance = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/ledger/trial-balance";
      const params = new URLSearchParams();
      if (filterFrom) params.append("fromDate", filterFrom);
      if (filterTo) params.append("toDate", filterTo);
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const result = await apiFetch(url);
      const accounts = Array.isArray(result?.accounts) ? result.accounts : (Array.isArray(result) ? result : []);
      setData(accounts);
    } catch (e) {
      setError(e.message || "Failed to load trial balance");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) {
      loadTrialBalance();
    }
  }, [filterFrom, filterTo, canAccess]);

  const filteredData = useMemo(() => {
    if (!data.length || !searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(row =>
      (row.account_name || row.name || "").toLowerCase().includes(q) ||
      (row.account_code || row.code || "").toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const totalDebits = filteredData.reduce((sum, row) => sum + (row.debit || 0), 0);
  const totalCredits = filteredData.reduce((sum, row) => sum + (row.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await apiFetch("/api/ledger/trial-balance/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trial-balance-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      addNotification("Export not available", "error");
    } finally {
      setExporting(false);
    }
  };

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
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Balance Check</h2>
               <p className="text-xs text-slate-500 font-medium">Account summary</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={data.length === 0 || exporting}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Period Filter</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium">
          {error}
        </div>
      )}

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isBalanced ? "border-brand-200 bg-brand-50/30" : "border-rose-200 bg-rose-50/30"
      }`}>
        {loading ? (
          <div className="px-6 py-4 flex items-center gap-4">
            <div className="h-5 w-5 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-5 bg-slate-200 rounded-lg w-48"></div>
          </div>
         ) : (
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <CheckCircle className={`w-5 h-5 ${isBalanced ? "text-brand-600" : "text-rose-600"}`} />
               <span className="text-sm font-extrabold text-slate-900">
                 {isBalanced ? "Trial Balance is Balanced" : "Trial Balance is Out of Balance"}
               </span>
             </div>
             <div className="flex items-center gap-4 text-xs font-mono">
               <div>
                 <span className="text-slate-500">Total Debits: </span>
                 <span className="font-bold text-slate-900"><CurrencyDisplay value={totalDebits} /></span>
               </div>
               <div>
                 <span className="text-slate-500">Total Credits: </span>
                 <span className="font-bold text-slate-900"><CurrencyDisplay value={totalCredits} /></span>
               </div>
               {!isBalanced && (
                 <div className="text-rose-600 font-bold">
                   Difference: <CurrencyDisplay value={Math.abs(totalDebits - totalCredits)} />
                 </div>
               )}
             </div>
           </div>
         )}
      </div>

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
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Account Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Account Name</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Debit</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Credit</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Balance</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-400 font-medium">
                     No data for the selected period.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={row._id || row.id || row.account_code || idx} onClick={() => setSelectedAccount(row)} className="hover:bg-slate-50 transition cursor-pointer">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
                      {row.account_code || row.code || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-900">
                      {row.account_name || row.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-rose-700 whitespace-nowrap">
                      {row.debit ? <CurrencyDisplay value={row.debit} /> : "-"}
                    </td>
                     <td className="px-4 py-3 text-right text-xs font-mono text-brand-700 whitespace-nowrap">
                      {row.credit ? <CurrencyDisplay value={row.credit} /> : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                      {row.balance != null ? <CurrencyDisplay value={row.balance} /> : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td colSpan={2} className="px-4 py-3 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Totals
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                    <CurrencyDisplay value={totalDebits} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                    <CurrencyDisplay value={totalCredits} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                    {isBalanced ? "Balanced" : <CurrencyDisplay value={Math.abs(totalDebits - totalCredits)} />}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedAccount(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Account Details</h3>
              <button onClick={() => setSelectedAccount(null)} className="text-slate-400 hover:text-slate-600"><Eye className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-500">Code</span><span className="font-mono font-bold">{selectedAccount.account_code || selectedAccount.code}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-bold">{selectedAccount.account_name || selectedAccount.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Debit</span><span className="font-bold text-rose-700"><CurrencyDisplay value={selectedAccount.debit} /></span></div>
              <div className="flex justify-between"><span className="text-slate-500">Credit</span><span className="font-bold text-brand-700"><CurrencyDisplay value={selectedAccount.credit} /></span></div>
              <div className="flex justify-between"><span className="text-slate-500">Balance</span><span className="font-bold"><CurrencyDisplay value={selectedAccount.balance} /></span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
