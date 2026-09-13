import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ icon = <Inbox className="w-12 h-12 text-slate-300" />, title = "Nothing here yet", description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
