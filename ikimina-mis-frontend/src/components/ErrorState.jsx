import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorState({ title = "Something went wrong", message = "We could not complete your request. Please try again.", onRetry, retryText = "Try Again" }) {
  return (
    <div className="error-state">
      <div className="error-state-icon">
        <AlertTriangle className="w-10 h-10 text-danger-500" />
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-danger mt-2"
        >
          {retryText}
        </button>
      )}
    </div>
  );
}
