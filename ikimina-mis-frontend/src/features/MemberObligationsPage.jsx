import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Calendar,
  FileText,
  Lock,
  AlertCircle,
  User,
  ArrowRight,
  Eye,
  X
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import CurrencyDisplay from "../components/CurrencyDisplay";
import LoadingSpinner from "../components/LoadingSpinner";

export default function MemberObligationsPage() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [obligations, setObligations] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [error, setError] = useState("");
  const isInitialMount = useRef(true);
  const [filterType, setFilterType] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedObligation, setSelectedObligation] = useState(null);

  const isAdmin = user?.role === "admin";

  const obligationTypes = [
    { value: "", label: "All Types" },
    { value: "contribution", label: "Contribution" },
    { value: "loan_installment", label: "Loan Installment" },
    { value: "emergency_aid", label: "Emergency Aid" },
    { value: "fine", label: "Fine" },
  ];

  const loadMembers = async () => {
    if (!isAdmin) return;
    setMembersLoading(true);
    try {
      const data = await apiFetch("/api/members");
      setMembers(Array.isArray(data) ? data.map(m => ({ ...m, id: m._id || m.id })) : []);
    } catch (e) {
      console.error("Failed to load members", e);
    } finally {
      setMembersLoading(false);
    }
  };

  const loadObligations = async () => {
    const showLoader = isInitialMount.current;
    if (showLoader) setLoading(true);
    setError("");
    try {
      const memberId = isAdmin ? selectedMemberId : user.id;
      if (!memberId) {
        setObligations([]);
        if (showLoader) {
          setLoading(false);
          isInitialMount.current = false;
        }
        return;
      }

      let url = "/api/obligations";
      const params = new URLSearchParams();
      params.append("memberId", memberId);
      if (filterType) params.append("type", filterType);
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const data = await apiFetch(url);
      setObligations(data || []);
    } catch (e) {
      setError(e.message || "Failed to load obligations");
      setObligations([]);
    } finally {
      if (showLoader) {
        setLoading(false);
        isInitialMount.current = false;
      }
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (isAdmin && !selectedMemberId && members.length > 0) {
      setSelectedMemberId(members[0]?.id || "");
      return;
    }
    loadObligations();
  }, [selectedMemberId, filterType, isAdmin]);

  useEffect(() => {
    if (isAdmin && members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0]?.id || "");
    }
  }, [isAdmin, members]);

  const filteredObligations = useMemo(() => {
    if (!searchQuery) return obligations;
    const q = searchQuery.toLowerCase();
    return obligations.filter(o =>
      (o.title || o.description || o.type || "").toLowerCase().includes(q)
    );
  }, [obligations, searchQuery]);

  const summary = useMemo(() => {
    const total = filteredObligations.length;
    const overdue = filteredObligations.filter(o => (o.status || "").toLowerCase() === "overdue").length;
    const pending = filteredObligations.filter(o => (o.status || "").toLowerCase() === "pending").length;
    const totalAmount = filteredObligations.reduce((sum, o) => sum + (o.amount || 0), 0);
    return { total, overdue, pending, totalAmount };
  }, [filteredObligations]);

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s === "completed")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-50 text-brand-700 border border-brand-100">{status}</span>;
    if (s === "pending")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-100">{status}</span>;
    if (s === "overdue")
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-100">{status}</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-50 text-slate-700 border border-slate-100">{status}</span>;
  };

  const getActionButton = (obs) => {
    const status = (obs.status || "").toLowerCase();
    if (status === "paid" || status === "completed") {
      return <span className="text-[10px] text-slate-400 font-medium">No action needed</span>;
    }
    const handlePay = () => {
      addNotification(
        `Payment workflow for "${obs.title || obs.type || 'obligation'}" is not yet connected to a payment module. Contact your administrator.`,
        "info"
      );
    };
    return (
      <button onClick={handlePay} className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-[10px] font-bold transition cursor-pointer">
        Pay Now
      </button>
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">My Obligations</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Everything currently requiring your attention or payment
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Obligations</span>
          <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">{summary.total}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Pending</span>
          <span className="text-xl font-extrabold text-amber-700 font-mono mt-1 block">{summary.pending}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Overdue</span>
          <span className="text-xl font-extrabold text-rose-700 font-mono mt-1 block">{summary.overdue}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Amount</span>
          <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block"><CurrencyDisplay value={summary.totalAmount} /></span>
        </div>
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

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Search</span>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search obligations..."
            className="w-full md:w-80 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {loading && (
           <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
             <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
               <LoadingSpinner size="sm" text="Loading obligations..." />
             </div>
           </div>
        )}
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-brand-700 dark:bg-slate-800">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">What</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Type</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Amount</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Due Date</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Status</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Action</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <LoadingSpinner size="md" text="Loading obligations..." centered />
                  </td>
                </tr>
              ) : filteredObligations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400 font-medium">
                    No obligations found. You are all caught up!
                  </td>
                </tr>
              ) : (
                filteredObligations.map((obs, idx) => (
                  <tr key={obs._id || obs.id || idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-900">
                      {obs.title || obs.description || obs.type || "Obligation"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {obs.type || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono font-bold text-slate-900 whitespace-nowrap">
                      <CurrencyDisplay value={obs.amount || 0} />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">
                      {new Date(obs.due_date || obs.deadline || obs.dueDate).toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {getStatusBadge(obs.status)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {getActionButton(obs)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedObligation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedObligation(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Obligation Details</h3>
              <button onClick={() => setSelectedObligation(null)} className="text-slate-400 hover:text-slate-600"><Eye className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-500">Title</span><span className="font-bold">{selectedObligation.title || selectedObligation.description || selectedObligation.type}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-bold uppercase">{selectedObligation.type}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold"><CurrencyDisplay value={selectedObligation.amount} /></span></div>
              <div className="flex justify-between"><span className="text-slate-500">Due Date</span><span className="font-bold">{new Date(selectedObligation.due_date || selectedObligation.deadline || selectedObligation.dueDate).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={selectedObligation.status} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
