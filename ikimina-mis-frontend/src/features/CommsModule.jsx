import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  MessageSquareCode,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  UserCheck,
  Smartphone
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

export default function CommsModule() {
  const { apiFetch, user, hasPermission, addNotification } = useApp();
  const [smsLog, setSmsLog] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedulerJobs, setSchedulerJobs] = useState({});
  const [schedulerLoading, setSchedulerLoading] = useState(false);

  // Switch tabs
  const [activeTab, setActiveTab] = useState("broadcast"); // 'broadcast' | 'templates' | 'logs' | 'scheduler'
  const [activeDialog, setActiveDialog] = useState(null); // 'create_temp'

  // Form states
  const [broadcastForm, setBroadcastForm] = useState({ message: "", category: "general", sendToInactive: false, subscribedOnly: true });
  const [tempForm, setTempForm] = useState({ name: "", message: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const loadSMSAndTemplates = async () => {
    setLoading(true);
    try {
      const logs = await apiFetch("/api/sms");
      setSmsLog(Array.isArray(logs) ? logs : []);

      const temps = await apiFetch("/api/sms/templates");
      setTemplates(Array.isArray(temps) ? temps : []);
    } catch (e) {
      addNotification(e.message || "Failed to load SMS data", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulerStatus = async () => {
    setSchedulerLoading(true);
    try {
      const data = await apiFetch("/api/scheduler/status");
      setSchedulerJobs(data.jobs || {});
    } catch (e) {
      console.error("Failed to read scheduler status:", e.message);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleStartScheduler = async () => {
    setSchedulerLoading(true);
    try {
      const data = await apiFetch("/api/scheduler/start", { method: "POST" });
      setSchedulerJobs(data.jobs || {});
      addNotification(data.message || "Scheduler backend services online", "success");
    } catch (err) {
      addNotification("Failed to start scheduler: " + err.message, "error");
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleStopScheduler = async () => {
    setSchedulerLoading(true);
    try {
      const data = await apiFetch("/api/scheduler/stop", { method: "POST" });
      setSchedulerJobs(data.jobs || {});
      addNotification(data.message || "Scheduler background services suspended", "warning");
    } catch (err) {
      addNotification("Failed to suspend scheduler: " + err.message, "error");
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleTriggerJob = async (jobName) => {
    try {
      const data = await apiFetch(`/api/scheduler/trigger/${jobName}`, { method: "POST" });
      addNotification(data.message || `Successfully executed ${jobName} job!`, "success");
      
      // Reload SMS log
      const logs = await apiFetch("/api/sms");
      setSmsLog(logs || []);
    } catch (err) {
      addNotification("Manual trigger failed: " + err.message, "error");
    }
  };

  useEffect(() => {
    loadSMSAndTemplates();
    if (activeTab === "scheduler") {
      loadSchedulerStatus();
    }
  }, [activeTab]);

  // Submit broadcast
  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/sms/broadcast", {
        method: "POST",
        body: JSON.stringify(broadcastForm)
      });
      addNotification("Broadcast trigger logged and processed!", "success");
      setBroadcastForm({ message: "", category: "general", sendToInactive: false, subscribedOnly: true });
       setActiveTab("logs");
     } catch (e) {
       addNotification(e.message || "Operation failed", "error");
     }
   };


  // Create sms templates
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/sms/templates", {
        method: "POST",
        body: JSON.stringify(tempForm)
      });
      addNotification("SMS template recorded successfully!", "success");
      setTempForm({ name: "", message: "" });
      setActiveDialog(null);
       loadSMSAndTemplates();
     } catch (e) {
       addNotification(e.message || "Operation failed", "error");
     }
   };


  // Select template to fill message form
  const applyTemplateToBroadcast = (temp) => {
    setBroadcastForm({
      ...broadcastForm,
      category: temp.category || "general",
      message: temp.content
    });
    setActiveTab("broadcast");
  };

  // Filter SMS Logs
  const filteredLogs = smsLog.filter(log => {
    if (!searchQuery) return true;
    return log.to.includes(searchQuery) || log.message.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      {/* Sub menu selector header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm leading-none">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab("broadcast")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "broadcast" ? "bg-white text-slate-800 shadow-xs" : "text-gray-400 hover:text-gray-700"
            }`}
          >
             <Megaphone className="w-4 h-4 text-brand-600" />
            <span>Broadcast SMS Alerts</span>
          </button>
          
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "templates" ? "bg-white text-slate-800 shadow-xs" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <MessageSquareCode className="w-4 h-4 text-indigo-600" />
            <span>SMS Alerts Templates</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "logs" ? "bg-white text-slate-800 shadow-xs" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <Smartphone className="w-4 h-4 text-slate-600" />
            <span>SMS Logs History</span>
          </button>

          {hasPermission("manage_meetings") && (
            <button
              onClick={() => setActiveTab("scheduler")}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "scheduler" ? "bg-white text-slate-800 shadow-xs" : "text-gray-400 hover:text-gray-700"
              }`}
            >
               <MessageSquareCode className="w-4 h-4 text-brand-600 animate-pulse" />
              <span>Cron Scheduler Engine</span>
            </button>
          )}
        </div>

        <div className="text-right text-[10px] text-gray-400 font-mono font-bold uppercase leading-none">
          <span>SMS Gateway Node: ONLINE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Primary lists grids */}
        <div className="xl:col-span-2">
          {activeTab === "broadcast" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-xl">
              <form onSubmit={handleBroadcast} className="space-y-5 text-sm font-medium">
                <div className="border-b pb-3 leading-none">
                  <h4 className="font-bold text-gray-950 text-md">Broadcast Mobile SMS alerts</h4>
                  <p className="text-xs text-gray-400 mt-1">Dispensing notifications alert subscribed mobile numbers of events or schedules</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-gray-500 text-xs font-semibold">Alert category</label>
                    <select
                      value={broadcastForm.category}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    >
                      <option value="general">General Notifications</option>
                      <option value="loan">Loan Alerts</option>
                      <option value="contribution">Contribution Reminders</option>
                      <option value="attendance">Attendance Alerts</option>
                      <option value="meeting">Meeting Reminders</option>
                      <option value="repayment">Repayment Alerts</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 text-xs font-semibold">Include inactive members</label>
                    <select
                      value={broadcastForm.sendToInactive ? "yes" : "no"}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, sendToInactive: e.target.value === "yes" })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    >
                      <option value="no">Active members only</option>
                      <option value="yes">All members</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 text-xs font-semibold">SMS Alert Message text</label>
                  <textarea
                    required
                    maxLength={160}
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                    placeholder="Dear {fullName}, you are minded of the upcoming assembly..."
                    className="w-full px-3.5 py-2.5 border rounded-xl h-32 text-sm leading-relaxed"
                  />
                  <div className="text-right text-[10px] text-gray-400 font-mono font-medium">
                    <span>{broadcastForm.message.length} / 160 Character Limit (1 SMS Code)</span>
                  </div>
                </div>

                <div className="p-3.5 bg-yellow-50 border border-yellow-100 rounded-xl flex items-start gap-2.5 text-xs text-yellow-800 leading-normal">
                  <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                  <span>The custom parameter <code>{`{fullName}`}</code> will automatically substitute member identity cards from current active directories before gateway routing.</span>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    type="submit"
                     className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 tracking-wide"
                  >
                    <span>Trigger Broadcast Alert</span>
                    <Send className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "templates" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b pb-3 leading-none">
                <div>
                  <h4 className="font-bold text-gray-950 text-md">Alert Templates Library</h4>
                  <p className="text-xs text-gray-400 mt-1">Manage reusable SMS notifications frameworks for events checks</p>
                </div>
                {hasPermission("manage_announcements") && (
                  <button
                    onClick={() => setActiveDialog("create_temp")}
                     className="px-4 py-2 border rounded-xl text-xs font-bold text-brand-700 hover:bg-brand-50 border-brand-100 flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Create Template</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  <div className="py-12 text-center md:col-span-2">
                    <LoadingSpinner size="md" text="Loading templates..." centered />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400 md:col-span-2">No custom SMS templates recorded.</div>
                ) : (
                  templates.map(t => (
                    <div key={t.id} className="p-4 rounded-xl border border-gray-100/70 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1.5 leading-tight">
                         <h5 className="font-bold text-slate-900 text-xs text-brand-800 font-mono uppercase tracking-wide">{t.name}</h5>
                        <p className="text-xs text-slate-600 leading-normal italic">&ldquo;{t.message}&rdquo;</p>
                        <span className="block text-[9px] text-gray-400 font-mono font-bold">Template ID: {t.id}</span>
                      </div>
                      <button
                        onClick={() => applyTemplateToBroadcast(t)}
                         className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1"
                      >
                        <span>Apply and fill broadcast</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-950 text-md leading-none">Gateway Delivery Registers</h4>
                  <p className="text-xs text-gray-400 mt-1">Audit log matching dispensed communication logs and network responses</p>
                </div>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by phone or msg..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left border-collapse border-b">
                  <thead>
                    <tr className="bg-brand-700 dark:bg-slate-800">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Recipient Phone Number</th>
                       <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Message</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Delivery code</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-100 dark:text-slate-200">Stamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-xs text-gray-400 font-medium">Reconciling logs...</td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-xs text-gray-400 font-medium">No SMS delivery registries.</td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 font-mono font-bold text-xs text-slate-800">{log.to}</td>
                          <td className="px-6 py-4 text-xs max-w-xs leading-normal font-medium text-slate-600">{log.message}</td>
                          <td className="px-6 py-4">
                             <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 font-mono">
                               <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                              <span>{log.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono font-medium text-slate-400">{new Date(log.sentAt).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "scheduler" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-950 text-md leading-none">Cooperative Cron Task Scheduler</h4>
                  <p className="text-xs text-slate-500 mt-1">Configure and inspect scheduled tasks including automated SMS reminders, contribution sweeps, and meeting prompts.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleStartScheduler}
                     className="px-3.5 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
                    disabled={schedulerLoading}
                  >
                    Start All Jobs
                  </button>
                  <button
                    onClick={handleStopScheduler}
                    className="px-3.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-semibold cursor-pointer transition border border-red-200"
                    disabled={schedulerLoading}
                  >
                    Stop All Jobs
                  </button>
                </div>
              </div>

              {schedulerLoading ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium animate-pulse">
                  Querying Cron scheduler configuration status...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Overdue loans alert */}
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center bg-transparent mb-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Daily @ 9AM</span>
                           <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">Status: {schedulerJobs["overdue-loans"] || "Active"}</span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-md leading-snug">Overdue Loan Repayment Checking</h5>
                        <p className="text-xs text-slate-500 leading-normal">Scans all disbursed active cooperative loans, flags overdue repayment milestones, and queues automated SMS alerts to borrowers.</p>
                      </div>
                      <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between bg-transparent">
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Rule: "0 9 * * *"</span>
                        <button
                          onClick={() => handleTriggerJob("overdue-loans")}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer"
                        >
                          Manual Trigger Check-Run
                        </button>
                      </div>
                    </div>

                    {/* Weekly contribution reminders */}
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center bg-transparent mb-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">Mondays @ 8AM</span>
                           <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">Status: {schedulerJobs["contribution-reminders"] || "Active"}</span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-md leading-snug">Savings & Contribution Reminders</h5>
                        <p className="text-xs text-slate-500 leading-normal">Identifies pending saving contributions for the active cycle, drafting reminders that prompt members to complete their mobile transfers.</p>
                      </div>
                      <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between bg-transparent">
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Rule: "0 8 * * 1"</span>
                        <button
                          onClick={() => handleTriggerJob("contribution-reminders")}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer"
                        >
                          Manual Trigger Reminders
                        </button>
                      </div>
                    </div>

                    {/* Today's assembly reminders */}
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center bg-transparent mb-1.5">
                           <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded">Daily @ 7AM</span>
                           <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">Status: {schedulerJobs["meeting-reminders"] || "Active"}</span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-md leading-snug">Active Assembly Prompts</h5>
                        <p className="text-xs text-slate-500 leading-normal">Scans for sector/assembly meetings scheduled today and broadcasts immediate notice reminders to all cooperative members.</p>
                      </div>
                      <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between bg-transparent">
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Rule: "0 7 * * *"</span>
                        <button
                          onClick={() => handleTriggerJob("meeting-reminders")}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer"
                        >
                          Manual Broadcast Active Notice
                        </button>
                      </div>
                    </div>

                    {/* Overdue contributions sweep */}
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center bg-transparent mb-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded">Daily @ Midnight</span>
                           <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">Status: {schedulerJobs["mark-overdue"] || "Active"}</span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-md leading-snug">State Overdue Sweep</h5>
                        <p className="text-xs text-slate-500 leading-normal">Checks week deadlines and transitions pending status blocks into overdue status blocks to generate clean audit trails.</p>
                      </div>
                      <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between bg-transparent">
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Rule: "0 0 * * *"</span>
                        <button
                          onClick={() => handleTriggerJob("mark-overdue")}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer"
                        >
                          Manual Run Overdue Sweep
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SMS gateway usage quick info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="border-b pb-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1 leading-none">
               <Smartphone className="w-4.5 h-4.5 text-brand-600" />
              <span>Gateway Node Metrics</span>
            </h5>
          </div>

          <div className="space-y-4 text-xs font-medium">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <div className="flex justify-between items-center bg-transparent">
                <span className="text-gray-500">Node Status:</span>
                <span className="font-bold text-brand-700 uppercase">ONLINE & ACTIVE</span>
              </div>
              <div className="flex justify-between items-center bg-transparent">
                <span className="text-gray-500 font-medium">Total logged SMS:</span>
                <span className="strong font-mono font-bold text-slate-800">{smsLog.length} sent</span>
              </div>
            </div>

             <div className="space-y-1 bg-brand-50/50 p-4 rounded-xl border border-brand-100/50 text-brand-800 leading-normal">
               <h5 className="font-bold text-brand-900 border-b border-brand-200 pb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide mb-1.5 leading-none">
                <UserCheck className="w-4.5 h-4.5 shrink-0" />
                <span>Rwanda SMS Guidelines</span>
              </h5>
               <p className="text-[10px] text-brand-700 font-medium leading-relaxed">System notifications should be about cooperative activities like saving cycles, loans, or meetings, and follow local guidelines on when reminders are sent.</p>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP DIALOGS */}

      {/* Create template Dialog */}
      {activeDialog === "create_temp" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateTemplate} className="bg-white max-w-sm w-full rounded-2xl border p-6 space-y-4 animate-fade-in text-sm font-medium">
            <h3 className="font-bold text-gray-900 text-lg border-b pb-2.5">Create SMS Alert template</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-500 text-xs font-semibold">Template identifier name</label>
                <input
                  required
                  type="text"
                  value={tempForm.name}
                  onChange={(e) => setTempForm({ ...tempForm, name: e.target.value })}
                  placeholder="e.g., Attendance reminder"
                  className="w-full px-3.5 py-2.5 border rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-505 text-xs font-semibold">SMS Template text</label>
                <textarea
                  required
                  maxLength={160}
                  value={tempForm.message}
                  onChange={(e) => setTempForm({ ...tempForm, message: e.target.value })}
                  placeholder="Dear {fullName}, you are Reminded of..."
                  className="w-full px-3.5 py-2 border rounded-xl h-24 text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="px-4 py-2 border rounded-xl text-gray-500 hover:bg-gray-50 font-semibold"
              >
                Dismiss
              </button>
              <button
                type="submit"
                 className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold font-semibold animate-pulse"
              >
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
