import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import {
  ScrollText,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

export default function AuditLogs() {
  const { apiFetch, user, addNotification } = useApp();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 50;

  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    actorId: ""
  });

  const loadMoreRef = useRef(null);
  const containerRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  const AUDIT_LOG_TIMEOUT = 30000;

  const auditApiFetch = async (endpoint, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUDIT_LOG_TIMEOUT);

    try {
      const result = await apiFetch(endpoint, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.status === 403) {
        addNotification("You do not have permission to view audit logs.", "error");
      } else if (err.name === 'AbortError') {
        addNotification("Audit log request timed out. Please try again.", "error");
      } else {
        addNotification(err.message || "Failed to load audit logs", "error");
      }
      throw err;
    }
  };

  const loadLogs = async (pageNum = 1, showRefresher = false) => {
    if (showRefresher) setLoading(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit)
      });
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.action) params.set("action", filters.action);
      if (filters.actorId) params.set("actorId", filters.actorId);

      const data = await auditApiFetch(`/api/audit-logs/?${params.toString()}`);
      const pageLogs = Array.isArray(data) ? data : [];
      if (pageNum === 1) {
        setLogs(pageLogs);
      } else {
        setLogs(prev => [...prev, ...pageLogs]);
      }
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);
      setPage(data?.page || pageNum);
      setHasMore((data?.page || pageNum) < (data?.totalPages || 1));
    } catch (err) {
      console.error("Audit logs load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadLogs(1);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(entry => entry.isIntersecting) && hasMore && !loading) {
          loadLogs(page + 1);
        }
      },
      { root: containerRef.current || null, rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [isAdmin, hasMore, loading, page]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    if (!isAdmin) return;
    loadLogs(1);
  };

  const clearFilters = () => {
    if (!isAdmin) return;
    setFilters({ entityType: "", action: "", actorId: "" });
    setTimeout(() => loadLogs(1), 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("en-RW", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const formatEntityLabel = (type) => {
    if (!type) return "—";
    const map = {
      contribution: "Contribution",
      loan: "Loan",
      repayment: "Repayment",
      member: "Member",
      meeting: "Meeting",
      sms: "SMS",
      announcement: "Announcement",
      report: "Report",
      role: "Role",
      settings: "Settings",
      share: "Share",
      "emergency-aid": "Emergency Aid",
      LoanRepaymentSchedule: "Repayment Schedule",
      EmergencyAidPayment: "Emergency Aid Payment",
      ShareProfitDistribution: "Share Profit Distribution",
      MemberShare: "Member Share",
      MeetingFine: "Meeting Fine",
      ContributionType: "Contribution Type",
      ReportSnapshot: "Report Snapshot"
    };
    return map[type] || type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getActionDescription = (action, entityType, entityId, changes, previousValues, newValues, actorName) => {
    const entityLabel = formatEntityLabel(entityType);
    const shortId = entityId ? String(entityId).slice(-8) : "";
    const actor = actorName || "System";

    const desc = {
      create_contribution: () => {
        const amount = newValues?.amount || changes?.amount;
        const member = newValues?.memberId || previousValues?.memberId;
        return `${actor} recorded contribution${amount ? ` of ${Number(amount).toLocaleString()} RWF` : ""}${member ? ` for member ${String(member).slice(-8)}` : ""}`;
      },
      update_contribution: () => {
        const amount = newValues?.amount || changes?.amount;
        return `${actor} updated contribution${shortId ? ` ${shortId}` : ""}${amount ? ` — amount: ${Number(amount).toLocaleString()} RWF` : ""}`;
      },
      record_savings: () => {
        const amount = newValues?.amount || changes?.amount;
        const member = newValues?.memberId || previousValues?.memberId;
        return `${actor} recorded savings${amount ? ` of ${Number(amount).toLocaleString()} RWF` : ""}${member ? ` for member ${String(member).slice(-8)}` : ""}`;
      },
      update_savings: () => {
        const before = previousValues?.amount;
        const after = newValues?.amount;
        if (before !== undefined && after !== undefined) {
          return `${actor} updated savings${shortId ? ` ${shortId}` : ""} from ${Number(before).toLocaleString()} RWF to ${Number(after).toLocaleString()} RWF`;
        }
        return `${actor} updated savings${shortId ? ` ${shortId}` : ""}`;
      },
      delete_savings: () => `${actor} deleted savings record ${shortId}`,
      record_repayment: () => {
        const amount = newValues?.paidAmount || changes?.paidAmount;
        return `${actor} recorded repayment${amount ? ` of ${Number(amount).toLocaleString()} RWF` : ""}${shortId ? ` for schedule ${shortId}` : ""}`;
      },
      approve_repayment: () => `${actor} approved repayment for ${entityLabel} ${shortId}`,
      deny_repayment: () => `${actor} denied repayment for ${entityLabel} ${shortId}`,
      create_contribution_type: () => `${actor} created a new contribution type`,
      update_contribution_type: () => `${actor} updated contribution type settings`,
      delete_contribution_type: () => `${actor} removed a contribution type`,
      create_emergency_aid: () => `${actor} created emergency aid request ${shortId}`,
      update_emergency_aid: () => `${actor} updated emergency aid request ${shortId}`,
      delete_emergency_aid: () => `${actor} deleted emergency aid request ${shortId}`,
      close_emergency_aid: () => `${actor} closed emergency aid request ${shortId}`,
      record_emergency_aid_payment: () => {
        const amount = newValues?.amount || changes?.amount;
        return `${actor} recorded emergency aid payment${amount ? ` of ${Number(amount).toLocaleString()} RWF` : ""}${shortId ? ` (${shortId})` : ""}`;
      },
      apply_emergency_aid_fines: () => {
        const count = newValues?.fineCount || changes?.fineCount;
        return `${actor} applied emergency aid fines${count !== undefined ? ` — ${count} fine(s)` : ""}${shortId ? ` to request ${shortId}` : ""}`;
      },
      meeting_fine_applied: () => `${actor} applied meeting fine to member`,
      meeting_fine_waived: () => `${actor} waived meeting fine for member`,
      meeting_fine_paid: () => `${actor} marked meeting fine as paid`,
      bulk_save_attendance: () => {
        const count = newValues?.count || changes?.count;
        return `${actor} saved attendance${count !== undefined ? ` for ${count} member(s)` : ""} for meeting ${shortId}`;
      },
      upsert_member_shares: () => `${actor} updated member share allocation`,
      distribute_share_profit: () => {
        const total = newValues?.totalProfit || changes?.totalProfit;
        const count = newValues?.distributions?.length || changes?.distributions;
        return `${actor} distributed share profit${total !== undefined ? ` — total: ${Number(total).toLocaleString()} RWF` : ""}${count !== undefined ? ` to ${count} member(s)` : ""}`;
      },
      view_snapshot: () => `${actor} viewed report snapshot`,
      finalize_report: () => `${actor} finalized report snapshot`,
      export_pdf: () => `${actor} exported report as PDF`,
      export_xlsx: () => `${actor} exported report as Excel`,
      export_csv: () => `${actor} exported report as CSV`,
      generate_monthly_report: () => `${actor} generated monthly report`,
      export_monthly_pdf: () => `${actor} exported monthly report as PDF`,
      export_monthly_xlsx: () => `${actor} exported monthly report as Excel`,
      export_monthly_csv: () => `${actor} exported monthly report as CSV`,
      create_member: () => `${actor} registered a new member`,
      update_member: () => `${actor} updated member details`,
      delete_member: () => `${actor} removed a member`,
      create_loan: () => `${actor} created loan application ${shortId}`,
      update_loan: () => `${actor} updated loan ${shortId}`,
      delete_loan: () => `${actor} deleted loan ${shortId}`,
      create_announcement: () => `${actor} published an announcement`,
      update_announcement: () => `${actor} updated announcement`,
      delete_announcement: () => `${actor} deleted announcement`,
      send_sms: () => `${actor} sent SMS notification`,
      update_role: () => `${actor} updated role permissions`,
      update_loan_config: () => `${actor} updated loan configuration`,
      register_member: () => `${actor} registered a new member account`,
      login: () => `${actor} logged into the system`,
      switch_login: () => `${actor} switched login session`,
      verify_email: () => `${actor} verified their email address`,
      logout: () => `${actor} logged out of the system`,
      forgot_password: () => `${actor} requested a password reset`,
      reset_password: () => `${actor} reset their password`,
      approve_member: () => `${actor} approved member registration ${shortId}`,
      admin_create_member: () => `${actor} created member account ${shortId}`,
      admin_update_member: () => `${actor} updated member details ${shortId}`,
      admin_reset_member_password: () => `${actor} reset password for member ${shortId}`,
      admin_set_member_status: () => `${actor} changed member status ${shortId}`,
      update_own_profile: () => `${actor} updated their own profile`,
      admin_upload_document: () => `${actor} uploaded document for member ${shortId}`,
      create_meeting: () => `${actor} created meeting ${shortId}`,
      update_meeting: () => `${actor} updated meeting ${shortId}`,
      delete_meeting: () => `${actor} deleted meeting ${shortId}`,
      submit_loan_request: () => `${actor} submitted loan application ${shortId}`,
      update_loan_status: () => `${actor} updated loan status ${shortId}`,
      cancel_loan: () => `${actor} cancelled loan application ${shortId}`,
      create_role: () => `${actor} created role ${shortId}`,
      update_role_permissions: () => `${actor} updated permissions for role ${shortId}`,
      delete_role: () => `${actor} deleted role ${shortId}`,
      assign_role_to_member: () => `${actor} assigned role to member ${shortId}`,
      create_sms_template: () => `${actor} created SMS template`,
      update_sms_template: () => `${actor} updated SMS template`,
      delete_sms_template: () => `${actor} deleted SMS template`,
      broadcast_sms: () => `${actor} broadcasted SMS to members`,
      update_sms_subscription: () => `${actor} updated SMS subscription preferences`,
      update_sms_status: () => `${actor} updated SMS delivery status`,
    };

    if (desc[action]) return desc[action]();

    const fallback = action.replace(/_/g, " ");
    return `${actor} performed ${fallback} on ${entityLabel}${shortId ? ` ${shortId}` : ""}`;
  };

  const renderPagination = () => {
    if (totalPages <= 1 && !hasMore) return null;
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
        <span className="text-[11px] text-slate-500 font-medium">
          Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => loadLogs(page - 1)}
            disabled={page <= 1 || loading}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-[11px] font-bold text-slate-700 px-2">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => loadLogs(page + 1)}
            disabled={page >= totalPages || loading || !hasMore}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
    );
  };

  if (user && user.role !== "admin") {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto">
            <ShieldCheck className="w-6 h-6 select-none" />
          </div>
          <div className="space-y-1">
             <h3 className="font-extrabold text-slate-900 text-base leading-none">Admin Access Required</h3>
             <p className="text-xs text-slate-500 font-medium">This page is for administrators only.</p>
          </div>
          <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase leading-normal pt-2">
             Access logged
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6" ref={containerRef}>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
             <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Activity Log</h2>
             <p className="text-[11px] text-slate-500 font-medium mt-0.5">
               Track all actions in the system
             </p>
          </div>
          <button
            onClick={() => loadLogs(page, true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by entity type..."
              value={filters.entityType}
              onChange={(e) => handleFilterChange("entityType", e.target.value)}
               className="px-2.5 py-1.5 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 bg-white focus:outline-none focus:border-brand-400 w-40"
            />
            <input
              type="text"
              placeholder="Filter by action..."
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
               className="px-2.5 py-1.5 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 bg-white focus:outline-none focus:border-brand-400 w-40"
            />
            <input
              type="text"
              placeholder="Filter by actor..."
              value={filters.actorId}
              onChange={(e) => handleFilterChange("actorId", e.target.value)}
               className="px-2.5 py-1.5 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 bg-white focus:outline-none focus:border-brand-400 w-40"
            />
            <button
              onClick={applyFilters}
               className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-md text-[11px] font-bold hover:bg-brand-500 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 border border-slate-200 rounded-md text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-brand-700 dark:bg-slate-800">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Timestamp</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Actor</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Role</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Action</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Entity</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Recent Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <LoadingSpinner size="md" text="Loading audit trail..." centered />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      No audit log entries found
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => {
                    const description = getActionDescription(log.action, log.entityType, log.entityId, log.changes, log.previousValues, log.newValues, log.actor?.fullName || log.actorRole);
                    return (
                      <tr key={log.id || idx} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-mono">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">
                          {log.actor?.fullName || "—"}
                          {log.actor?.email && (
                            <span className="block text-[9px] text-slate-400 font-normal">{log.actor.email}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
                            {log.actorRole || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                           <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-50 text-brand-800 uppercase tracking-wide">
                            {log.action || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
                            {formatEntityLabel(log.entityType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600" title={description}>
                          {description}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {renderPagination()}
          <div ref={loadMoreRef} className="h-1" />
          {hasMore && (
            <div className="px-4 py-2 text-center">
              {loading && <LoadingSpinner size="sm" text="Loading more..." />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
