import React from "react";

export function SkeletonCard() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-200 rounded-lg w-1/2 animate-shimmer"></div>
          <div className="h-6 bg-slate-200 rounded-lg w-3/4 animate-shimmer"></div>
          <div className="h-3 bg-slate-200 rounded-lg w-1/3 animate-shimmer"></div>
        </div>
        <div className="w-9 h-9 rounded-lg bg-slate-200 shrink-0 animate-shimmer"></div>
      </div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-4 bg-slate-200 rounded-lg animate-shimmer ${i === 0 ? "w-3/4" : i === cols - 1 ? "w-1/2" : "w-full"}`}></div>
        </td>
      ))}
    </tr>
  );
}

export function SkeletonDropdown() {
  return (
    <select disabled className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-400 font-medium cursor-not-allowed">
      <option>Loading...</option>
    </select>
  );
}

export function SkeletonText({ width = "full", className = "" }) {
  const widthMap = {
    full: "w-full",
    "3/4": "w-3/4",
    "1/2": "w-1/2",
    "1/3": "w-1/3",
    "1/4": "w-1/4",
  };
  return (
    <div className={`h-4 bg-slate-200 rounded-lg animate-shimmer ${widthMap[width] || "w-full"} ${className}`}></div>
  );
}

export function SkeletonButton() {
  return (
    <div className="h-10 bg-slate-200 rounded-xl animate-shimmer"></div>
  );
}

export function SkeletonCardSimple() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="h-3 bg-slate-200 rounded-lg w-1/3 animate-shimmer"></div>
      <div className="h-8 bg-slate-200 rounded-lg w-2/3 animate-shimmer"></div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <div className="h-3 bg-slate-200 rounded-lg w-full animate-shimmer"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <tr key={rowIdx}>
            {Array.from({ length: cols }).map((_, colIdx) => (
              <td key={colIdx} className="px-4 py-3">
                <div className={`h-4 bg-slate-200 rounded-lg animate-shimmer ${colIdx === 0 ? "w-3/4" : "w-full"}`}></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </div>
  );
}

export function SkeletonAnnouncementCard() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded-lg w-3/4 animate-shimmer"></div>
          <div className="h-3 bg-slate-200 rounded-lg w-1/2 animate-shimmer"></div>
        </div>
        <div className="h-6 bg-slate-200 rounded-lg w-16 shrink-0 animate-shimmer"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded-lg w-full animate-shimmer"></div>
        <div className="h-3 bg-slate-200 rounded-lg w-2/3 animate-shimmer"></div>
      </div>
    </div>
  );
}
