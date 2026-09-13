import React from "react";

const STATUS_MAPS = {
  loan: {
    pending: { label: "Pending", className: "status-badge-warning" },
    approved: { label: "Approved", className: "status-badge-info" },
    active: { label: "Active", className: "status-badge-success" },
    disbursed: { label: "Disbursed", className: "status-badge-info" },
    paid: { label: "Paid", className: "status-badge-success" },
    completed: { label: "Completed", className: "status-badge-success" },
    rejected: { label: "Rejected", className: "status-badge-danger" },
    overdue: { label: "Overdue", className: "status-badge-danger" },
    defaulted: { label: "Defaulted", className: "status-badge-danger" },
    written_off: { label: "Written Off", className: "status-badge-neutral" },
    cancelled: { label: "Cancelled", className: "status-badge-neutral" },
    processing: { label: "Processing", className: "status-badge-warning" },
  },
  contribution: {
    paid: { label: "Paid", className: "status-badge-success" },
    pending: { label: "Pending", className: "status-badge-warning" },
    missed: { label: "Missed", className: "status-badge-danger" },
    partial: { label: "Partial", className: "status-badge-info" },
  },
  repayment: {
    paid: { label: "Paid", className: "status-badge-success" },
    pending: { label: "Pending", className: "status-badge-warning" },
    overdue: { label: "Overdue", className: "status-badge-danger" },
    missed: { label: "Missed", className: "status-badge-danger" },
    approved: { label: "Approved", className: "status-badge-success" },
    denied: { label: "Denied", className: "status-badge-danger" },
  },
  member: {
    active: { label: "Active", className: "status-badge-success" },
    inactive: { label: "Inactive", className: "status-badge-neutral" },
    suspended: { label: "Suspended", className: "status-badge-danger" },
    pending: { label: "Pending", className: "status-badge-warning" },
    approved: { label: "Approved", className: "status-badge-success" },
  },
  generic: {
    open: { label: "Open", className: "status-badge-info" },
    closed: { label: "Closed", className: "status-badge-neutral" },
    cancelled: { label: "Cancelled", className: "status-badge-danger" },
    draft: { label: "Draft", className: "status-badge-warning" },
    posted: { label: "Posted", className: "status-badge-success" },
    reversed: { label: "Reversed", className: "status-badge-danger" },
    verified: { label: "Verified", className: "status-badge-success" },
    present: { label: "Present", className: "status-badge-success" },
    absent: { label: "Absent", className: "status-badge-danger" },
    waived: { label: "Waived", className: "status-badge-neutral" },
    requires_review: { label: "Review", className: "status-badge-warning" },
    matched: { label: "Balanced", className: "status-badge-success" },
    mismatch: { label: "Mismatch", className: "status-badge-danger" },
  },
};

function normalizeStatus(status) {
  if (!status) return null;
  return String(status)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function StatusBadge({ status, type = "generic" }) {
  const normalized = normalizeStatus(status);
  const map = STATUS_MAPS[type] || STATUS_MAPS.generic;
  const config = map[normalized] || { label: status, className: "status-badge-neutral" };

  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}

export function resolveStatusConfig(status, type = "generic") {
  const normalized = normalizeStatus(status);
  const map = STATUS_MAPS[type] || STATUS_MAPS.generic;
  return map[normalized] || { label: status, className: "status-badge-neutral" };
}
