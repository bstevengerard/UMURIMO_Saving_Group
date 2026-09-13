import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("ikimina_token") || null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard"); // sidebar active control
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [loanConfig, setLoanConfig] = useState(null);
  const [roles, setRoles] = useState([]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [frontendMaintenanceMode, setFrontendMaintenanceMode] = useState(false);
  const navigate = useNavigate();

  // Toast & System alert notifier helper
  const addNotification = (message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Automatically archive in persistent system journal log
    setSystemNotifications((prev) => [
      {
        id,
        message,
        type,
        read: false,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
    
    // Auto clear toast after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAsRead = (id) => {
    setSystemNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const toggleReadStatus = (id) => {
    setSystemNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const markAllAsRead = () => {
    setSystemNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const clearAllSystemNotifications = () => {
    setSystemNotifications([]);
  };

  // High Fidelity Fetch Wrapper
  const apiFetch = async (endpoint, options = {}) => {
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (options.responseType === "blob") {
        if (!res.ok) {
          const msg = `API error occurred (Status ${res.status})`;
          throw new Error(msg);
        }
        return res.blob();
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || data?.msg || data?.details || `API error occurred (Status ${res.status})`;
        throw new Error(msg);
      }

      if (data && typeof data === 'object' && data.success === true && 'data' in data) {
        return data.data;
      }

      return data;
    } catch (err) {
      console.error(`API Fetch Error [${endpoint}]:`, err.message);
      throw err;
    }
  };

  // Hydrate user profile on start
  const hydrateUser = async (authToken) => {
    if (!authToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    
    const hasUser = !!user;
    
    try {
      if (!hasUser) setIsLoading(true);
      const profile = await apiFetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser(profile);
      if (profile?.emailVerified) setEmailVerified(true);
      
      // Seed initial loan configurations & roles metadata in background (admin only)
      if (profile.role === 'admin') {
        const config = await apiFetch("/api/loan-config", {
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(() => null);
        if (config) setLoanConfig(config);

        const rolesList = await apiFetch("/api/roles", {
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(() => null);
        if (rolesList) setRoles(rolesList);
      }

      const notifs = await apiFetch("/api/notifications?limit=20", {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(() => null);
      if (notifs && Array.isArray(notifs)) {
        const normalized = notifs.map(n => ({
          ...n,
          message: n.message || n.text || 'Notification',
          timestamp: n.timestamp || n.createdAt,
          read: n.read ?? false
        }));
        setSystemNotifications(normalized);
      }
      
    } catch (err) {
      console.log("Session hydration failed. Resetting authentication state.");
      if (!hasUser) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch loan configs
  const loadLoanConfig = async () => {
    try {
      const config = await apiFetch("/api/loan-config");
      setLoanConfig(config);
    } catch (e) {
      addNotification(e.message || "Failed to load loan configuration", "error");
    }
  };

  // Perform email login
  const login = async (email, password) => {
    try {
      const payload = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      
      localStorage.setItem("ikimina_token", payload.token);
      setToken(payload.token);
      setUser(payload.member);
      setActiveTab("dashboard");
      navigate("/dashboard");
      addNotification(`Welcome back, ${payload.member.fullName}!`, "success");
      return payload.member;
    } catch (err) {
      addNotification(err.message || "Login failed. Please try again.", "error");
      throw err;
    }
  };

  // Perform Numeric phone switch login
  const switchLogin = async (phone, pin) => {
    setIsLoading(true);
    try {
      let pinToVerify = pin;

      if (!pinToVerify) {
        const reqResult = await apiFetch("/api/auth/switch-login/request-pin", {
          method: "POST",
          body: JSON.stringify({ phone }),
        });
        pinToVerify = reqResult.devPin || pin;
      }

      const payload = await apiFetch("/api/auth/switch-login", {
        method: "POST",
        body: JSON.stringify({ phone, switchPin: pinToVerify }),
      });
      
      localStorage.setItem("ikimina_token", payload.token);
      setToken(payload.token);
      setUser(payload.member);
      addNotification(`Switched and authenticated as ${payload.member.fullName}!`, "success");
      setActiveTab("dashboard");
      return payload.member;
    } catch (err) {
      addNotification(err.message || "Switch login failed. Please try again.", "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Perform registration
  const registerMember = async (formData) => {
    setIsLoading(true);
    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      return response;
    } catch (err) {
      addNotification(err.message || "Registration failed", "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Perform logout
  const logout = () => {
    localStorage.removeItem("ikimina_token");
    setToken(null);
    setUser(null);
    setActiveTab("dashboard");
    navigate("/login");
    addNotification("Logged out successfully.", "success");
  };

  // Check if current user has appropriate permission keys
  const hasPermission = (permissionKey) => {
    if (!user) return false;
    if (user.role === "admin") return true;

    const roleConfig = roles.find((r) => r.role === user.role);
    if (!roleConfig) return false;

    const perms = roleConfig.permissions;
    if (Array.isArray(perms)) {
      return perms.includes("all") || perms.includes(permissionKey);
    }
    if (perms && typeof perms === "object") {
      return perms["all"] === true || perms[permissionKey] === true;
    }
    return false;
  };

  useEffect(() => {
    hydrateUser(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let socket;
    const setupSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        socket = io(baseUrl, {
          transports: ['websocket', 'polling'],
          auth: { token }
        });

        socket.on('announcement_created', (payload) => {
          addNotification(`Announcement: ${payload?.title || 'New update'}`, 'info');
        });

        socket.on('meeting_Joined', (payload) => {
          addNotification(`Attendance: ${payload?.memberName || 'Member'} joined meeting`, 'info');
        });

        socket.on('connect_error', () => {});
      } catch (e) {
        console.log('[socket] optional client not enabled');
      }
    };

    setupSocket();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token]);

  return (
    <AppContext.Provider
      value={{
        token,
        user,
        isLoading,
        activeTab,
        setActiveTab,
        mobileMenuOpen,
        setMobileMenuOpen,
        notifications,
        addNotification,
        removeNotification,
        systemNotifications,
        setSystemNotifications,
        markAsRead,
        toggleReadStatus,
        markAllAsRead,
        clearAllSystemNotifications,
        apiFetch,
        login,
        switchLogin,
        registerMember,
        logout,
        loanConfig,
        loadLoanConfig,
        setLoanConfig,
        roles,
        setRoles,
        hasPermission,
        emailVerified,
        setEmailVerified,
        frontendMaintenanceMode,
        setFrontendMaintenanceMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside an AppContextProvider");
  }
  return context;
}
