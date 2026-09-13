import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  UserPlus,
  Shield,
  FileText,
  Lock,
  Power,
  PowerOff,
  Briefcase,
  AlertCircle,
  FileCheck2,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Clock,
  ChevronRight,
  MoreVertical,
  Mail,
  Phone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ConfirmDialog from "../components/ConfirmDialog";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

export default function MembersModule() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [members, setMembers] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, roles: {} });
  const itemsPerPage = 8;

  const [activeDialog, setActiveDialog] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loadingMemberId, setLoadingMemberId] = useState(null);

  const [newMemberForm, setNewMemberForm] = useState({ fullName: "", email: "", phone: "", nationalId: "", role: "member" });
  const [reassignRole, setReassignRole] = useState("member");
  const [resetPassCode, setResetPassCode] = useState("");
  const [resetPassError, setResetPassError] = useState("");
  const [uploadedDocType, setUploadedDocType] = useState("id");
  const [createMemberError, setCreateMemberError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const q = `/api/members?search=${searchQuery}&role=${selectedRole}&limit=100`;
      const payload = await apiFetch(q);
      const list = Array.isArray(payload)
        ? payload
        : (payload && Array.isArray(payload.data) ? payload.data : []);
      const normalized = list.map(m => ({ ...m, id: m._id || m.id }));
      setMembers(normalized);

      const pend = await apiFetch("/api/members/pending");
      const pending = Array.isArray(pend) ? pend.map(p => ({ ...p, id: p._id || p.id })) : [];
      setPendingApprovals(pending);

      const total = payload && typeof payload.total === 'number' ? payload.total : normalized.length;
      const active = normalized.filter(m => m.isActive !== false).length;
      const roleCounts = {};
      normalized.forEach(m => {
        const r = m.role || 'member';
        roleCounts[r] = (roleCounts[r] || 0) + 1;
      });

      setStats({
        total,
        active,
        pending: pending.length,
        roles: roleCounts
      });
    } catch (e) {
      addNotification(e.message || "Failed to load members", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole]);

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedRole]);

  const handleApprove = async (item) => {
    try {
      setLoadingMemberId(item.id);
      await apiFetch(`/api/members/${item.id}/approve`, { method: "PUT" });
      addNotification(`${item.fullName} approved successfully`, "success");
      loadData();
    } catch (e) {
      addNotification(e.message || `Failed to approve ${item.fullName}`, "error");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const toggleMembership = async (member) => {
    try {
      setLoadingMemberId(member.id);
      await apiFetch(`/api/members/${member.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      loadData();
    } catch (e) {
      addNotification(e.message || "Failed to update member status", "error");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const executeCreation = async (e) => {
    e.preventDefault();
    setCreateMemberError("");
    try {
      await apiFetch("/api/members", {
        method: "POST",
        body: JSON.stringify(newMemberForm),
      });
      setActiveDialog(null);
      setNewMemberForm({ fullName: "", email: "", phone: "", nationalId: "", role: "member" });
      loadData();
    } catch (e) {
      setCreateMemberError(e.message || "Failed to create member");
      addNotification(e.message || "Failed to create member", "error");
    }
  };

  const executeRoleReassignment = async (e) => {
    e.preventDefault();
    try {
      setLoadingMemberId(selectedMember.id);
      await apiFetch("/api/roles/assign", {
        method: "POST",
        body: JSON.stringify({ memberId: selectedMember.id, role: reassignRole }),
      });
      setActiveDialog(null);
      loadData();
    } catch (e) {
      addNotification(e.message || "Failed to reassign role", "error");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const executeResetPassword = async (e) => {
    e.preventDefault();
    setResetPassError("");
    if (!resetPassCode || resetPassCode.length < 6) {
      setResetPassError("Password must be at least 6 characters");
      return;
    }
    try {
      setLoadingMemberId(selectedMember.id);
      await apiFetch(`/api/members/${selectedMember.id}/reset-password`, {
        method: "PUT",
        body: JSON.stringify({ newPassword: resetPassCode }),
      });
      setActiveDialog(null);
      setResetPassCode("");
    } catch (e) {
      setResetPassError(e.message || "Failed to reset password");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const executeUploadDocument = async (e) => {
    e.preventDefault();
    try {
      setLoadingMemberId(selectedMember.id);
      await apiFetch(`/api/members/${selectedMember.id}/documents`, {
        method: "POST",
        body: JSON.stringify({ documentType: uploadedDocType }),
      });
      setActiveDialog(null);
      loadData();
    } catch (e) {
      addNotification(e.message || "Failed to upload document", "error");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, data: null, config: null, loading: false });

  const totalItems = members.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedMembers = members.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDeleteMember = async (member) => {
    try {
      setLoadingMemberId(member.id);
      await apiFetch(`/api/members/${member.id}`, { method: "DELETE" });
      addNotification(`${member.fullName} removed`, "success");
      loadData();
    } catch (e) {
      addNotification(e.message || "Failed to remove member", "error");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'president': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'treasurer': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'member': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Members</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Manage your cooperative members and approvals</p>
        </div>
        {hasPermission("approve_member") && (
          <button
            onClick={() => { setActiveDialog("create"); setCreateMemberError(""); }}
            className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        )}
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 animate-shimmer"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-16 bg-slate-100 rounded animate-shimmer"></div>
                  <div className="h-4 w-10 bg-slate-100 rounded animate-shimmer"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          [
            { label: "Total Members", value: stats.total, icon: Users, color: "brand", bg: "bg-blue-50 border-blue-100" },
            { label: "Active", value: stats.active, icon: UserCheck, color: "emerald", bg: "bg-emerald-50 border-emerald-100" },
            { label: "Pending Approval", value: stats.pending, icon: Clock, color: "amber", bg: "bg-amber-50 border-amber-100" },
            { label: "Suspended", value: stats.total - stats.active, icon: UserX, color: "rose", bg: "bg-rose-50 border-rose-100" }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-xl border ${stat.bg} flex items-center gap-3`}
              >
                <div className={`p-2 rounded-lg bg-white border border-slate-100 shadow-xs`}>
                  <Icon className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-lg font-extrabold text-slate-900 font-mono leading-none mt-0.5">{stat.value}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
          >
            <option value="">All Roles</option>
            <option value="member">Members</option>
            <option value="treasurer">Treasurers</option>
            <option value="president">Presidents</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Members Table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Members Directory</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{totalItems} members found</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0">
                    <div className="w-9 h-9 rounded-full bg-slate-100 animate-shimmer shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-slate-100 rounded animate-shimmer"></div>
                      <div className="h-2.5 w-48 bg-slate-100 rounded animate-shimmer"></div>
                    </div>
                    <div className="h-6 w-16 bg-slate-100 rounded-lg animate-shimmer"></div>
                    <div className="h-6 w-20 bg-slate-100 rounded-lg animate-shimmer"></div>
                    <div className="flex gap-1.5">
                      <div className="h-8 w-8 bg-slate-100 rounded-lg animate-shimmer"></div>
                      <div className="h-8 w-8 bg-slate-100 rounded-lg animate-shimmer"></div>
                      <div className="h-8 w-8 bg-slate-100 rounded-lg animate-shimmer"></div>
                      <div className="h-8 w-8 bg-slate-100 rounded-lg animate-shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="py-16 px-4">
                <EmptyState title="No members found" description="Add your first member to get started." />
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {paginatedMembers.map((m, idx) => (
                      <motion.tr
                        key={m._id || m.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 font-bold text-sm flex items-center justify-center border border-brand-100">
                              {(m.fullName || m.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 text-sm block leading-tight truncate max-w-[180px]">{m.fullName || m.email || 'Unknown'}</span>
                              <span className="text-[10px] text-slate-400 font-mono truncate block">{m.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{m.nationalId}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getRoleColor(m.role)}`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => toggleMembership(m)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                              m.isActive === false
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${m.isActive === false ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                            {m.isActive === false ? 'Suspended' : 'Active'}
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            {user.role === "admin" && (
                              <button
                                type="button"
                                onClick={() => { setSelectedMember(m); setReassignRole(m.role); setActiveDialog("role"); }}
                                disabled={loadingMemberId === m.id}
                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Change Role"
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission("approve_member") && (
                              <button
                                type="button"
                                onClick={() => { setSelectedMember(m); setActiveDialog("documents"); }}
                                disabled={loadingMemberId === m.id}
                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Documents"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            {user.role === "admin" && (
                              <button
                                type="button"
                                onClick={() => { setSelectedMember(m); setActiveDialog("password"); }}
                                disabled={loadingMemberId === m.id}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reset Password"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission("approve_member") && m.id !== user.id && (
                              <button
                                type="button"
                                onClick={() => toggleMembership(m)}
                                disabled={loadingMemberId === m.id}
                                className={`p-1.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${m.isActive ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-brand-500 hover:bg-brand-50"}`}
                                title={m.isActive ? "Suspend" : "Activate"}
                              >
                                {m.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                              </button>
                            )}
                            {user.role === "admin" && m.id !== user.id && (
                              <button
                                type="button"
                                onClick={() => setConfirmDialog({
                                  isOpen: true,
                                  action: "delete",
                                  data: { member: m },
                                  config: {
                                    title: "Remove member?",
                                    message: `${m.fullName} will be removed permanently.`,
                                    confirmText: "Remove",
                                    cancelText: "Keep",
                                    type: "danger"
                                  }
                                })}
                                disabled={loadingMemberId === m.id}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
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
        </motion.div>

        {/* Pending Approvals */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Pending Approvals</h4>
                <p className="text-[10px] text-slate-400">{pendingApprovals.length} waiting</p>
              </div>
            </div>
            {pendingApprovals.length > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {pendingApprovals.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px] p-4 space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="py-16 text-center">
                <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs text-slate-400 font-medium">All caught up!</p>
                <p className="text-[10px] text-slate-400 mt-1">No pending approvals</p>
              </div>
            ) : (
              pendingApprovals.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-brand-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 font-bold text-sm flex items-center justify-center border border-amber-100 shrink-0">
                      {(item.fullName || item.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm leading-tight truncate">{item.fullName || item.email || 'Unknown'}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Mail className="w-3 h-3" />
                            {item.email || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-3 h-3" />
                            {item.phone || '-'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          ID: {item.nationalId || item.national_id || '-'}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pending
                        </span>
                      </div>
                    </div>
                  </div>
                  {hasPermission("approve_member") && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={loadingMemberId === item.id}
                        className="flex-1 py-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loadingMemberId === item.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        {loadingMemberId === item.id ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* POPUP MODALS */}
      {activeDialog === "create" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={executeCreation}
            className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Add Member</h3>
              <p className="text-xs text-slate-400 mt-0.5">Register a new member to the cooperative</p>
            </div>
            {createMemberError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3">
                {createMemberError}
              </div>
            )}
            <div className="space-y-3">
              {[
                { label: "Full Name", key: "fullName", type: "text", placeholder: "Enter full name" },
                { label: "Email", key: "email", type: "email", placeholder: "Enter email address" },
                { label: "National ID (16 digits)", key: "nationalId", type: "text", placeholder: "Enter 16-digit ID", maxLength: 16 },
                { label: "Phone", key: "phone", type: "text", placeholder: "Enter phone number" },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-slate-600 text-xs font-semibold">{field.label}</label>
                  <input
                    required
                    type={field.type}
                    value={newMemberForm[field.key]}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-slate-600 text-xs font-semibold">Role</label>
                <select
                  value={newMemberForm.role}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
                >
                  <option value="member">Member</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="president">President</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-sm transition">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-semibold text-sm transition">
                Add Member
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {activeDialog === "role" && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={executeRoleReassignment}
            className="bg-white max-w-sm w-full rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Change Role</h3>
              <p className="text-xs text-slate-400 mt-0.5">Update role for {selectedMember.fullName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">Role</label>
              <select
                value={reassignRole}
                onChange={(e) => setReassignRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
              >
                <option value="member">Member</option>
                <option value="treasurer">Treasurer</option>
                <option value="president">President</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-sm transition">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-semibold text-sm transition">
                Save
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {activeDialog === "password" && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={executeResetPassword}
            className="bg-white max-w-sm w-full rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Reset Password</h3>
              <p className="text-xs text-slate-400 mt-0.5">Set new password for {selectedMember.fullName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-slate-600 text-xs font-semibold">New Password</label>
              <input
                required
                type="password"
                value={resetPassCode}
                onChange={(e) => setResetPassCode(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
              />
              {resetPassError && <p className="text-xs text-rose-600 mt-1 font-medium">{resetPassError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-sm transition">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition">
                Update Password
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {activeDialog === "documents" && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={executeUploadDocument}
            className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5"
          >
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Documents</h3>
              <p className="text-xs text-slate-400 mt-0.5">Manage documents for {selectedMember.fullName}</p>
            </div>
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Uploaded Documents</h5>
              {(!selectedMember.documents || selectedMember.documents.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {selectedMember.documents.map((d) => (
                    <div key={d.id} className="p-3 bg-brand-50 border border-brand-100/50 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-brand-600 shrink-0" />
                        <div>
                          <p className="font-bold text-brand-900 uppercase leading-none text-[10px]">{d.documentType}</p>
                          <span className="text-[10px] text-brand-600 font-medium">{d.fileName}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Upload New Document</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 text-[10px] font-bold uppercase">Type</label>
                  <select
                    value={uploadedDocType}
                    onChange={(e) => setUploadedDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="id">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="license">Driver's License</option>
                    <option value="other">Guarantor Form</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 text-[10px] font-bold uppercase">File</label>
                  <input
                    required
                    type="file"
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer pt-2"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-sm transition">
                Close
              </button>
              <button type="submit" className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-semibold text-sm transition">
                Upload
              </button>
            </div>
          </motion.form>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        loading={confirmDialog.loading}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, data: null, config: null, loading: false })}
        onConfirm={async () => {
          if (confirmDialog.action === "delete") {
            setConfirmDialog(prev => ({ ...prev, loading: true }));
            await handleDeleteMember(confirmDialog.data.member);
            setConfirmDialog({ isOpen: false, action: null, data: null, config: null, loading: false });
          }
        }}
        title={confirmDialog.config?.title}
        message={confirmDialog.config?.message}
        confirmText={confirmDialog.config?.confirmText}
        cancelText={confirmDialog.config?.cancelText}
        type={confirmDialog.config?.type}
      />
    </div>
  );
}