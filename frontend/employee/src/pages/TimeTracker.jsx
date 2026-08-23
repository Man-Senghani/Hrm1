import React from 'react';
import { Play, Clock, PieChart, Activity, Download, Search, Filter, ArrowUpRight, CheckCircle, TrendingUp } from 'lucide-react';

const TimeTracker = () => {
  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-4xl font-black text-[#1E2026] tracking-tight leading-none mb-3">
            Time <span className="text-[#F0B90B]">Tracker</span>
          </h1>
          <p className="text-[#848E9C] font-bold text-[11px] uppercase tracking-[0.2em] flex items-center gap-3">
            <span className="w-12 h-[2px] bg-[#F0B90B]"></span>
            Productivity Synchronization Pulse
          </p>
        </div>
        <button className="bg-[#F0B90B] text-[#1E2026] px-10 py-4 rounded-full font-black text-[13px] uppercase tracking-wider shadow-lg hover:bg-[#FFD000] transition-all flex items-center gap-3">
          <Play size={18} fill="currentColor" />
          Start Live Timer
        </button>
      </div>

      {/* TELEMETRY GRID */}
      <div className="grid grid-cols-12 gap-8">
        {/* Weekly Hub */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-[#E6E8EA] rounded-3xl p-10 relative overflow-hidden group">
           <div className="flex justify-between items-center mb-10">
              <div>
                 <h3 className="text-[12px] font-black text-[#1E2026] uppercase tracking-[0.2em] mb-1">Weekly Activity Sync</h3>
                 <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest">Logged productivity across personnel clusters</p>
              </div>
              <div className="flex gap-2 p-1 bg-[#F5F5F5] rounded-lg">
                 <button className="px-4 py-1.5 bg-white text-[#1E2026] text-[10px] font-black rounded-md shadow-sm uppercase">Weekly</button>
                 <button className="px-4 py-1.5 text-[#848E9C] text-[10px] font-black rounded-md uppercase">Monthly</button>
              </div>
           </div>
           
           <div className="h-44 flex items-end justify-between gap-4 px-4 overflow-hidden">
             {[60, 80, 75, 50, 90, 20, 15].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                   <div className="w-full bg-[#F5F5F5] rounded-t-xl relative h-full overflow-hidden flex flex-col justify-end shadow-inner">
                      <div className="absolute inset-0 bg-[#F0B90B]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="bg-[#1E2026]/10 w-full rounded-t-lg transition-all" style={{ height: `${h}%` }}></div>
                      <div className="bg-[#1E2026] w-full absolute bottom-0 rounded-t-lg transition-all group-hover:bg-[#F0B90B] group-hover:shadow-[0_0_15px_rgba(240,185,11,0.3)]" style={{ height: `${h * 0.7}%` }}></div>
                   </div>
                   <span className="text-[10px] font-black text-[#848E9C] uppercase tracking-widest font-mono italic">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                </div>
             ))}
           </div>
        </div>

        {/* Ratio Gauge */}
        <div className="col-span-12 lg:col-span-4 bg-[#1E2026] rounded-3xl p-10 text-white relative overflow-hidden shadow-xl group border border-white/5">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#F0B90B]/10 blur-3xl rounded-full"></div>
           <div className="relative z-10">
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] mb-1 text-[#F0B90B]">Efficiency Ratio</h3>
              <p className="text-[#848E9C] text-[9px] font-bold uppercase tracking-widest opacity-60">Billable vs Internal Sync</p>
           </div>
           <div className="relative flex items-center justify-center my-10 py-4">
              <div className="w-36 h-36 rounded-full border-[10px] border-white/5 flex items-center justify-center relative">
                 <div className="absolute inset-0 rounded-full border-[10px] border-[#F0B90B] border-t-transparent border-r-transparent transform -rotate-45"></div>
                 <div className="text-center">
                    <span className="text-4xl font-black tabular-nums tracking-tighter">75%</span>
                    <p className="text-[8px] font-black text-[#848E9C] uppercase tracking-[0.2em] mt-1">Target Sync</p>
                 </div>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                 <p className="text-[9px] font-black text-[#848E9C] uppercase mb-1">Billable</p>
                 <p className="text-lg font-black tabular-nums">32.5 <span className="text-[10px]">h</span></p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                 <p className="text-[9px] font-black text-[#848E9C] uppercase mb-1">Internal</p>
                 <p className="text-lg font-black tabular-nums text-[#F0B90B]">10.2 <span className="text-[10px]">h</span></p>
              </div>
           </div>
        </div>
      </div>

      {/* PROJECT TELEMETRY */}
      <div className="bg-white border border-[#E6E8EA] rounded-2xl overflow-hidden shadow-[0_3px_5px_rgba(32,32,37,0.05)]">
        <div className="p-8 bg-[#F5F5F5]/30 border-b border-[#E6E8EA] flex flex-col md:flex-row justify-between items-center gap-6">
           <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1E2026]">Project Telemetry Audit</h3>
           <div className="flex gap-3">
              <button className="px-6 py-2 bg-white text-[#1E2026] border border-[#E6E8EA] rounded-full text-[10px] font-black uppercase tracking-widest hover:border-[#F0B90B] transition-all flex items-center gap-2">
                 <Download size={14} />
                 Export Trace
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F5F5]/30 border-b border-[#E6E8EA]">
                <th className="px-10 py-5 text-[10px] font-black text-[#848E9C] uppercase tracking-widest">Structural Project</th>
                <th className="px-10 py-5 text-[10px] font-black text-[#848E9C] uppercase tracking-widest">Sync State</th>
                <th className="px-10 py-5 text-[10px] font-black text-[#848E9C] uppercase tracking-widest">Logged Units</th>
                <th className="px-10 py-5 text-[10px] font-black text-[#848E9C] uppercase tracking-widest text-right">Ops Logic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E8EA]">
              {[
                { name: 'Artemis Architecture', client: 'Starlight Hub', status: 'Online', time: '142.5h', fill: 85 },
                { name: 'Internal Audit Sync', client: 'Central Logic', status: 'Pending', time: '28.0h', fill: 25 },
                { name: 'Cloud Node Migration', client: 'Nexus Node', status: 'Paused', time: '89.2h', fill: 60 }
              ].map((row, i) => (
                <tr key={i} className="hover:bg-[#F5F5F5] transition-colors group cursor-default">
                  <td className="px-10 py-6">
                     <div className="flex items-center gap-4">
                        <div className="w-1 h-10 rounded-full bg-[#1E2026] group-hover:bg-[#F0B90B] transition-colors"></div>
                        <div>
                           <p className="text-[13px] font-black text-[#1E2026] uppercase group-hover:text-[#F0B90B] transition-colors">{row.name}</p>
                           <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-tighter">Segment: {row.client}</p>
                        </div>
                     </div>
                  </td>
                  <td className="px-10 py-6">
                     <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white border border-[#E6E8EA] ${row.status === 'Online' ? 'text-[#0ECB81]' : 'text-[#848E9C]'}`}>{row.status}</span>
                  </td>
                  <td className="px-10 py-6">
                     <div className="flex flex-col gap-2">
                        <span className="text-[13px] font-black text-[#1E2026] tabular-nums">{row.time}</span>
                        <div className="w-24 h-1 bg-[#F5F5F5] rounded-full overflow-hidden">
                           <div className="h-full bg-[#1E2026] group-hover:bg-[#F0B90B] transition-all duration-1000" style={{ width: `${row.fill}%` }}></div>
                        </div>
                     </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                     <button className="text-[10px] font-black text-[#848E9C] uppercase tracking-widest hover:text-[#1E2026] transition-colors">Audit Node</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;
