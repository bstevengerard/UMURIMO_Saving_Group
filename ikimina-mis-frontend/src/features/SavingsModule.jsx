import React, { useState, useEffect, useRef } from "react";
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
  Calendar
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import CurrencyDisplay from "../components/CurrencyDisplay";
import ConfirmDialog from "../components/ConfirmDialog";
import { SkeletonCard, SkeletonTableRow, SkeletonDropdown } from "../components/Skeleton";
import Pagination from "../components/Pagination";

export default function SavingsModule() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [savings, setSavings] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalSavings: 0, transactionCount: 0, lastTransaction: null });
  const isInitialMount = useRef(true);

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [activeTab, setActiveTab] = useState("logs");
  const [singleForm, setSingleForm] = useState({
    memberId: "",
    amount: "",
    transactionDate: "",
    paymentMethod: "Mobile Money",
    notes: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ memberId: "", amount: "", transactionDate: "", paymentMethod: "Mobile Money", notes: "" });

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, data: null, config: null, loading: false });
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [processingDeleteId, setProcessingDeleteId] = useState(null);

  const loadData = async () => {
    const showLoader = isInitialMount.current;
    if (showLoader) setLoading(true);
    try {
      let q = "/api/savings";
      const params = new URLSearchParams();
      if (filterFrom) params.append("fromDate", filterFrom);
      if (filterTo) params.append("toDate", filterTo);
      if (user.role === "member") {
        params.append("memberId", user.id);
      }
      const queryString = params.toString();
      const url = queryString ? `${q}?${queryString}` : q;

      const logs = await apiFetch(url);
      setSavings(Array.isArray(logs) ? logs : []);

      if (user.role === "admin") {
        const mems = await apiFetch("/api/members");
        setMembers(Array.isArray(mems) ? mems.map(m => ({ ...m, id: m._id || m.id })) : []);
      }

      if (user.role === "member") {
        const summaryData = await apiFetch(`/api/savings/summary/${user.id}`).catch(() => null);
        if (summaryData) setSummary(summaryData);
      }
    } catch (e) {
      addNotification(e.message || "Failed to load savings", "error");
    } finally {
      if (showLoader) {
        setLoading(false);
        isInitialMount.current = false;
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [filterFrom, filterTo, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterFrom, filterTo, searchQuery, activeTab]);

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSingle(true);
    try {
      await apiFetch("/api/savings", {
        method: "POST",
        body: JSON.stringify(singleForm),
      });
      addNotification("Savings recorded successfully!", "success");
      setSingleForm({ memberId: "", amount: "", transactionDate: "", paymentMethod: "Mobile Money", notes: "" });
      setActiveTab("logs");
      loadData();
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    } finally {
      setSubmittingSingle(false);
    }
  };

  const handleDeleteSavings = (s) => {
    setProcessingDeleteId(s.id);
    setConfirmDialog({
      isOpen: true,
      action: "deleteSavings",
      data: { savings: s },
      config: {
        title: "Delete Savings Record",
        message: `Delete this savings record of RWF ${s.amount.toLocaleString()}? This will affect the member's financial statement.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger"
      },
      loading: false
    });
  };

  const handleConfirmAction = async () => {
    const { action, data } = confirmDialog;
    setConfirmDialog({ ...confirmDialog, isOpen: false, loading: true });

    try {
      if (action === "deleteSavings") {
        const s = data.savings;
        try {
          await apiFetch(`/api/savings/${s.id}`, { method: "DELETE" });
          addNotification("Savings record deleted", "success");
          loadData();
        } catch (err) {
          addNotification(err.message || "Delete failed", "error");
        }
      }
    } finally {
      setConfirmDialog({ isOpen: false, action: null, data: null, config: null, loading: false });
    }
  };

  const openEditSavings = (s) => {
    setEditingId(s.id);
    setEditForm({
      memberId: s.memberId || "",
      amount: s.amount || "",
      transactionDate: s.transactionDate ? new Date(s.transactionDate).toISOString().split("T")[0] : "",
      paymentMethod: s.paymentMethod || "Mobile Money",
      notes: s.notes || ""
    });
  };

  const handleUpdateSavings = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setSubmittingEdit(true);
    try {
      await apiFetch(`/api/savings/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(editForm)
      });
      addNotification("Savings record updated", "success");
      setEditingId(null);
      loadData();
    } catch (err) {
      addNotification(err.message || "Update failed", "error");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const filteredSavings = savings.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (s.memberName || "").toLowerCase().includes(q) || (s.notes || "").toLowerCase().includes(q);
  });

  const totalItems = filteredSavings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedSavings = filteredSavings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalSavingsAmount = filteredSavings.reduce((acc, s) => acc + (s.amount || 0), 0);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Savings</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Savings transactions and balances</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase leading-none">Total Savings</span>
            <p className="text-sm font-extrabold text-success-700 mt-1 font-mono">
              <CurrencyDisplay value={user.role === "member" ? summary.totalSavings : totalSavingsAmount} />
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm inline-flex">
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "logs" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <TableProperties className="w-4 h-4" />
          History
        </button>
        {hasPermission("manage_contributions") && (
          <button
            onClick={() => setActiveTab("record")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "record" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FilePlus className="w-4 h-4" />
            Record
          </button>
        )}
      </div>

      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by member name or notes..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  placeholder="From"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white font-medium focus:border-brand-500"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  placeholder="To"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white font-medium focus:border-brand-500"
                />
              </div>
            </div>
          </div>

           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="table-header">
                      <th className="table-cell text-[10px] font-semibold uppercase tracking-wider">Member</th>
                      <th className="table-cell text-right text-[10px] font-semibold uppercase tracking-wider">Amount</th>
                      <th className="table-cell text-left text-[10px] font-semibold uppercase tracking-wider">Date</th>
                      <th className="table-cell text-left text-[10px] font-semibold uppercase tracking-wider">Method</th>
                      <th className="table-cell text-left text-[10px] font-semibold uppercase tracking-wider">Notes</th>
                      {hasPermission("manage_contributions") && <th className="table-cell text-center text-[10px] font-semibold uppercase tracking-wider">Action</th>}
                    </tr>
                  </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
                  ) : paginatedSavings.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400 font-medium">No savings records found.</td></tr>
                  ) : (
                    paginatedSavings.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 block leading-tight">{s.memberName}</span>
                          <span className="text-[10px] text-slate-400 font-medium">Recorded by: {s.recordedBy || "Unknown"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CurrencyDisplay value={s.amount} />
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-700">
                          {s.transactionDate ? new Date(s.transactionDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{s.paymentMethod || "Mobile Money"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{s.notes || '-'}</td>
                        {hasPermission("manage_contributions") && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditSavings(s)}
                                disabled={processingDeleteId === s.id}
                                className="px-3 py-1.5 border border-brand-600 text-brand-700 rounded-md text-[11px] font-bold hover:bg-brand-50 transition cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Edit
                              </button>
                               <button
                                  onClick={() => handleDeleteSavings(s)}
                                  disabled={processingDeleteId === s.id}
                                  className="px-3 py-1.5 border border-danger-600 text-danger-600 rounded-md text-[11px] font-bold hover:bg-danger-50 transition cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {processingDeleteId === s.id ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          )}
        </div>
      )}

      {activeTab === "record" && (
        <div className="max-w-xl bg-white border border-slate-200 shadow-sm rounded-xl p-6">
          <form onSubmit={handleSingleSubmit} className="space-y-5 text-sm font-medium">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">Record</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Record a savings payment for a member</p>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Member</label>
              {loading ? <SkeletonDropdown /> : (
              <select required value={singleForm.memberId} onChange={(e) => setSingleForm({ ...singleForm, memberId: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
                <option value="">Select Member...</option>
                {members.filter(m => m.isApproved).map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName} — {m.phone}</option>
                  ))}
                </select>
                )}
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Transaction Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input type="date" required value={singleForm.transactionDate} onChange={(e) => setSingleForm({ ...singleForm, transactionDate: e.target.value })} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white shadow-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Payment Method</label>
                <select value={singleForm.paymentMethod} onChange={(e) => setSingleForm({ ...singleForm, paymentMethod: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash Ledger">Cash</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Savings Amount (RWF)</label>
              <input required type="number" value={singleForm.amount} onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 font-mono font-extrabold text-success-700" />
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Notes (optional)</label>
              <textarea value={singleForm.notes} onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })} placeholder="Optional notes..." className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white" rows={2} />
            </div>

             <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
               <button type="button" onClick={() => setActiveTab("logs")} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer">Cancel</button>
               <button type="submit" disabled={submittingSingle} className="px-6 py-2.5 bg-success-600 hover:bg-success-700 text-white rounded-lg font-bold font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                 {submittingSingle ? "Recording..." : "Record"}
               </button>
             </div>
          </form>
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleUpdateSavings} className="bg-white max-w-sm w-full rounded-xl border border-slate-200 p-6 space-y-4 animate-fade-in text-sm font-medium">
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-2.5">Edit Savings Record</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Amount (RWF)</label>
                <input required type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 font-mono font-extrabold text-success-700" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Transaction Date</label>
                <input type="date" required value={editForm.transactionDate} onChange={(e) => setEditForm({ ...editForm, transactionDate: e.target.value })} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Payment Method</label>
                <select value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white">
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash Ledger">Cash</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Notes</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white" rows={2} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer">Cancel</button>
              <button type="submit" disabled={submittingEdit} className="px-5 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg font-bold font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                {submittingEdit ? "Updating..." : "Update Record"}
              </button>
            </div>
          </form>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, data: null, config: null, loading: false })}
        onConfirm={handleConfirmAction}
        title={confirmDialog.config?.title}
        message={confirmDialog.config?.message}
        confirmText={confirmDialog.config?.confirmText}
        cancelText={confirmDialog.config?.cancelText}
        type={confirmDialog.config?.type}
        loading={confirmDialog.loading}
      />
    </div>
  );
}
