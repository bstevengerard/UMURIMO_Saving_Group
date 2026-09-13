import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  Megaphone,
  Plus,
  Compass,
  Calendar,
  Layers,
  Sparkles,
  Search,
  BellRing,
  X
} from "lucide-react";

export default function AnnouncementsModule() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDialog, setActiveDialog] = useState(null); // 'create' | 'read'
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Form state
  const [annForm, setAnnForm] = useState({ title: "", message: "" });

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const list = await apiFetch("/api/announcements");
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (e) {
      addNotification(e.message || "Failed to load announcements", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/announcements", {
        method: "POST",
        body: JSON.stringify(annForm)
      });
      addNotification("Cooperative bulletin announcement published!", "success");
      setAnnForm({ title: "", message: "" });
      setActiveDialog(null);
       loadAnnouncements();
      } catch (e) {
        addNotification(e.message || "Operation failed", "error");
      }
    };


  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      {/* Announcements Header */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm leading-none">
        <div>
          <h4 className="font-bold text-gray-900 text-md leading-none">Cooperative Bulletin Boards</h4>
          <p className="text-xs text-gray-400 mt-1">Official circulars, updates, and general assembly proclamations</p>
        </div>

        {hasPermission("manage_announcements") && (
          <button
            onClick={() => setActiveDialog("create")}
             className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold font-semibold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-5 h-5 animate-pulse" />
            <span>Publish Bulletin Notice</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Newsfeed List */}
        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <div className="py-24 text-center text-sm text-gray-400 font-semibold font-medium">Reconciling notice archives...</div>
          ) : announcements.length === 0 ? (
            <div className="py-24 text-center text-sm text-gray-400 bg-white border rounded-2xl">
              Currently, there are no published cooperative notices posted.
            </div>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} onClick={() => { setSelectedAnnouncement(ann); setActiveDialog("read"); }} className="bg-white p-6 rounded-2xl border border-gray-100/70 shadow-sm space-y-4 hover:border-brand-100/70 transition cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h5 className="font-extrabold text-slate-900 text-[15px] leading-snug tracking-tight">{ann.title}</h5>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                      <span>By: {ann.author || "President Office"}</span>
                      <span>&bull;</span>
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${
                     ann.audience === "all" ? "bg-brand-50 text-brand-800" : "bg-indigo-50 text-indigo-700"
                  }`}>
                    to {ann.audience}
                  </span>
                </div>

                <span className="text-[10px] text-slate-600 leading-relaxed font-semibold">{ann.message || ann.content}</span>
              </div>
            ))
          )}
        </div>

        {/* Sidebar help guidelines */}
        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm space-y-4">
          <div className="border-b pb-2.5 flex items-center gap-1.5 text-slate-700">
             <BellRing className="w-4 h-4 text-brand-600" />
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Bulletin Procedures</h5>
          </div>
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-semibold">
            <p>Official bulletins displayed here automatically sync with current members sessions mobile panels based on role configurations.</p>
            <p>Publishing here also pushes mock background broadcasts to SMS logs directories to ensure maximum assembly participation rates check.</p>
          </div>
        </div>
      </div>

      {/* POPUP CREATION DIALOG */}
      {activeDialog === "create" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateAnnouncement} className="bg-white max-w-sm w-full rounded-2xl border p-6 space-y-4 animate-fade-in text-sm font-medium">
            <h3 className="font-bold text-gray-900 text-lg border-b pb-2.5">Publish Bulletin Notice</h3>

            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="text-gray-500 text-xs font-semibold">Message banner Title</label>
                <input
                  required
                  type="text"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder="e.g., Audits Schedule Shift"
                  className="w-full px-3.5 py-2.5 border rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 text-xs font-semibold">Notice Body content</label>
                <textarea
                  required
                  value={annForm.message}
                  onChange={(e) => setAnnForm({ ...annForm, message: e.target.value })}
                  placeholder="Describe notice updates in clear terms..."
                  className="w-full px-3.5 py-2 border rounded-xl h-24 text-xs leading-relaxed font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="px-4 py-2 border rounded-xl text-gray-500 hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                 className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold font-semibold animate-pulse"
              >
                Publish Board Notice
              </button>
            </div>
          </form>
        </div>
      )}

      {activeDialog === "read" && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveDialog(null); }}>
          <div className="bg-white max-w-lg w-full rounded-2xl border p-6 space-y-5 animate-fade-in text-sm font-medium">
            <div className="space-y-2 border-b pb-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-bold text-gray-900 text-lg leading-snug">{selectedAnnouncement.title}</h3>
                <button type="button" onClick={() => setActiveDialog(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                <span>By: {selectedAnnouncement.createdBy?.fullName || "President Office"}</span>
                <span>&bull;</span>
                <span>{new Date(selectedAnnouncement.createdAt).toLocaleDateString()}</span>
              </div>
              {selectedAnnouncement.priority && (
                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${
                  selectedAnnouncement.priority === "urgent" ? "bg-rose-50 text-rose-700" :
                  selectedAnnouncement.priority === "high" ? "bg-amber-50 text-amber-700" :
                  selectedAnnouncement.priority === "medium" ? "bg-brand-50 text-brand-700" :
                  "bg-slate-100 text-slate-700"
                }`}>
                  {selectedAnnouncement.priority}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="prose prose-sm max-w-none text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedAnnouncement.message || selectedAnnouncement.content}
              </div>
              {selectedAnnouncement.expiresAt && (
                <p className="text-[10px] text-slate-450 font-mono">Expires: {new Date(selectedAnnouncement.expiresAt).toLocaleString()}</p>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t text-xs">
              <button type="button" onClick={() => setActiveDialog(null)} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
