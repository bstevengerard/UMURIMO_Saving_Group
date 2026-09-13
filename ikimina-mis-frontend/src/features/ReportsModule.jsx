import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  FileText,
  Download,
  Printer,
  CalendarDays,
  Users,
  PiggyBank,
  AlertOctagon,
  FileCheck2,
  TableProperties,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
  FileType2
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";

export default function ReportsModule() {
  const { apiFetch, user, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState("monthly"); // 'monthly' | 'contributions' | 'loans' | 'attendance' | 'defaulters' | 'activity'
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [archive, setArchive] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Monthly report state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
  ];

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const y = [currentYear, currentYear - 1, currentYear - 2];
    return y;
  }, [currentYear]);

  const fetchArchive = async () => {
    setArchiveLoading(true);
    try {
      const data = await apiFetch("/api/reports/monthly/archive");
      setArchive(Array.isArray(data) ? data : []);
    } catch (e) {
      addNotification(e.message || "Failed to load report archive", "error");
    } finally {
      setArchiveLoading(false);
    }
  };

  const checkMonthlyReport = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/reports/monthly/summary?year=${selectedYear}&month=${selectedMonth}`);
      setMonthlyReport(data);
    } catch (e) {
      setMonthlyReport(null);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyReport = async () => {
    setGenerating(true);
    try {
      const payload = await apiFetch("/api/reports/monthly/generate", {
        method: "POST",
        body: JSON.stringify({ year: selectedYear, month: selectedMonth, forceRegenerate })
      });
      setMonthlyReport(payload);
      addNotification("Monthly report generated successfully", "success");
      setShowGenerateConfirm(false);
      setForceRegenerate(false);
      fetchArchive();
    } catch (e) {
      addNotification(e.message || "Failed to generate report", "error");
    } finally {
      setGenerating(false);
    }
  };

  const exportMonthlyReport = async (format) => {
    setExporting(true);
    setExportFormat(format);
    try {
      const data = await apiFetch(`/api/reports/monthly/export?year=${selectedYear}&month=${selectedMonth}&format=${format}`, {
        responseType: "blob"
      });
      
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `umurimo_monthly_report_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      addNotification(`Report exported as ${format.toUpperCase()}`, "success");
    } catch (e) {
      addNotification(e.message || "Failed to export report", "error");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (activeTab === "monthly") {
      checkMonthlyReport();
      fetchArchive();
    } else {
      fetchReport(activeTab);
    }
  }, [activeTab, selectedYear, selectedMonth]);

  const fetchReport = async (reportType) => {
    setLoading(true);
    try {
      const endpoint = `/api/reports/${reportType}`;
      const payload = await apiFetch(endpoint);
      setReportData(payload);
    } catch (e) {
      addNotification(e.message || "Failed to load report", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "monthly") {
      fetchReport(activeTab);
    }
  }, [activeTab]);

  const triggerCsvSimulation = () => {
    if (!reportData || reportData.length === 0) return;

    let headers = [];
    let rows = [];

    if (activeTab === "contributions") {
      headers = ["Week", "Payments", "Total Savings"];
      rows = reportData.map(row => [
        row.week || "",
        `${row.count} payments`,
        row.totalAmount || 0
      ]);
    } else if (activeTab === "loans") {
      headers = ["Loan ID", "Member", "Amount", "Date", "Status"];
      rows = reportData.map(row => [
        row.id || "",
        row.memberName || "",
        row.amount || 0,
        row.requestDate ? row.requestDate.substring(0, 10) : "",
        row.status || ""
      ]);
    } else if (activeTab === "attendance") {
      headers = ["Assembly Title", "Session Date", "Present Registry", "Attendance Rate %"];
      rows = reportData.map(row => [
        row.title || "",
        row.date || "",
        `${row.attendedCount || 0} / ${row.totalRegisteredMembers || 0} Checked`,
        `${row.attendanceRatePercent || 0}%`
      ]);
    } else if (activeTab === "defaulters") {
      headers = ["Unpaid Borrower", "Aggregate Principal (RWF)", "Outstanding Due Arrears (RWF)", "Overdue Count", "Last Due Date"];
      rows = reportData.map(row => [
        row.memberName || "",
        row.totalLoanAmount || 0,
        row.amountOverdue || 0,
        `${row.overdueInstallmentsCount || 0} times`,
        row.lastDueDate || ""
      ]);
    } else {
      headers = ["Member", "Role", "Savings", "Loans", "Meetings"];
      rows = reportData.map(row => [
        row.fullName || "",
        row.role || "",
        `${row.contributionsSubmitted || 0} payments`,
        `${row.loansApplied || 0} applications`,
        `${row.meetingsAttended || 0} times`
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `umurimo_${activeTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const [selectedRow, setSelectedRow] = useState(null);
  const [attendeeList, setAttendeeList] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const openRowDetail = async (row) => {
    if (activeTab === 'attendance') {
      setLoadingAttendees(true);
      setSelectedRow(row);
      try {
        const data = await apiFetch(`/api/attendance?meetingId=${encodeURIComponent(row.meetingId)}`);
        setAttendeeList(Array.isArray(data) ? data : []);
      } catch (e) {
        setAttendeeList([]);
      } finally {
        setLoadingAttendees(false);
      }
    } else {
      setSelectedRow(row);
    }
  };
  const closeRowDetail = () => { setSelectedRow(null); setAttendeeList([]); };

  const renderDetailModal = () => {
    if (!selectedRow) return null;
    const row = selectedRow;
    let title = 'Record Details';
    let content = null;

    if (activeTab === 'contributions') {
      title = `Week ${row.week || ''}`;
      content = (
        <div className="space-y-3">
          <div className="flex justify-between"><span className="text-slate-500">Fiscal Period</span><span className="font-bold">{row.week}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Payments</span><span className="font-bold">{row.count}</span></div>
           <div className="flex justify-between"><span className="text-slate-500">Total Volume</span><span className="font-bold text-brand-700">{rwf(row.totalAmount)}</span></div>
        </div>
      );
    } else if (activeTab === 'loans') {
      title = `Loan ${row.id || ''}`;
      content = (
        <div className="space-y-3">
          <div className="flex justify-between"><span className="text-slate-500">Loan ID</span><span className="font-mono font-bold">{row.id}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Borrower</span><span className="font-bold">{row.memberName}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Principal</span><span className="font-bold">{rwf(row.amount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Interest</span><span className="font-bold">{row.interestRate}%</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Term</span><span className="font-bold">{row.termMonths} months</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Balance</span><span className="font-bold">{rwf(row.balance)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Origination</span><span className="font-bold">{row.requestDate ? new Date(row.requestDate).toLocaleDateString() : '-'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-bold uppercase">{row.status}</span></div>
        </div>
      );
    } else if (activeTab === 'attendance') {
      title = row.title || 'Attendance Record';
      const attendees = attendeeList.filter(a => String(a.meetingId || '') === String(row.meetingId || selectedRow?.meetingId || ''));
      content = (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-slate-500">Assembly</div>
              <div className="font-bold text-slate-900">{row.title}</div>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-slate-500">Date</div>
              <div className="font-bold text-slate-900">{row.date}</div>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-slate-500">Location</div>
              <div className="font-bold text-slate-900">{row.location}</div>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-slate-500">Present</div>
              <div className="font-bold text-slate-900">{row.attendedCount} / {row.totalRegisteredMembers} Checked</div>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-slate-500">Rate</div>
               <div className="font-bold text-brand-700">{row.attendanceRatePercent}%</div>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-gray-500 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingAttendees ? (
                  <tr><td colSpan="4" className="px-4 py-6 text-center"><LoadingSpinner size="md" text="Loading registry..." centered /></td></tr>
                ) : attendees.length === 0 ? (
                  <tr><td colSpan="4" className="px-4 py-6 text-center text-xs text-gray-400">No attendance entries found for this assembly.</td></tr>
                ) : (
                  attendees.map((a, i) => {
                    const member = a.memberId || {};
                    const name = member.fullName || 'Unknown';
                    const phone = member.phone || '-';
                    const verified = a.verified ? 'Verified' : (a.intent === 'verified' ? 'Verified' : (a.intent === 'escalated' ? 'Escalated' : (a.intent === 'rejected' ? 'Rejected' : 'Pending')));
                     const statusClass = a.verified || a.intent === 'verified' ? 'text-brand-700 bg-brand-50 border-brand-100' : (a.intent === 'escalated' ? 'text-rose-700 bg-rose-50 border-rose-100' : (a.intent === 'rejected' ? 'text-red-700 bg-red-50 border-red-100' : 'text-amber-700 bg-amber-50 border-amber-100'));
                    const time = a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                    return (
                      <tr key={a.id || i} className="hover:bg-slate-50/55 transition">
                        <td className="px-4 py-3 font-bold text-slate-900 text-sm">{name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 text-sm">{phone}</td>
                        <td className="px-4 py-3"><span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${statusClass}`}>{verified}</span></td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{time}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (activeTab === 'defaulters') {
      title = row.memberName || 'Defaulter';
      content = (
        <div className="space-y-3">
          <div className="flex justify-between"><span className="text-slate-500">Borrower</span><span className="font-bold">{row.memberName}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Loan Reference</span><span className="font-mono font-bold">{row.loanId}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Principal</span><span className="font-bold">{rwf(row.totalLoanAmount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Overdue Amount</span><span className="font-bold text-rose-600">{rwf(row.amountOverdue)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Missed Payments</span><span className="font-bold">{row.overdueInstallmentsCount} times</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Last Due Date</span><span className="font-bold">{row.lastDueDate}</span></div>
        </div>
      );
    } else {
      title = row.fullName || 'Member';
      content = (
        <div className="space-y-3">
          <div className="flex justify-between"><span className="text-slate-500">Full Name</span><span className="font-bold">{row.fullName}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="font-bold uppercase">{row.role}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Savings</span><span className="font-bold">{row.contributionsSubmitted}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Loans</span><span className="font-bold">{row.loansApplied}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Meetings Attended</span><span className="font-bold">{row.meetingsAttended}</span></div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeRowDetail}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <button onClick={closeRowDetail} className="text-slate-400 hover:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  };

  const renderMonthlyReportView = () => {
    if (loading) {
      return <LoadingSpinner centered text="Loading monthly report..." />;
    }

    if (!monthlyReport?.exists) {
      return (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">No Report Found</h3>
                <p className="text-sm text-slate-500 mt-1">
                  No monthly report exists for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
                  Generate a report to view or export it.
                </p>
              </div>
              <button
                onClick={() => setShowGenerateConfirm(true)}
                disabled={generating}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-60 flex items-center gap-2 mx-auto"
              >
                {generating ? <LoadingSpinner size="sm" /> : <FileSpreadsheet className="w-4 h-4" />}
                Generate Report
              </button>
            </div>
          </div>
        </div>
      );
    }

    const report = monthlyReport.report;
    const data = report?.payload?.data || [];
    const columns = report?.payload?.columns || [];
    const summary = report?.payload?.summary || {};

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {report?.payload?.title || `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear} Report`}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Generated: {new Date(report?.generatedAt).toLocaleString()} by {report?.generatedBy?.fullName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportMonthlyReport("pdf")}
                disabled={exporting}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 disabled:opacity-60"
              >
                <FileType2 className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => exportMonthlyReport("xlsx")}
                disabled={exporting}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 disabled:opacity-60"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={() => setShowGenerateConfirm(true)}
                disabled={generating}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 disabled:opacity-60"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>
          </div>

          {summary && Object.keys(summary).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {Object.entries(summary).slice(0, 4).map(([key, val]) => (
                <div key={key} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono">
                    {typeof val === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('total') || key.toLowerCase().includes('value'))
                      ? rwf(val)
                      : val}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {columns.map(col => (
                    <th key={col.key} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                  <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-slate-400">No records found for this period.</td></tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/55 transition">
                      {columns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-xs">
                          {col.type === 'currency' ? rwf(row[col.key]) : (row[col.key] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderArchive = () => {
    if (archiveLoading) {
      return <LoadingSpinner centered text="Loading archive..." />;
    }

    if (archive.length === 0) {
      return (
        <EmptyState
          title="No archived reports"
          description="Monthly reports will appear here once generated. Reports are automatically generated at the end of each month."
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Period</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Generated</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Generated By</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Records</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {archive.map((report) => {
                const startDate = new Date(report.period.startDate);
                const monthLabel = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                const recordCount = report.payload?.data?.length || 0;

                return (
                  <tr key={report.id} className="hover:bg-slate-50/55 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{monthLabel}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(report.period.startDate).toISOString().split('T')[0]} - {new Date(report.period.endDate).toISOString().split('T')[0]}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {report.generatedBy?.fullName || 'System'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600">
                      {recordCount} records
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            const y = startDate.getFullYear();
                            const m = startDate.getMonth() + 1;
                            setSelectedYear(y);
                            setSelectedMonth(m);
                            setActiveTab("monthly");
                            setMonthlyReport({ exists: true, report });
                          }}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
      {renderDetailModal()}

      {/* Header with tabs and controls */}
      <div className="space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-1 no-print">
            <button
              onClick={() => setActiveTab("monthly")}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "monthly" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CalendarDays className="w-4 h-4 text-brand-600" />
              <span>Monthly Reports</span>
            </button>
            <button
              onClick={() => setActiveTab("contributions")}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "contributions" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <PiggyBank className="w-4 h-4 text-brand-600" />
              <span>Contributions</span>
            </button>
            <button
              onClick={() => setActiveTab("loans")}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "loans" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Loans</span>
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "attendance" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CalendarDays className="w-4 h-4 text-amber-600" />
              <span>Attendance</span>
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setActiveTab("defaulters")}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === "defaulters" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                <span>Defaulters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 no-print">
            {activeTab === "monthly" && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-500"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            )}
            {activeTab !== "monthly" && (
              <button
                onClick={triggerCsvSimulation}
                disabled={!reportData || reportData.length === 0}
                className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download CSV spreadsheet"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 text-center text-sm font-semibold text-gray-400">
          <LoadingSpinner centered text="Reconciling cooperative archives..." />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "monthly" ? (
            <div className="space-y-6">
              {renderMonthlyReportView()}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Report Archive</h3>
                {renderArchive()}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Report Data</h5>

              <div className="overflow-x-auto text-sm">
                {activeTab === "contributions" && reportData?.data && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-700 dark:bg-slate-800">
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Period</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Payments</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Total Savings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.data.map((row, index) => (
                        <tr key={`contrib-${row.week || index}-${index}`} onClick={() => openRowDetail(row)} className="hover:bg-slate-50/55 transition cursor-pointer">
                          <td className="px-6 py-4 font-bold text-slate-800">Week {row.week}</td>
                          <td className="px-6 py-4 font-mono font-medium text-slate-500">{row.count} payments</td>
                           <td className="px-6 py-4 font-mono font-extrabold text-brand-800">{rwf(row.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === "loans" && reportData?.data && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-700 dark:bg-slate-800">
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Loan ID</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Borrower</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Amount</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Date</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.data.map((row, index) => (
                        <tr key={`loan-${row.id || index}-${index}`} onClick={() => openRowDetail(row)} className="hover:bg-slate-50/55 transition cursor-pointer">
                          <td className="px-6 py-4 font-mono font-semibold text-xs text-slate-500">{row.id}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{row.memberName}</td>
                           <td className="px-6 py-4 font-mono font-extrabold text-brand-800">{rwf(row.amount)}</td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-400">{new Date(row.requestDate).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === "attendance" && reportData?.data && (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-700 dark:bg-slate-800">
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Assembly Title details</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Session Date</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Present Directory</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Attendance Rate Index</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.data.map((row, index) => (
                        <tr key={`meet-${row.meetingId || index}-${index}`} onClick={() => openRowDetail(row)} className="hover:bg-slate-50/55 transition cursor-pointer">
                          <td className="px-6 py-4 font-bold text-slate-800">
                            <span>{row.title}</span>
                            <span className="text-[10px] text-gray-400 block font-mono font-normal">Location: {row.location}</span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.date}</td>
                          <td className="px-6 py-4 font-mono font-medium text-slate-600">{row.attendedCount} / {row.totalRegisteredMembers} Checked</td>
                           <td className="px-6 py-4 font-mono font-extrabold text-brand-800">{row.attendanceRatePercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === "defaulters" && reportData?.data && (
                  <table className="w-full text-left border-collapse text-xs font-medium">
                    <thead>
                      <tr className="bg-brand-700 dark:bg-slate-800">
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Member</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Loan Amount</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Overdue Amount</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Missed Payments</th>
                         <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200 font-mono">Last Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.data.map((row, index) => (
                        <tr key={`def-${row.loanId || index}-${index}`} onClick={() => openRowDetail(row)} className="hover:bg-slate-50/55 transition cursor-pointer">
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-900 leading-none">{row.memberName}</span>
                            <span className="text-[10px] text-gray-400 block font-mono mt-0.5">Loan Reference: {row.loanId}</span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-600">{rwf(row.totalLoanAmount)}</td>
                          <td className="px-6 py-4 font-mono font-extrabold text-rose-600">{rwf(row.amountOverdue)}</td>
                          <td className="px-6 py-4 font-mono font-semibold text-slate-800">{row.overdueInstallmentsCount} times</td>
                          <td className="px-6 py-4 font-mono text-slate-400">{row.lastDueDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showGenerateConfirm}
        onClose={() => { setShowGenerateConfirm(false); setForceRegenerate(false); }}
        onConfirm={generateMonthlyReport}
        title={forceRegenerate ? "Regenerate Report?" : "Generate Monthly Report"}
        message={forceRegenerate 
          ? "This will replace the existing report for this period. This action cannot be undone."
          : `Generate a new monthly report for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}?`}
        confirmText={generating ? "Generating..." : "Generate"}
        type="info"
        loading={generating}
      />
    </div>
  );
}
