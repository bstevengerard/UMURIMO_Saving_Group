import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  CalendarDays,
  Plus,
  MapPin,
  Clock,
  UserCheck,
  CheckCircle,
  Clock3,
  Search,
  UserX,
  UserCheck2,
  AlertCircle,
  Check,
  Pencil,
  Trash2
} from "lucide-react";

export default function MeetingsModule() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [meetings, setMeetings] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSilentSync, setIsSilentSync] = useState(true);
  const [silentSyncing, setSilentSyncing] = useState(false);

  // Switch tabs
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [activeDialog, setActiveDialog] = useState(null); // 'create'

  // Attendance state
  const [attendanceMap, setAttendanceMap] = useState({});
  const [finesMap, setFinesMap] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [applyingFines, setApplyingFines] = useState(false);
  const [meetingFines, setMeetingFines] = useState([]);
  const [loadingFines, setLoadingFines] = useState(false);
  const [completedMeetings, setCompletedMeetings] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const formatDate = (val) => {
    if (!val) return "TBA";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "TBA";
      return d.toLocaleDateString();
    } catch {
      return "TBA";
    }
  };

  const formatTime = (val) => {
    if (!val) return "TBA";
    try {
      const [h, m] = String(val).split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return String(val);
      const suffix = h >= 12 ? "PM" : "AM";
      const hh = h % 12 || 12;
      return `${hh}:${m.toString().padStart(2, "0")} ${suffix}`;
    } catch {
      return String(val);
    }
  };

  // Form states
  const [meetingForm, setMeetingForm] = useState({ title: "", description: "", date: "", startTime: "", endTime: "", location: "" });
  const [manualMemberId, setManualMemberId] = useState("");
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMeetings = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setSilentSyncing(true);
    try {
      const list = await apiFetch("/api/meetings");
      const meetingsData = Array.isArray(list) ? list : [];
      setMeetings(meetingsData);

      if (meetingsData.length > 0) {
        const matched = selectedMeeting ? meetingsData.find(x => x.id === selectedMeeting.id) : null;
        setSelectedMeeting(matched || meetingsData[0]);
      }

      const completed = meetingsData.filter(m => m.status === "completed");
      setCompletedMeetings(completed);

      if (user.role === "admin") {
        const mems = await apiFetch("/api/members");
        setMembers(Array.isArray(mems) ? mems : []);
      }
    } catch (e) {
      addNotification(e.message || "Failed to load meetings", "error");
    } finally {
      setLoading(false);
      setSilentSyncing(false);
    }
  };

  const loadAttendance = async () => {
    if (!selectedMeeting || !selectedMeeting.id) return;
    try {
      const records = await apiFetch(`/api/attendance?meetingId=${selectedMeeting.id}`);
      const map = {};
      (records || []).forEach(r => {
        map[r.memberId] = r;
      });
      setAttendanceMap(map);
    } catch (e) {
      addNotification(e.message || "Failed to load attendance", "error");
    }
  };

  const loadMeetingFines = async () => {
    if (!selectedMeeting || !selectedMeeting.id) return;
    setLoadingFines(true);
    try {
      const data = await apiFetch(`/api/meeting-fines/${selectedMeeting.id}/fines`);
      setMeetingFines(Array.isArray(data) ? data : []);
    } catch (e) {
      addNotification(e.message || "Failed to load fines", "error");
    } finally {
      setLoadingFines(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await apiFetch("/api/attendance/history");
      setAttendanceHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      addNotification(e.message || "Failed to load history", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    loadAttendance();
    loadMeetingFines();
  }, [selectedMeeting]);

  useEffect(() => {
    if (!isSilentSync) return;
    const interval = setInterval(() => {
      loadMeetings(true);
      if (selectedMeeting) {
        loadAttendance();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isSilentSync, selectedMeeting]);

  // Mark attendance
  const handleToggleAttendance = (memberId) => {
    setAttendanceMap(prev => ({
      ...prev,
      [memberId]: prev[memberId] ? null : { memberId, meetingId: selectedMeeting.id, intent: "pending", verified: false }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) return;
    setSavingAttendance(true);
    try {
      const attendances = Object.values(attendanceMap).filter(Boolean);
      await apiFetch("/api/attendance/bulk", {
        method: "POST",
        body: JSON.stringify({ meetingId: selectedMeeting.id, attendances }),
      });
      addNotification("Attendance saved successfully", "success");
      loadAttendance();
    } catch (e) {
      addNotification(e.message || "Failed to save attendance", "error");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleApplyFines = async () => {
    if (!selectedMeeting) return;
    setApplyingFines(true);
    try {
      await apiFetch(`/api/meeting-fines/${selectedMeeting.id}/fines`, {
        method: "POST",
        body: JSON.stringify({ amount: 1000, reason: "Absent from meeting" }),
      });
      addNotification("Fines applied to absent members", "success");
      loadMeetingFines();
    } catch (e) {
      addNotification(e.message || "Failed to apply fines", "error");
    } finally {
      setApplyingFines(false);
    }
  };

  // Create scheduled assemblies
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...meetingForm,
        startTime: meetingForm.startTime || meetingForm.time
      };
      delete payload.time;

      const created = await apiFetch("/api/meetings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      addNotification("New Cooperative Assembly scheduled successfully!", "success");
      setMeetingForm({ title: "", description: "", date: "", startTime: "", endTime: "", location: "" });
      setActiveDialog(null);
        loadMeetings();
      } catch (e) {
        addNotification(e.message || "Operation failed", "error");
      }
    };


  // Open edit dialog pre-filled
  const handleEditClick = (meeting) => {
    setEditingMeetingId(meeting.id);
    const dateVal = meeting.date ? (typeof meeting.date === 'string' ? meeting.date.substring(0, 10) : new Date(meeting.date).toISOString().substring(0, 10)) : "";
    setMeetingForm({
      title: meeting.title || "",
      description: meeting.description || "",
      date: dateVal,
      startTime: meeting.startTime || "",
      endTime: meeting.endTime || "",
      location: meeting.location || ""
    });
    setActiveDialog("create");
  };

  // Update meeting
  const handleUpdateMeeting = async (e) => {
    e.preventDefault();
    if (!editingMeetingId) return;
    setActionLoading(true);
    try {
      const payload = {
        ...meetingForm,
        startTime: meetingForm.startTime
      };
      await apiFetch(`/api/meetings/${editingMeetingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      addNotification("Assembly session updated successfully!", "success");
      setMeetingForm({ title: "", description: "", date: "", startTime: "", endTime: "", location: "" });
      setEditingMeetingId(null);
      setActiveDialog(null);
      loadMeetings();
    } catch (e) {
      addNotification(e.message || "Update failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete meeting flow
  const handleDeleteClick = (id) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteMeeting = async () => {
    if (!deleteTargetId) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/meetings/${deleteTargetId}`, {
        method: "DELETE",
      });
      addNotification("Assembly session removed.", "success");
      setDeleteTargetId(null);
      loadMeetings();
    } catch (e) {
      addNotification(e.message || "Delete failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Mark members manually present
  const handleMarkAttendance = async (memId) => {
    if (!selectedMeeting) return;
    try {
      await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ meetingId: selectedMeeting.id, memberId: memId }),
      });
      addNotification("Member marked present", "success");
      loadAttendance();
    } catch (e) {
      addNotification(e.message || "Failed to mark attendance", "error");
    }
  };

  // Perform administrative verification
  const handleVerifyAttendance = async (attId) => {
    try {
      await apiFetch(`/api/attendance/${attId}/verify`, { method: "PUT" });
       addNotification("Attendance verified", "success");
       loadAttendance();
     } catch (e) {
       addNotification(e.message || "Operation failed", "error");
     }
   };


  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      {/* Filters header and scheduling controls */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm leading-none">
           <div className="flex items-center gap-3">
             <h4 className="font-bold text-gray-900 text-md">Meetings</h4>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <button
              onClick={() => setIsSilentSync(!isSilentSync)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer ${
                isSilentSync 
                   ? "bg-brand-50 text-brand-700 border border-brand-200" 
                  : "bg-slate-50 text-slate-400 border border-slate-200"
              }`}
              title="Toggle background silent updates"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSilentSync ? "bg-brand-500 animate-pulse" : "bg-slate-400"}`}></span>
              <span>LIVE AUTO-SYNC: {isSilentSync ? "ON" : "OFF"}</span>
            </button>
            {silentSyncing && (
              <span className="text-[10px] text-slate-400 font-mono italic animate-pulse">Syncing...</span>
            )}
          </div>
        </div>

        {hasPermission("manage_meetings") && (
          <button
            onClick={() => setActiveDialog("create")}
             className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition"
          >
            <Plus className="w-5 h-5" />
            <span>New Meeting</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
         {/* Meetings listing selection queue */}
         <div className="space-y-4">
           <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Meetings</h5>
           {loading ? (
             <div className="py-20 text-center text-xs text-gray-400 font-medium">Loading meetings...</div>
           ) : meetings.length === 0 ? (
             <div className="py-16 text-center text-xs text-gray-400 bg-white border rounded-2xl">
               No meetings found.
             </div>
           ) : (
             meetings.map((m) => (
               <div
                 key={m.id}
                 onClick={() => setSelectedMeeting(m)}
                 className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col gap-3 ${
                   selectedMeeting?.id === m.id
                      ? "bg-brand-50 border-brand-200 text-slate-900 shadow-sm"
                     : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-gray-800"
                 }`}
               >
                 <div className="flex items-start justify-between gap-2.5">
                   <h5 className={`font-bold text-sm tracking-tight leading-snug ${selectedMeeting?.id === m.id ? "text-slate-900" : "text-gray-900"}`}>
                     {m.title}
                   </h5>
                   <div className="flex items-center gap-1.5 shrink-0">
                     {hasPermission("manage_meetings") && (
                       <>
                         <button
                           type="button"
                           onClick={(e) => { e.stopPropagation(); handleEditClick(m); }}
                           className="p-1 rounded hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                           title="Edit meeting"
                         >
                           <Pencil className="w-3.5 h-3.5" />
                         </button>
                         <button
                           type="button"
                           onClick={(e) => { e.stopPropagation(); handleDeleteClick(m.id); }}
                           className="p-1 rounded hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition cursor-pointer"
                           title="Delete meeting"
                         >
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                       </>
                     )}
                     <span className={`text-[9.5px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${
                       selectedMeeting?.id === m.id
                          ? "bg-brand-100 text-brand-800"
                         : m.status === "completed"
                         ? "bg-slate-100 text-slate-500"
                         : "bg-slate-200 text-slate-700"
                     }`}>
                       {m.status}
                     </span>
                   </div>
                 </div>

                 <p className={`text-xs leading-relaxed truncate ${selectedMeeting?.id === m.id ? "text-slate-700" : "text-gray-500"}`}>
                   {m.description}
                 </p>

                 <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold font-mono pt-2 border-t ${
                    selectedMeeting?.id === m.id ? "border-brand-200 text-slate-700" : "border-slate-100 text-slate-500"
                 }`}>
                   <span className="flex items-center gap-1">
                      <Clock className={`w-3.5 h-3.5 shrink-0 ${selectedMeeting?.id === m.id ? "text-brand-600" : "text-slate-500"}`} />
                     <span>{formatDate(m.date)} - {formatTime(m.startTime)}</span>
                   </span>
                   <span className="flex items-center gap-1">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${selectedMeeting?.id === m.id ? "text-brand-600" : "text-slate-500"}`} />
                     <span className="truncate max-w-[120px]">{m.location || 'TBA'}</span>
                   </span>
                 </div>
               </div>
             ))
           )}
         </div>

        {/* Selected Meeting Attendance sheet */}
        <div className="xl:col-span-2 space-y-6">
          {selectedMeeting ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              {/* Header metadata summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-5">
                <div className="space-y-1 shrink-1 leading-none">
                  <span className="text-[10px] text-gray-400 font-mono font-bold block uppercase leading-none">ACTIVE WORKSPACE SESSION</span>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedMeeting.title}</h3>
                  <p className="text-xs text-gray-400">{selectedMeeting.location}</p>
                </div>
                
                 <div className="flex items-center gap-3 shrink-0 no-print">
                    {selectedMeeting?.status !== "completed" && hasPermission("manage_meetings") && (
                      <button
                        onClick={handleSaveAttendance}
                        disabled={savingAttendance}
                         className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60"
                      >
                        {savingAttendance ? "Saving..." : "Save Attendance"}
                      </button>
                    )}
                    {selectedMeeting?.status === "completed" && hasPermission("manage_meetings") && (
                      <button
                        onClick={handleApplyFines}
                        disabled={applyingFines}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60"
                      >
                        {applyingFines ? "Applying..." : "Apply Fines to Absent"}
                      </button>
                    )}
                    {user.role === "admin" && (
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${showHistory ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        {showHistory ? "Hide History" : "Attendance History"}
                      </button>
                    )}
                  </div>
              </div>

               {/* Grid: Attendance list vs member picker */}
               <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
                 {/* Attendance list */}
                 <div className="md:col-span-3 space-y-4">
                   <h5 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">ATTENDEES ({Object.values(attendanceMap).filter(Boolean).length})</h5>

                   <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                     {Object.values(attendanceMap).filter(Boolean).length === 0 ? (
                       <div className="py-12 bg-slate-50 border border-gray-100/50 rounded-2xl text-center text-xs text-gray-400">
                         No attendance recorded yet.
                       </div>
                     ) : (
                       Object.values(attendanceMap).filter(Boolean).map((att) => (
                         <div key={att.id || att.memberId} className="p-4 rounded-xl border border-gray-50 bg-white hover:bg-slate-50 transition flex items-center justify-between text-xs font-medium">
                           <div className="space-y-1">
                             <h6 className="font-extrabold text-slate-900">{att.member?.full_name || att.memberId}</h6>
                             <span className="text-[10px] text-gray-400 font-mono block">Checked: {new Date(att.timestamp).toLocaleTimeString()}</span>
                           </div>

                           <div className="flex items-center gap-2">
                             {att.verified ? (
                                <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100 font-extrabold text-[10px]">PRESENT</span>
                             ) : hasPermission("manage_meetings") ? (
                               <button
                                 onClick={() => handleVerifyAttendance(att.id)}
                                 className="px-2.5 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 text-[10px] font-bold rounded"
                               >
                                 Verify
                               </button>
                             ) : (
                               <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-100 font-bold text-[10px]">PENDING</span>
                             )}
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 </div>

                 {/* Member attendance picker */}
                 <div className="md:col-span-2 p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                   <div className="border-b pb-2.5">
                     <h5 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 leading-none">
                        <UserCheck className="w-4.5 h-4.5 text-brand-700" />
                       <span>Mark Attendance</span>
                     </h5>
                   </div>

                   <div className="space-y-3">
                     <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">Select members who attended this meeting.</p>
                     <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                       {members.filter(m => m.isApproved).map((item) => {
                         const isChecked = !!attendanceMap[item.id];
                         return (
                           <div key={item.id} className="p-3 bg-white border rounded-xl flex items-center justify-between text-xs font-medium hover:bg-slate-100/50 transition">
                             <span className="font-bold text-gray-900 truncate max-w-[120px]">{item.fullName}</span>
                             <label className="flex items-center gap-2 cursor-pointer">
                               <input
                                 type="checkbox"
                                 checked={isChecked}
                                 onChange={() => handleToggleAttendance(item.id)}
                                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                               />
                               <span className="text-[10px] font-bold text-slate-600">{isChecked ? "Present" : "Absent"}</span>
                             </label>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          ) : (
            <div className="bg-white p-24 rounded-2xl border flex flex-col items-center justify-center text-center text-gray-400">
              <CalendarDays className="w-12 h-12 text-slate-300 animate-pulse" />
              <h5 className="font-bold text-sm text-slate-700 mt-3">Select a meeting</h5>
              <p className="text-xs max-w-[200px] mt-1.5">Choose a meeting to take attendance or view past meetings.</p>
            </div>
          )}
        </div>
      </div>

      {/* DIALOG POPUPS */}

      {/* Create meeting scheduled dialog */}
      {activeDialog === "create" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
           <form onSubmit={editingMeetingId ? handleUpdateMeeting : handleCreateMeeting} className="bg-white max-w-sm w-full rounded-2xl border p-6 space-y-4 animate-fade-in text-sm font-medium">
             <h3 className="font-bold text-gray-900 text-lg border-b pb-2">{editingMeetingId ? "Edit Meeting" : "New Meeting"}</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-gray-500 text-xs font-semibold">Meeting Title</label>
                <input
                  required
                  type="text"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  placeholder="e.g., Annual general assembly"
                  className="w-full px-3.5 py-2.5 border rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 text-xs font-semibold">Meeting details / Agenda</label>
                <textarea
                  required
                  value={meetingForm.description}
                  onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                  placeholder="Discussing cooperative updates..."
                  className="w-full px-3.5 py-2 rounded-xl h-20"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-slate-500 text-xs font-semibold">Date</label>
                  <input
                    required
                    type="date"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 text-xs font-semibold">Start Time</label>
                  <input
                    required
                    type="time"
                    value={meetingForm.startTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 text-xs font-semibold">End Time (optional)</label>
                  <input
                    type="time"
                    value={meetingForm.endTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 text-xs font-semibold">Location</label>
                <input
                  required
                  type="text"
                  value={meetingForm.location}
                  onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                  placeholder="Cooperative Hall, Kigali"
                  className="w-full px-3.5 py-2.5 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setActiveDialog(null); setEditingMeetingId(null); }}
                className="px-4 py-2 border rounded-xl text-gray-500 font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                 className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold font-semibold cursor-pointer disabled:opacity-60"
              >
                {actionLoading ? "Saving..." : (editingMeetingId ? "Update Meeting" : "Schedule Meeting")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl border p-6 space-y-4 animate-fade-in text-sm font-medium">
            <h3 className="font-bold text-gray-900 text-lg border-b pb-2">Confirm Deletion</h3>
             <p className="text-xs text-gray-600 leading-relaxed">
               Are you sure you want to delete this meeting? Attendance records will be kept, but the meeting will be permanently removed.
             </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 border rounded-xl text-gray-500 font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMeeting}
                disabled={actionLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-60"
              >
                {actionLoading ? "Deleting..." : "Delete Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <div>
              <h4 className="font-bold text-gray-950 text-md">Attendance History</h4>
              <p className="text-xs text-gray-400 mt-1">All recorded attendance across meetings</p>
            </div>
            <button onClick={loadHistory} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-gray-400">Loading history...</div>
            ) : attendanceHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">No attendance history found.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-brand-700 dark:bg-slate-800">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Meeting</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Date</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Member</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Status</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {attendanceHistory.map((meetingHistory) =>
                    meetingHistory.attendanceRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">{meetingHistory.meetingTitle}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-mono">{new Date(meetingHistory.meetingDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs font-medium">{rec.member?.full_name || rec.memberId}</td>
                        <td className="px-4 py-3 text-center">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rec.verified ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"}`}>
                            {rec.verified ? "Present" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
