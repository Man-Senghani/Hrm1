import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, ArrowUpRight, Shield, RefreshCw } from 'lucide-react';

const LeaveBalanceWidget = () => {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const token = sessionStorage.getItem('token');
                const res = await axios.get('/api/leaves/balance', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBalance(res.data);
            } catch (err) {
                console.error('Leave Sync Failure');
            } finally {
                setLoading(false);
            }
        };
        fetchBalance();
    }, []);

    if (loading) return (
        <div className="bg-[#201515] text-white p-10 rounded-2xl animate-pulse">
            <p className="zap-caption-upper text-[#939084]">Synchronizing Quota...</p>
        </div>
    );

    return (
        <div className="bg-[#201515] text-white p-10 rounded-2xl relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00a76b]/5 blur-[100px] -mr-20 -mt-20 group-hover:bg-[#00a76b]/10 transition-all duration-700"></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00a76b] mb-3">Leave Carry Forward</p>
                      <h3 className="text-[32px] font-black italic uppercase leading-none tracking-tighter">Personal <span className="text-[#00a76b]">Ledger.</span></h3>
                   </div>
                   <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#00a76b]">
                      <Shield size={24} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                   <div>
                      <h4 className="text-[48px] font-black tabular-nums leading-none mb-2">{balance?.remaining || 0}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#939084]">Remaining Units</p>
                   </div>
                   <div>
                      <h4 className="text-[48px] font-black tabular-nums leading-none mb-2 text-[#939084]">{balance?.totalUsed || 0}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#939084]">Units Consumed</p>
                   </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-[#939084] uppercase tracking-widest mb-1">Monthly Accrual</span>
                         <span className="text-[13px] font-bold">1.5 Days / Mo</span>
                      </div>
                      <div className="w-[1px] h-8 bg-white/10"></div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-[#939084] uppercase tracking-widest mb-1">Carried Forward</span>
                         <span className="text-[13px] font-bold text-[#00a76b]">{balance?.currentMonth?.carried || 0} Days</span>
                      </div>
                   </div>
                   <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#00a76b] transition-all flex items-center justify-center border-none cursor-pointer">
                      <ArrowUpRight size={18} className="text-white" />
                   </button>
                </div>
            </div>

            <Calendar size={120} className="absolute -right-6 -bottom-6 text-white/5 rotate-12 pointer-events-none group-hover:text-white/10 transition-all duration-700" />
        </div>
    );
};

export default LeaveBalanceWidget;
