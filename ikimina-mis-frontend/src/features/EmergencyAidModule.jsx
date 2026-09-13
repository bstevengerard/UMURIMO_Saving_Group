import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertOctagon,
  FilePlus,
  TableProperties,
  ArrowRight,
  Calendar,
  ShieldAlert,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StatusBadge from "../components/StatusBadge";
import CurrencyDisplay from "../components/CurrencyDisplay";
import ConfirmDialog from "../components/ConfirmDialog";
import { SkeletonTableRow, SkeletonCard } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

export default function EmergencyAidModule() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [aids, setAids] = useState([]);
  const [myObligations, setMyObligations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isInitialMount = useRef(true);
  const [selectedAid, setSelectedAid] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, data: null, config: null, loading: false });
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const [activeTab, setActiveTab] = useState("requirements");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [createForm, setCreateForm] = useState({ title: "", description: "", amount: "", deadline: "" });
  const [paymentForm, setPaymentForm] = useState({ memberId: "", amount: "", paymentMethod: "Mobile Money" });
  const [editingAid, setEditingAid] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", amount: "", deadline: "" });

  const loadData = async () => {
    const showLoader = isInitialMount.current;
    if (showLoader) setLoading(true);
    try {
      const aidsData = await apiFetch("/api/emergency-aid");
      setAids(Array.isArray(aidsData) ? aidsData : []);

      if (user.role === "member") {
        const obligations = await apiFetch("/api/emergency-aid/my-obligations").catch(() => []);
        setMyObligations(Array.isArray(obligations) ? obligations : []);
      }

      if (selectedAid) {
        const paymentsData = await apiFetch(`/api/emergency-aid/${selectedAid.id}/payments`).catch(() => []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      }

      if (user.role === "admin") {
        const mems = await apiFetch("/api/members");
        setMembers(Array.isArray(mems) ? mems.map(m => ({ ...m, id: m._id || m.id })) : []);
      }
    } catch (e) {
      addNotification(e.message || "Failed to load emergency aid data", "error");
    } finally {
      if (showLoader) {
        setLoading(false);
        isInitialMount.current = false;
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedAid]);

  const handleCreateAid = async (e) => {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      await apiFetch("/api/emergency-aid", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      addNotification("Emergency aid requirement created!", "success");
      setCreateForm({ title: "", description: "", amount: "", deadline: "" });
      setActiveTab("requirements");
      loadData();
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedAid) return;
    setSubmittingPayment(true);
    try {
      await apiFetch(`/api/emergency-aid/${selectedAid.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ ...paymentForm, emergencyAidId: selectedAid.id }),
      });
      addNotification("Payment recorded successfully!", "success");
      setPaymentForm({ memberId: "", amount: "", paymentMethod: "Mobile Money" });
      loadData();
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleApplyFines = async () => {
    if (!selectedAid) return;
    setConfirmDialog({
      isOpen: true,
      action: "applyFines",
      data: { aidId: selectedAid.id },
      config: {
        title: "Apply Fines",
        message: "Apply fines to all unpaid members for this emergency aid requirement?",
        confirmText: "Apply Fines",
        cancelText: "Cancel",
        type: "warning"
      }
    });
  };

  const handleCloseAid = async () => {
    if (!selectedAid) return;
    setConfirmDialog({
      isOpen: true,
      action: "closeAid",
      data: { aidId: selectedAid.id },
      config: {
        title: "Close Emergency Aid",
        message: "Close this emergency aid requirement? This will prevent new payments.",
        confirmText: "Close",
        cancelText: "Cancel",
        type: "warning"
      }
    });
  };

  const handleConfirmAction = async () => {
    const { action, data } = confirmDialog;
    setProcessingAction(true);
    setConfirmDialog({ isOpen: false, action: null, data: null, config: null, loading: false });

    try {
      switch (action) {
        case "applyFines":
          await executeApplyFines(data.aidId);
          break;
        case "closeAid":
          await executeCloseAid(data.aidId);
          break;
        case "deleteAid":
          await executeDeleteAid(data.aidId);
          break;
        default:
          break;
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const executeApplyFines = async (aidId) => {
    try {
      const result = await apiFetch(`/api/emergency-aid/${aidId}/apply-fines`, { method: "POST" });
      addNotification(`Fines applied to ${result.results?.length || 0} members`, "success");
      loadData();
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    }
  };

  const executeCloseAid = async (aidId) => {
    try {
      await apiFetch(`/api/emergency-aid/${aidId}/close`, { method: "POST" });
      addNotification("Emergency aid closed", "success");
      setSelectedAid(null);
      loadData();
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    }
  };

  const executeDeleteAid = async (aidId) => {
    try {
      await apiFetch(`/api/emergency-aid/${aidId}`, { method: "DELETE" });
      addNotification("Emergency aid deleted", "success");
      if (selectedAid?.id === aidId) setSelectedAid(null);
      loadData();
    } catch (err) {
      addNotification(err.message || "Delete failed", "error");
    }
  };

  const openEditAid = (aid) => {
    setEditingAid(aid);
    setEditForm({
      title: aid.title || "",
      description: aid.description || "",
      amount: aid.amount || "",
      deadline: aid.deadline ? new Date(aid.deadline).toISOString().split("T")[0] : ""
    });
  };

  const handleUpdateAid = async (e) => {
    e.preventDefault();
    if (!editingAid) return;
    setSubmittingUpdate(true);
    try {
      await apiFetch(`/api/emergency-aid/${editingAid.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm)
      });
      addNotification("Emergency aid updated", "success");
      setEditingAid(null);
      loadData();
    } catch (err) {
      addNotification(err.message || "Update failed", "error");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const handleDeleteAid = async (id) => {
    setConfirmDialog({
      isOpen: true,
      action: "deleteAid",
      data: { aidId: id },
      config: {
        title: "Delete Emergency Aid",
        message: "Delete this emergency aid requirement? This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger"
      }
    });
  };

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const filteredAids = aids.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (a.title || "").toLowerCase().includes(q);
  }).filter((a) => {
    if (!filterMember) return true;
    return a.createdBy?._id === filterMember || a.createdBy?.id === filterMember;
  });

  const totalItems = filteredAids.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedAids = filteredAids.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalAidAmount = aids.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

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
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Emergency Aid</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage emergency aid campaigns and obligations</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase leading-none">Total Required</span>
            <p className="text-sm font-extrabold text-rose-700 mt-1 font-mono">{rwf(totalAidAmount)}</p>
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
          { label: "Active Aid", value: aids.filter(a => a.status === "active").length, icon: ShieldAlert, color: "brand" },
          { label: "Total Required", value: rwf(totalAidAmount), icon: AlertTriangle, color: "rose" },
          { label: "Total Paid", value: rwf(totalPaidAmount), icon: CheckCircle, color: "emerald" },
          { label: "Obligations", value: myObligations.length, icon: Clock, color: "amber" }
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
        <button onClick={() => { setActiveTab("requirements"); setSelectedAid(null); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "requirements" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
          <TableProperties className="w-4 h-4" />
          {user.role === "member" ? "My Obligations" : "Requirements"}
        </button>
        {hasPermission("manage_contributions") && (
          <button onClick={() => setActiveTab("create")} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "create" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
            <FilePlus className="w-4 h-4" />
            Create Requirement
          </button>
        )}
        {hasPermission("manage_contributions") && selectedAid && (
          <button onClick={() => setActiveTab("payments")} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === "payments" ? "bg-white text-slate-800 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
            <Users className="w-4 h-4" />
            Payments
          </button>
        )}
      </motion.div>

      {activeTab === "requirements" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="space-y-4"
        >
          {user.role === "member" ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">My Emergency Aid</h4>
              {myObligations.length === 0 ? (
                <p className="text-sm text-slate-400">No active emergency aid obligations.</p>
              ) : (
                <div className="space-y-3">
                  {myObligations.map((obs) => (
                    <div key={obs.id} className="p-4 rounded-lg border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition">
                      <div>
                        <h5 className="font-bold text-sm text-slate-900">{obs.title}</h5>
                        <p className="text-xs text-slate-500">Deadline: {new Date(obs.deadline).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-sm text-emerald-800"><CurrencyDisplay value={obs.amount} /></p>
                        <StatusBadge status={obs.paymentStatus} type="generic" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search emergency aid..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
                  </div>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      value={filterMember}
                      onChange={(e) => setFilterMember(e.target.value)}
                      className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                    >
                      <option value="">All Creators</option>
                      {members.filter(m => m.isApproved !== false).map((m) => (
                        <option key={m.id} value={m.id}>{m.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0">
                          <div className="w-9 h-9 rounded-full bg-slate-100 animate-shimmer shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-32 bg-slate-100 rounded animate-shimmer"></div>
                            <div className="h-2.5 w-48 bg-slate-100 rounded animate-shimmer"></div>
                          </div>
                          <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                          <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                          <div className="h-6 w-24 bg-slate-100 rounded-lg animate-shimmer"></div>
                          <div className="h-8 w-20 bg-slate-100 rounded-lg animate-shimmer"></div>
                        </div>
                      ))}
                    </div>
                  ) : paginatedAids.length === 0 ? (
                    <div className="py-16 px-4">
                      <EmptyState title="No emergency aid requirements found" description="Create your first emergency aid requirement to get started." />
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title</th>
                          <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deadline</th>
                          <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Created By</th>
                          {hasPermission("manage_contributions") && <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        <AnimatePresence>
                          {paginatedAids.map((a) => (
                            <motion.tr
                              key={a._id || a.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ delay: 0.02 }}
                              className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${selectedAid?.id === a.id ? "bg-brand-50" : ""}`}
                              onClick={() => setSelectedAid(a)}
                            >
                              <td className="px-5 py-3.5">
                                <span className="font-semibold text-slate-900 block leading-tight">{a.title}</span>
                                <span className="text-[10px] text-slate-400">{a.description?.substring(0, 50)}...</span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <CurrencyDisplay value={a.amount} />
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{new Date(a.deadline).toLocaleDateString()}</td>
                              <td className="px-5 py-3.5 text-center">
                                <StatusBadge status={a.status} type="generic" />
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-500">{a.createdBy?.fullName || "System"}</td>
                              {hasPermission("manage_contributions") && (
                                <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => openEditAid(a)} className="px-3 py-1.5 border border-brand-600 text-brand-700 rounded-lg text-[11px] font-bold hover:bg-brand-50 transition">
                                      Edit
                                    </button>
                                    <button onClick={() => handleDeleteAid(a._id || a.id)} className="px-3 py-1.5 border border-rose-600 text-rose-600 rounded-lg text-[11px] font-bold hover:bg-rose-50 transition">
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              )}
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
            </>
          )}
        </motion.div>
      )}

      {activeTab === "create" && hasPermission("manage_contributions") && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="max-w-xl bg-white border border-slate-200 shadow-sm rounded-xl p-6"
        >
          <form onSubmit={handleCreateAid} className="space-y-5 text-sm font-medium">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">New Emergency Aid</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Set up a new emergency aid collection for members</p>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Title</label>
              <input required type="text" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g., Emergency Fund - Q4 2024" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Description</label>
              <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Purpose of this emergency aid..." className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" rows={3} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Amount per Member (RWF)</label>
                <input required type="number" min="0" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono font-bold bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Deadline</label>
                <input required type="date" value={createForm.deadline} onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setActiveTab("requirements")} className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition">Cancel</button>
              <button type="submit" disabled={submittingCreate} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
                {submittingCreate ? "Creating..." : "Create Requirement"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {activeTab === "payments" && hasPermission("manage_contributions") && selectedAid && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Payments</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Required: <CurrencyDisplay value={selectedAid.amount} /> per member</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleApplyFines} disabled={processingAction} className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {processingAction ? "Applying..." : "Apply Fines"}
                </button>
                <button onClick={handleCloseAid} disabled={processingAction} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition border border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {processingAction ? "Closing..." : "Close Requirement"}
                </button>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 mb-6 p-4 bg-brand-50 rounded-xl">
              <h5 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Record Payment</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-600 text-xs font-semibold">Member</label>
                  <select required value={paymentForm.memberId} onChange={(e) => setPaymentForm({ ...paymentForm, memberId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition">
                    <option value="">Select Member...</option>
                    {members.filter(m => m.isApproved).map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600 text-xs font-semibold">Amount (RWF)</label>
                  <input required type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-sm bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600 text-xs font-semibold">Method</label>
                  <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition">
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash Ledger">Cash</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={submittingPayment} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
                {submittingPayment ? "Recording..." : "Record Payment"}
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount Paid</th>
                    <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fine</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400 font-medium">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <motion.tr
                        key={p._id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.02 }}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-900 block">{p.memberId?.fullName || "Unknown"}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <CurrencyDisplay value={p.amount || 0} />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <StatusBadge status={p.paymentStatus} type="generic" />
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-rose-700">{p.fineApplied ? <CurrencyDisplay value={p.fineAmount || 0} /> : "-"}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-amber-700"><CurrencyDisplay value={p.outstandingAmount || 0} /></td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {editingAid && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleUpdateAid}
            className="bg-white max-w-sm w-full rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-2.5">Edit Emergency Aid</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Title</label>
                <input required type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-600 text-xs font-semibold">Amount per Member (RWF)</label>
                  <input required type="number" min="0" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600 text-xs font-semibold">Deadline</label>
                  <input required type="date" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingAid(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition">Cancel</button>
              <button type="submit" disabled={submittingUpdate} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
                {submittingUpdate ? "Updating..." : "Update Requirement"}
              </button>
            </div>
          </motion.form>
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
        loading={confirmDialog.loading || processingAction}
      />
    </div>
  );
}
