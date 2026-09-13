import React from "react";

export default function CurrencyDisplay({ value, className = "", showZero = false }) {
  if (value === null || value === undefined || value === "") {
    return <span className={`text-slate-400 ${className}`}>--</span>;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return <span className={`text-slate-400 ${className}`}>--</span>;
  }

  if (numeric === 0 && !showZero) {
    return <span className={`text-slate-400 ${className}`}>--</span>;
  }

  const formatted = new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);

  return (
    <span className={`font-mono text-xs font-semibold tabular-nums tracking-tight ${className}`}>
      {formatted}
    </span>
  );
}
