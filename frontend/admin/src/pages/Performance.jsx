import React from 'react';
import { TrendingUp, Award, Target, Brain, PieChart, CheckCircle, AlertCircle, ArrowUpRight, Search, Download } from 'lucide-react';

const Performance = () => {
   return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-8">

         {/* HEADER */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
               <h1 className="text-2xl font-semibold text-[#1E2026] tracking-tight leading-none mb-2">
                  Performance <span className="text-[#F0B90B]">Matrix</span>
               </h1>
               <p className="text-[#848E9C] font-bold text-[11px] uppercase tracking-[0.2em] flex items-center gap-3">
                  <span className="w-12 h-[2px] bg-[#F0B90B]"></span>
                  Talent Optimization Protocols
               </p>
            </div>
            <button className="bg-[#F0B90B] text-[#1E2026] px-6 py-2.5 rounded-full font-semibold text-[13px] uppercase tracking-wider shadow-md hover:bg-[#FFD000] transition-all flex items-center gap-2">
               <Award size={16} />
               Initialize Review
            </button>
         </div>

         {/* BENTO HUB GRID */}
         <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-8 bg-white border border-[#E6E8EA] rounded-2xl p-6 relative overflow-hidden group">
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="text-[12px] font-black text-[#1E2026] uppercase tracking-[0.2em] mb-1">Quarterly Efficiency Trend</h3>
                     <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest">Aggregate scoring across organizational nodes</p>
                  </div>
                  <div className="flex gap-2 bg-[#F5F5F5] p-1 rounded-lg">
                     <button className="px-4 py-1.5 bg-white text-[#1E2026] text-[10px] font-black rounded-md shadow-sm uppercase">Trace</button>
                     <button className="px-4 py-1.5 text-[#848E9C] text-[10px] font-black rounded-md uppercase">Archive</button>
                  </div>
               </div>

               <div className="h-44 flex items-end justify-between gap-4 px-4 overflow-hidden">
                  {[30, 45, 60, 40, 75, 85].map((h, i) => (
                     <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className={`w-full rounded-t-xl transition-all duration-700 shadow-sm ${i === 5 ? 'bg-[#F0B90B]' : 'bg-[#1E2026]/5 group-hover:bg-[#1E2026]/10'}`} style={{ height: `${h}%` }}></div>
                        <span className="text-[10px] font-black text-[#848E9C] group-hover:text-[#1E2026] uppercase tracking-widest transition-colors font-mono">{['Q1', 'Q2', 'Q3', 'Q4', 'Q1', 'Q2'][i]}</span>
                     </div>
                  ))}
               </div>

               <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-[#E6E8EA]">
                  {[
                     { label: 'Avg Pulse', val: '4.2', sub: '+12% Global', color: 'text-[#0ECB81]' },
                     { label: 'Completion Rate', val: '88%', sub: 'Target Range', color: 'text-[#848E9C]' },
                     { label: 'Top Performers', val: '24', sub: 'Hub Ready', color: 'text-[#F0B90B]' }
                  ].map((node, i) => (
                     <div key={i}>
                        <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-[0.2em] mb-2">{node.label}</p>
                        <div className="flex items-baseline gap-2">
                           <span className="text-[18px] font-black text-[#1E2026] tabular-nums leading-none tracking-tighter">{node.val}</span>
                           <span className={`text-[10px] font-black ${node.color} uppercase`}>{node.sub}</span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8">
               <div className="bg-[#222126] rounded-3xl p-10 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#F0B90B]/10 blur-3xl rounded-full"></div>
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] mb-8 text-[#848E9C] flex items-center gap-2">
                     <Target size={18} className="text-[#F0B90B]" />
                     Logic Goals Sync
                  </h3>
                  <div className="space-y-8">
                     {[
                        { label: 'System Velocity', val: 92 },
                        { label: 'Customer SLA', val: 78 },
                        { label: 'Architecture Scale', val: 64 }
                     ].map((goal, i) => (
                        <div key={i}>
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                              <span className="text-[#848E9C]">{goal.label}</span>
                              <span className="text-[#F0B90B] tabular-nums">{goal.val}% SYNC</span>
                           </div>
                           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-[#F0B90B] shadow-[0_0_10px_rgba(240,185,11,0.5)] transition-all duration-1000" style={{ width: `${goal.val}%` }}></div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="bg-white border border-[#E6E8EA] rounded-3xl p-10 flex flex-col justify-between group cursor-pointer hover:border-[#F0B90B] transition-all">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center text-[#F0B90B] shadow-sm group-hover:bg-[#F0B90B] group-hover:text-white transition-all">
                        <Brain size={24} />
                     </div>
                     <h3 className="text-[12px] font-black text-[#1E2026] uppercase tracking-[0.2em]">Sync Analytics AI</h3>
                  </div>
                  <p className="text-[11px] font-bold text-[#848E9C] leading-relaxed uppercase tracking-tight mb-8">
                     "Architecture node performance is up 12% following the shift to decentralized agile cycles. Deploy to all hubs."
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-black text-[#F0B90B] uppercase tracking-widest border-t border-[#E6E8EA] pt-6">
                     <span>Full Matrix Audit</span>
                     <ArrowUpRight size={16} />
                  </div>
               </div>
            </div>
         </div>

         {/* REVIEW REGISTER TABLE */}
         <div className="bg-white border border-[#E6E8EA] rounded-2xl overflow-hidden shadow-[0_3px_5px_rgba(32,32,37,0.05)]">
            <div className="p-8 bg-[#F5F5F5]/30 border-b border-[#E6E8EA] flex flex-col md:flex-row justify-between items-center gap-6">
               <div>
                  <h3 className="text-[12px] font-black text-[#1E2026] uppercase tracking-[0.2em] mb-1">Cycle Review Registry</h3>
                  <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-[0.1em]">Verification statuses for personnel nodes</p>
               </div>
               <div className="flex items-center gap-4 bg-white px-5 py-2 rounded-full border border-[#E6E8EA] focus-within:border-[#F0B90B] transition-all w-72 shadow-sm">
                  <Search size={14} className="text-[#848E9C]" />
                  <input type="text" placeholder="Find node trace..." className="bg-transparent border-none focus:outline-none text-[12px] font-bold text-[#1E2026] w-full" />
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-[#F5F5F5]/30 border-b border-[#E6E8EA]">
                        <th className="px-10 py-5 text-[10px] font-black text-[#848E9C] uppercase tracking-widest">Personnel Node</th>
                        <th className="px-10 py-5 text-[10px] font-black text-[#848E9C] uppercase tracking-widest">Structural Hub</th>
                        <th className="px-10 py-5 text-[10px] font-black text-[#848E9C] uppercase tracking-widest">Protocol Type</th>
                        <th className="px-10 py-5 text-[10px] font-black text-[#848E9C] uppercase tracking-widest">Sync State</th>
                        <th className="px-10 py-5 text-[10px] font-black text-[#848E9C] uppercase tracking-widest text-right">Ops Logic</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E8EA]">
                     {[
                        { name: 'Sarah Chen', role: 'Architect', dept: 'System Engine', type: 'Quarterly Check-in', status: 'Urgent Trace', color: 'text-[#F6465D]', bg: 'bg-[#F6465D]/10' },
                        { name: 'Marcus Thompson', role: 'Lead', dept: 'Market Hub', type: 'Annual Appraisal', status: 'Scheduled', color: 'text-[#848E9C]', bg: 'bg-[#F5F5F5]' }
                     ].map((row, i) => (
                        <tr key={i} className="hover:bg-[#F5F5F5] transition-colors group cursor-default">
                           <td className="px-10 py-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#1E2026] font-black text-[10px]">SC</div>
                                 <div>
                                    <p className="text-[13px] font-black text-[#1E2026] uppercase group-hover:text-[#F0B90B] transition-colors">{row.name}</p>
                                    <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-tighter">{row.role}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-10 py-6 text-[11px] font-bold text-[#848E9C] uppercase tracking-widest">{row.dept}</td>
                           <td className="px-10 py-6 text-[11px] font-black text-[#1E2026] uppercase">{row.type}</td>
                           <td className="px-10 py-6">
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${row.bg} ${row.color}`}>{row.status}</span>
                           </td>
                           <td className="px-10 py-6 text-right">
                              <button className="text-[10px] font-black text-[#F0B90B] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Analyze Node</button>
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

export default Performance;
