import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Settings as SettingsIcon, Shield, Bell, Key, Database, RefreshCw, 
  Save, X, Globe, Cpu, Building2, FileText, Plug, ShieldCheck, 
  Plus, Check, ChevronRight, CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight, GraduationCap
} from 'lucide-react';
import TrackerSettingsCard from '@shared/components/TrackerSettingsCard';
const Settings = () => {
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Parse active tab query parameter
  const query = new URLSearchParams(location.search);
  const activeTab = query.get('tab') || 'company-settings';

  // State for sub-modules placeholders
  const [isSyncing, setIsSyncing] = useState(false);
  const [designations, setDesignations] = useState([
    { title: 'Principal Engineer', department: 'Engineering', count: 12 },
    { title: 'Senior Product Designer', department: 'Design', count: 6 },
    { title: 'HR Lead Coordinator', department: 'HR', count: 2 },
    { title: 'Senior Payroll Specialist', department: 'Finance', count: 4 },
    { title: 'Growth Manager', department: 'Marketing', count: 8 }
  ]);

  const [newDesignation, setNewDesignation] = useState({ title: '', department: 'Engineering' });

  const handleAddDesignation = (e) => {
    e.preventDefault();
    if (!newDesignation.title.trim()) return;
    setDesignations(prev => [...prev, { title: newDesignation.title, department: newDesignation.department, count: 0 }]);
    setNewDesignation({ title: '', department: 'Engineering' });
  };

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* 2. COMPANY SETTINGS TAB */}
      {activeTab === 'company-settings' && (
        <div className="space-y-12">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-[#e2eae7] dark:border-[#1a2d29] pb-8">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">Company settings</h1>
              <p className="text-sm text-slate-500 dark:text-[#a3b3af] mt-2 font-medium">Manage organization profile, system latency, and credentials.</p>
            </div>
            <div className="flex gap-4">
              <button className="px-5 py-2 border border-[#dcdbd3] dark:border-[#1a2d29] bg-white dark:bg-[#111c18] hover:bg-[#eceae3]/50 dark:hover:bg-slate-800/50 text-[#5c5f5d] dark:text-[#cbd5e1] font-bold text-xs rounded-full cursor-pointer transition-all flex items-center gap-1.5">
                <X size={14} />
                Discard
              </button>
              <button 
                onClick={handleTriggerSync}
                className="px-5 py-2 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-full cursor-pointer transition-all shadow-sm border-none flex items-center gap-1.5"
              >
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {isSyncing ? 'Synchronizing...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* CORE CONFIGURATION GRID */}
          <div className="grid grid-cols-12 gap-10">
            {/* Identity & Branding Hub */}
            <div className="col-span-12 lg:col-span-7 space-y-10">
              <div className="bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] rounded-[24px] p-8 group">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-slate-50 dark:bg-[#111c18] rounded-xl text-[#00a76b] transition-all shadow-xs">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Organizational Identity</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Global branding & network visibility</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-100 dark:border-[#133029]">
                    <div className="relative group/logo">
                      <div className="w-20 h-20 rounded-2xl bg-[#111c18] flex items-center justify-center text-[#00a76b] font-black text-xl border border-white/5 shadow-xl transition-transform group-hover/logo:scale-105">
                        VHR
                      </div>
                      <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer">
                        <RefreshCw size={16} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Node Identity Asset</h4>
                      <p className="text-xs text-slate-400 mt-1 mb-2">SVG or High-Res Logic Recommended</p>
                      <button className="text-xs font-black text-[#00a76b] uppercase tracking-wider hover:underline border-none bg-transparent cursor-pointer">Update Asset</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#829e92]">Entity Designation</label>
                      <input type="text" defaultValue="Fluid HR Global Matrix" className="w-full bg-slate-50 dark:bg-[#111c18] border border-transparent rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white focus:border-[#00a76b] focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#829e92]">Core Network URL</label>
                      <input type="text" defaultValue="verdant.fluidhr.io" className="w-full bg-slate-50 dark:bg-[#111c18] border border-transparent rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white focus:border-[#00a76b] focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="col-span-full space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#829e92]">HQ Coordinate Address</label>
                      <input type="text" defaultValue="Global Infrastructure Center, Block A, SF" className="w-full bg-slate-50 dark:bg-[#111c18] border border-transparent rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white focus:border-[#00a76b] focus:bg-white outline-none transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Frequency Pillar */}
            <div className="col-span-12 lg:col-span-5 space-y-10">
              <div className="bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] rounded-[24px] p-8 group h-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-slate-50 dark:bg-[#111c18] rounded-xl text-[#00a76b] transition-all shadow-xs">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Operational Pulse</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Sync frequency & buffer logic</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#829e92] mb-3">Active Sync Days</p>
                    <div className="flex justify-between gap-2">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                        <button key={i} className={`flex-1 h-10 rounded-xl font-bold text-xs transition-all border-none ${i < 5 ? 'bg-[#00a76b] text-white' : 'bg-slate-100 dark:bg-[#111c18] text-slate-400 hover:bg-slate-200'} cursor-pointer`}>{day}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#829e92]">Pulse Start</label>
                      <input type="time" defaultValue="09:00" className="w-full bg-slate-50 dark:bg-[#111c18] rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white border-none outline-none focus:bg-[#00a76b]/5 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#829e92]">Pulse End</label>
                      <input type="time" defaultValue="18:00" className="w-full bg-slate-50 dark:bg-[#111c18] rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white border-none outline-none focus:bg-[#00a76b]/5 transition-all" />
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-[#111c18]/50 rounded-2xl border border-slate-100 dark:border-[#133029] relative overflow-hidden group/opt flex items-center justify-between">
                    <div className="z-10">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Latency Buffer</h4>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Allow personnel to clock-in within a defined operational window.</p>
                    </div>
                    <div className="relative cursor-pointer">
                      <ToggleRight size={38} className="text-[#00a76b]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Tracker Rules Card */}
            <div className="col-span-12">
              <TrackerSettingsCard />
            </div>

            {/* Safety Lock Actions */}
            <div className="col-span-12 bg-slate-900 dark:bg-[#06120e] rounded-[24px] p-8 relative overflow-hidden group">
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-white text-left">
                <div className="max-w-3xl">
                  <h3 className="text-sm font-bold text-[#00a76b] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Shield size={16} />
                    High-Level Authorization Control
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">
                    Critical maintenance operations and structural settings. These actions are non-reversible and require verified admin lead permissions. Proceed with caution.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full font-bold text-xs transition-all border border-white/10 cursor-pointer">Audit Trails</button>
                  <button className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-xs shadow-lg transition-all border-none cursor-pointer">Purge Registry</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DESIGNATIONS TAB */}
      {activeTab === 'designations' && (
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-[#e2eae7] dark:border-[#1a2d29] pb-8">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">Designations</h1>
              <p className="text-sm text-slate-500 dark:text-[#a3b3af] mt-2 font-medium">Manage occupational job titles and standard departments.</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] rounded-[24px] p-6 shadow-xs h-fit">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Add Designation</h3>
              <form onSubmit={handleAddDesignation} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Designation Name</label>
                  <input
                    type="text"
                    required
                    value={newDesignation.title}
                    onChange={(e) => setNewDesignation(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Lead Engineer"
                    className="w-full bg-slate-50 dark:bg-[#111c18] border border-transparent rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:border-[#00a76b] focus:bg-white outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Department</label>
                  <select
                    value={newDesignation.department}
                    onChange={(e) => setNewDesignation(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#111c18] border border-transparent rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Sales">Sales</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#00a76b] hover:bg-[#00915c] text-white font-bold text-xs rounded-xl transition-all border-none cursor-pointer shadow-xs flex items-center justify-center gap-1"
                >
                  <Plus size={14} />
                  <span>Create Designation</span>
                </button>
              </form>
            </div>

            <div className="col-span-12 lg:col-span-8 bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] rounded-[24px] p-6 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#133029] text-slate-400 dark:text-[#829e92] font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Job Designation Title</th>
                      <th className="pb-3">Department</th>
                      <th className="pb-3 text-center">Active Headcount</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#133029] font-semibold text-slate-700 dark:text-slate-200">
                    {designations.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#111c18]/30 transition-all">
                        <td className="py-4 pl-2 font-bold text-slate-900 dark:text-white">{item.title}</td>
                        <td className="py-4 text-[#00a76b]">{item.department}</td>
                        <td className="py-4 text-center">{item.count} employees</td>
                        <td className="py-4 text-right pr-2">
                          <button
                            onClick={() => setDesignations(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. AUDIT LOGS TAB */}
      {activeTab === 'audit-logs' && (
        <AuditLogs />
      )}

      {/* 5. INTEGRATIONS TAB */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-[#e2eae7] dark:border-[#1a2d29] pb-8">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">Integrations</h1>
              <p className="text-sm text-slate-500 dark:text-[#a3b3af] mt-2 font-medium">Link other external nodes and communication matrices to workforce OS.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Slack Node Sync', desc: 'Auto-publish daily attendance, time sync, and leave alerts to team channels.', active: true, descr: 'Connected' },
              { name: 'Google Calendar API', desc: 'Sync corporate schedules, holidays, and approved time-off directly.', active: false, descr: 'Offline' },
              { name: 'GitHub Action Webhooks', desc: 'Automate developer profile and active training assignments notifications.', active: true, descr: 'Connected' }
            ].map((node, i) => (
              <div key={i} className="bg-white dark:bg-[#0a1f1a] border border-[#e2eae7] dark:border-[#133029] rounded-[24px] p-6 flex flex-col justify-between group hover:shadow-xs transition-all relative overflow-hidden">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{node.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${node.active ? 'bg-emerald-50 dark:bg-[#133029] text-[#00a76b]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      {node.descr}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    {node.desc}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-[#133029]">
                  <span className="text-[10px] font-black uppercase text-slate-400">REST Client v2.1</span>
                  <button className={`px-4 py-1.5 font-bold text-[10px] uppercase rounded-full cursor-pointer transition-all border-none ${node.active ? 'bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100' : 'bg-[#00a76b] text-white hover:bg-[#00915c]'}`}>
                    {node.active ? 'Disable' : 'Enable Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TRAINING TAB */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-[#e2eae7] dark:border-[#1a2d29] pb-8">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">Training & Development</h1>
              <p className="text-sm text-slate-500 dark:text-[#a3b3af] mt-2 font-medium">Manage employee certification modules, classes, and active skill mapping logs.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0c1512] border border-[#e2eae7] dark:border-[#13221e] rounded-[24px] p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm">
            <GraduationCap size={48} className="mx-auto text-[#00a76b]" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Training Registry Module</h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              This module manages personnel qualifications and certification tracking logs. The training dashboard is currently being synchronized with the workforce OS pipeline.
            </p>
            <button className="px-6 py-2 bg-[#00a76b] text-white text-xs font-bold rounded-full border-none cursor-pointer hover:bg-[#00915c] transition-all">
              Initialize Local Sync
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="pt-16 text-center opacity-30 pb-12">
        <p className="text-[#848E9C] text-[10px] font-black uppercase tracking-[0.6em] leading-loose">
          Configuration Layer Trace ID: 0x992B-X1 <br />
          <span className="text-[#00a76b]">Verified Narrative Sync Active</span>
        </p>
      </div>
    </div>
  );
};

export default Settings;
