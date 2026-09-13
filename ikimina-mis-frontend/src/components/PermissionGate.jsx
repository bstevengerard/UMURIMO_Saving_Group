import React from "react";
import { useApp } from "../context/AppContext";

export default function PermissionGate({ permission, adminOnly = false, fallback = null, children }) {
  const { user, hasPermission } = useApp();

  if (!user) return fallback;
  if (adminOnly && user.role !== "admin") return fallback;
  if (permission && !hasPermission(permission)) return fallback;

  return children;
}
