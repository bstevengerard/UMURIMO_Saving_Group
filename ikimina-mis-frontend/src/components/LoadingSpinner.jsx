import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingSpinner({
  size = "md",
  text = "",
  subtext = "",
  centered = false,
  className = "",
  textClassName = "",
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const spinner = (
    <Loader2
      className={`animate-spin text-brand-600 ${sizeClasses[size] || sizeClasses.md} ${className}`}
    />
  );

  if (centered) {
    return (
      <div className="loading-state">
        {spinner}
        {text && (
          <p className={`text-sm font-semibold text-slate-800 ${textClassName}`}>
            {text}
          </p>
        )}
        {subtext && (
          <p className="text-xs text-slate-500">{subtext}</p>
        )}
      </div>
    );
  }

  if (text || subtext) {
    return (
      <div className="flex items-center gap-2 animate-fade-in">
        {spinner}
        {text && (
          <span className={`text-sm font-medium text-slate-700 ${textClassName}`}>
            {text}
          </span>
        )}
      </div>
    );
  }

  return spinner;
}
