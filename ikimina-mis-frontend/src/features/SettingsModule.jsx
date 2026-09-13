import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  Sliders,
  ShieldCheck,
  Save,
  Info,
  SlidersHorizontal
} from "lucide-react";

export default function SettingsModule() {
  const { apiFetch, user, loanConfig, setLoanConfig, roles, setRoles, addNotification } = useApp();

  const [activeTab, setActiveTab] = useState("limits");

  const defaultConfig = {
    maxLoanAmount: 1500000,
    minLoanAmount: 10000,
    baseInterestRate: 3,
    interestIncrement: 3,
    allowInterestIncrement: true,
    interestIncrementCondition: "after_30_days_overdue",
    loanLimitMultiplier: 3,
    principalBase: "totalSavings",
    fixedPrincipalBase: 0,
    monthlyLoanLimit: 0,
    maxActiveLoans: 1,
    maxTermMonths: 12,
    minTermMonths: 1,
    overduePenaltyRate: 5,
    gracePeriodDays: 7,
    repaymentReminderDays: null,
    allowMultipleLoans: false,
    requireGuarantor: false,
    profitFormula: "interest_plus_penalties",
    shareProfitAllocationPercent: 30,
    shareDistributionPeriod: "quarterly",
    emergencyAidFineRate: 5,
    emergencyAidRestrictionRule: "block_new_loans",
    restrictionRuleNote: ""
  };

  const [configForm, setConfigForm] = useState(defaultConfig);

  useEffect(() => {
    if (loanConfig) {
      setConfigForm({ ...defaultConfig, ...loanConfig });
    }
  }, [loanConfig]);

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      const updated = await apiFetch("/api/loan-config", {
        method: "PUT",
        body: JSON.stringify(configForm)
      });
      setLoanConfig(updated);
      addNotification("Loan settings updated!", "success");
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    }
  };

  const handleTogglePermission = async (roleName, permissionKey) => {
    const roleObj = roles.find(r => r.role === roleName);
    if (!roleObj) return;

    let updatedPerms = [...roleObj.permissions];
    if (updatedPerms.includes(permissionKey)) {
      updatedPerms = updatedPerms.filter(p => p !== permissionKey);
    } else {
      updatedPerms.push(permissionKey);
    }

    try {
      await apiFetch(`/api/roles/${roleName}`, {
        method: "PUT",
        body: JSON.stringify({ permissions: updatedPerms })
      });

      setRoles(roles.map(r => r.role === roleName ? { ...r, permissions: updatedPerms } : r));
      addNotification(`Permission changed for role ${roleName}`, "success");
    } catch (err) {
      addNotification(err.message || "Operation failed", "error");
    }
  };

  const rwf = (num) => {
    return new Intl.NumberFormat("rw-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(num);
  };

  const set = (key, value) => setConfigForm({ ...configForm, [key]: value });

  const permissionMatrixKeys = [
    { key: "all", label: "Full access" },
    { key: "view_members", label: "View members" },
    { key: "approve_member", label: "Approve new members" },
    { key: "manage_loans", label: "Manage loans" },
    { key: "approve_loan", label: "Approve loans" },
    { key: "manage_repayments", label: "Record repayments" },
    { key: "manage_contributions", label: "Record contributions" },
    { key: "manage_meetings", label: "Manage meetings" },
    { key: "manage_announcements", label: "Post announcements" },
    { key: "view_sms", label: "View SMS" },
    { key: "view_reports", label: "View reports" }
  ];

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm leading-none">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab("limits")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "limits" ? "bg-white text-slate-800 shadow-xs" : "text-gray-400 hover:text-gray-700"
            }`}
          >
             <SlidersHorizontal className="w-4 h-4 text-brand-600" />
            <span>Loan Limits</span>
          </button>

          <button
            onClick={() => setActiveTab("permissions")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "permissions" ? "bg-white text-slate-800 shadow-xs" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Permissions per Role</span>
          </button>
        </div>

        <div className="text-right text-[10px] text-gray-400 font-mono font-bold uppercase leading-none">
          <span>Settings</span>
        </div>
      </div>

      {activeTab === "limits" && (
        <form onSubmit={handleConfigSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6 text-sm font-medium">
          <div className="border-b pb-3">
            <h4 className="font-bold text-gray-950 text-md">Loan limits and rates</h4>
            <p className="text-xs text-gray-400 mt-1">Set maximum amounts, terms, interest rates, and late fees</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Minimum loan amount (RWF)</label>
              <input type="number" value={configForm.minLoanAmount} onChange={(e) => set("minLoanAmount", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Maximum loan amount (RWF)</label>
               <input type="number" value={configForm.maxLoanAmount} onChange={(e) => set("maxLoanAmount", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold text-brand-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Base interest rate (%)</label>
              <input type="number" value={configForm.baseInterestRate} onChange={(e) => set("baseInterestRate", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Interest increment (%)</label>
              <input type="number" value={configForm.interestIncrement} onChange={(e) => set("interestIncrement", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Overdue penalty rate (%)</label>
              <input type="number" value={configForm.overduePenaltyRate} onChange={(e) => set("overduePenaltyRate", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Loan limit multiplier</label>
              <input type="number" value={configForm.loanLimitMultiplier} onChange={(e) => set("loanLimitMultiplier", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Principal base</label>
              <select value={configForm.principalBase} onChange={(e) => set("principalBase", e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20">
                <option value="totalSavings">Total Savings</option>
                <option value="totalShares">Total Shares</option>
                <option value="savingsAndShares">Savings + Shares</option>
                <option value="fixedAmount">Fixed Amount</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Fixed principal base (RWF)</label>
              <input type="number" value={configForm.fixedPrincipalBase} onChange={(e) => set("fixedPrincipalBase", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Minimum term (months)</label>
              <input type="number" value={configForm.minTermMonths} onChange={(e) => set("minTermMonths", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Maximum term (months)</label>
              <input type="number" value={configForm.maxTermMonths} onChange={(e) => set("maxTermMonths", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Monthly loan limit (RWF)</label>
              <input type="number" value={configForm.monthlyLoanLimit} onChange={(e) => set("monthlyLoanLimit", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Max active loans per member</label>
              <input type="number" value={configForm.maxActiveLoans} onChange={(e) => set("maxActiveLoans", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Grace period (days)</label>
              <input type="number" value={configForm.gracePeriodDays} onChange={(e) => set("gracePeriodDays", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Emergency aid fine rate (%)</label>
              <input type="number" value={configForm.emergencyAidFineRate} onChange={(e) => set("emergencyAidFineRate", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Profit formula</label>
              <select value={configForm.profitFormula} onChange={(e) => set("profitFormula", e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20">
                <option value="interest_plus_penalties">Interest + Penalties</option>
                <option value="interest_plus_penalties_plus_principal">Interest + Penalties + Principal</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Share profit allocation (%)</label>
              <input type="number" value={configForm.shareProfitAllocationPercent} onChange={(e) => set("shareProfitAllocationPercent", Number(e.target.value))} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Share distribution period</label>
              <select value={configForm.shareDistributionPeriod} onChange={(e) => set("shareDistributionPeriod", e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-semibold">Emergency aid restriction rule</label>
              <select value={configForm.emergencyAidRestrictionRule} onChange={(e) => set("emergencyAidRestrictionRule", e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20">
                <option value="block_new_loans">Block new loans</option>
                <option value="block_meeting_attendance">Block meeting attendance</option>
                <option value="custom">Custom</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="flex items-center gap-3 py-1">
               <input type="checkbox" id="chk_guarantor" checked={configForm.requireGuarantor} onChange={(e) => set("requireGuarantor", e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300" />
              <label htmlFor="chk_guarantor" className="text-xs text-gray-700 font-bold leading-normal">Require guarantor</label>
            </div>
            <div className="flex items-center gap-3 py-1">
               <input type="checkbox" id="chk_multi" checked={configForm.allowMultipleLoans} onChange={(e) => set("allowMultipleLoans", e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300" />
              <label htmlFor="chk_multi" className="text-xs text-gray-700 font-bold leading-normal">Allow multiple active loans</label>
            </div>
            <div className="flex items-center gap-3 py-1">
               <input type="checkbox" id="chk_interest_increment" checked={configForm.allowInterestIncrement} onChange={(e) => set("allowInterestIncrement", e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300" />
              <label htmlFor="chk_interest_increment" className="text-xs text-gray-700 font-bold leading-normal">Allow interest increment (+{configForm.interestIncrement}%)</label>
            </div>
          </div>

          {user.role === "admin" && (
            <div className="pt-4 border-t border-gray-50 flex items-center justify-end">
               <button type="submit" className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-xs">
                <Save className="w-4 h-4" />
                <span>Update Loan Settings</span>
              </button>
            </div>
          )}
        </form>
      )}

      {activeTab === "permissions" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <div className="border-b pb-3">
            <h4 className="font-bold text-gray-950 text-md">Role Permissions</h4>
            <p className="text-xs text-gray-400 mt-1">Configure actions allowed for each cooperative role level</p>
          </div>

          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-700 dark:bg-slate-800">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Group Role</th>
                  {permissionMatrixKeys.map(k => (
                    <th key={k.key} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200 max-w-[120px]" title={k.label}>
                      {k.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {roles.map(r => (
                  <tr key={r.role} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-extrabold uppercase text-slate-900 tracking-wide font-mono text-xs">{r.role}</td>
                    {permissionMatrixKeys.map(k => {
                      const isAssigned = r.permissions.includes("all") || r.permissions.includes(k.key);
                      return (
                        <td key={k.key} className="px-3 py-4 text-center">
                           <input type="checkbox" checked={isAssigned} disabled={user.role !== "admin" || r.role === "admin" || k.key === "all"} onChange={() => handleTogglePermission(r.role, k.key)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-400 disabled:opacity-45" />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
