import React from "react";

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage = 8 }) {
  if (totalPages <= 1) return null;

  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-slate-600">
      <div className="font-medium text-center sm:text-left">
        Showing <span className="font-bold text-slate-800">{startItem}</span> to{" "}
        <span className="font-bold text-slate-800">{endItem}</span> of{" "}
        <span className="font-bold text-slate-800">{totalItems}</span> records
      </div>
      <div className="flex items-center gap-1.5 flex-wrap justify-center font-bold">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange((prev) => Math.max(prev - 1, 1))}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPageChange(i + 1)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
              currentPage === i + 1
                ? "bg-brand-700 text-white shadow-sm"
                : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange((prev) => Math.min(prev + 1, totalPages))}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}
