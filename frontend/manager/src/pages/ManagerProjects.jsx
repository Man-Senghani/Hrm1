import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, Target, Send, CheckCircle2, X, Plus,
    ArrowRight, Shield, Activity, TrendingUp, AlertTriangle
} from 'lucide-react';
import { createPortal } from 'react-dom';

const ManagerProjects = () => {
    const [projects, setProjects] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeProject, setActiveProject] = useState(null);
    const [selectedNodes, setSelectedNodes] = useState([]);
    const [assigning, setAssigning] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const token = sessionStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projRes, teamRes] = await Promise.all([
                axios.get('/api/projects/manager', { headers }),
                axios.get('/api/teams/my', { headers })
            ]);
            setProjects(projRes.data);
            setTeamMembers(teamRes.data?.members || []);
        } catch (error) {
            console.error('Fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const handleAssignNodes = async () => {
        try {
            setAssigning(true);
            await axios.put(`/api/projects/assign-employees/${activeProject._id}`, { employeeIds: selectedNodes }, { headers });
            setMessage({ type: 'success', text: 'Personnel nodes integrated successfully' });
            setActiveProject(null);
            setSelectedNodes([]);
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Integration Failure' });
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-6 opacity-30">
            <div className="w-12 h-12 border-4 border-t-[#3E74FF] border-zinc-100 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Optimizing Personnel Routing...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-semibold text-[#1E2026] tracking-tight leading-none mb-3 uppercase">
                        Mission <span className="text-[#3E74FF]">Matrix</span>
                    </h1>
                    <p className="text-[#848E9C] font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="w-12 h-[1px] bg-[#3E74FF]"></span>
                        Tactical Allocation Hub
                    </p>
                </div>
            </div>

            {/* ... message logic ... */}

            {/* PROJECT GRID */}
            {projects.length === 0 ? (
                <div className="p-20 border-2 border-dashed border-[#F5F5F5] rounded-[5px] flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-[#F5F5F5] rounded-full flex items-center justify-center text-[#848E9C] mb-6">
                        <TrendingUp size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-[#1E2026] uppercase italic tracking-tighter">No Active Missions</h3>
                    <p className="max-w-xs text-[#848E9C] font-bold text-[11px] mt-3 uppercase tracking-widest leading-relaxed">
                        Initialize projects in the Project Registry to begin deployment.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div key={project._id} className="bg-white border border-[#E6E8EA] rounded-[5px] p-8 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col min-h-[380px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5F5F5] rounded-full -mr-16 -mt-16 opacity-30 group-hover:scale-125 transition-all duration-700"></div>

                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black text-[#1E2026] uppercase tracking-tighter leading-none mb-1.5 italic">{project.projectName}</h3>
                                    <p className="text-[9px] font-black text-[#848E9C] uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Shield size={10} className="text-[#3E74FF]" />
                                        {project.department}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${project.status === 'active' ? 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20' : 'bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/20'
                                    }`}>
                                    {project.status}
                                </span>
                            </div>

                            <p className="text-[13px] font-bold text-[#848E9C] mb-8 leading-relaxed italic font-mono flex-grow line-clamp-3">"{project.description}"</p>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {project.assignedEmployees?.slice(0, 3).map((emp, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center font-black text-[8px] text-[#3E74FF]">
                                                {emp.name?.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[9px] font-black text-[#848E9C] uppercase tracking-widest">{project.assignedEmployees?.length || 0} Assets</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveProject(project)}
                                className="mt-8 py-4 bg-[#1E2026] text-white rounded-[5px] flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest hover:bg-[#3E74FF] transition-all group/btn active:scale-95 shadow-lg"
                            >
                                <TrendingUp size={16} />
                                Manage Tactical Team
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ASSIGNMENT MODAL */}
            {activeProject && createPortal(
                <div
                    onClick={() => setActiveProject(null)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-[#000000]/60 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl bg-white rounded-[5px] shadow-[0_32px_128px_rgba(0,0,0,0.18)] border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] cursor-default"
                    >
                        {/* SOPHISTICATED HEADER */}
                        <div className="bg-[#0F172A] p-10 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] mb-1.5 block">Operation: Resource Allocation</span>
                                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                                    Strategic <span className="text-indigo-400 font-normal">Personnel Deployment</span>
                                </h2>
                                <p className="text-slate-400 text-[11px] font-medium mt-1">Deploying to: <span className="text-white font-bold">{activeProject.projectName}</span></p>
                            </div>
                            <button onClick={() => setActiveProject(null)} className="relative z-10 w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50/50">
                            {/* SEARCH/STATS BAR */}
                            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center px-8">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{teamMembers.length} Active Nodes</span>
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    Tier 1 Verification <Shield size={10} />
                                </div>
                            </div>

                            <div className="p-6 px-8 space-y-3">
                                {teamMembers.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center text-center">
                                        <Users size={32} className="text-slate-200 mb-4" />
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Registry Empty</p>
                                    </div>
                                ) : teamMembers.map((emp) => {
                                    const isAlreadyAssigned = activeProject.assignedEmployees?.some(ae => ae._id === emp._id);
                                    const isSelected = selectedNodes.includes(emp._id);
                                    return (
                                        <div
                                            key={emp._id}
                                            onClick={() => {
                                                if (isAlreadyAssigned) return;
                                                setSelectedNodes(prev => prev.includes(emp._id) ? prev.filter(id => id !== emp._id) : [...prev, emp._id]);
                                            }}
                                            className={`group flex items-center justify-between p-4 px-6 rounded-[5px] border transition-all duration-200 ${isAlreadyAssigned ? 'bg-slate-50/50 border-slate-100 opacity-40 grayscale cursor-not-allowed' :
                                                    isSelected ? 'bg-white border-indigo-600 shadow-sm ring-1 ring-indigo-600/10' :
                                                        'bg-white border-slate-200 hover:border-indigo-400 cursor-pointer shadow-sm hover:translate-x-1'
                                                }`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center font-bold text-lg transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-100'
                                                    }`}>
                                                    {emp.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-bold text-slate-800 leading-none mb-1">{emp.name}</p>
                                                    <p className="text-[11px] font-medium text-slate-500">{emp.email}</p>
                                                </div>
                                            </div>

                                            {isAlreadyAssigned ? (
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-3 py-1 rounded-full bg-slate-100">
                                                    Assigned
                                                </div>
                                            ) : isSelected ? (
                                                <div className="w-8 h-8 bg-indigo-600 rounded-[5px] flex items-center justify-center text-white shadow-lg">
                                                    <CheckCircle2 size={18} />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-[5px] flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
                                                    <Plus size={20} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* SOPHISTICATED FOOTER */}
                        <div className="p-8 px-10 border-t border-slate-200 bg-white flex justify-between items-center">
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-slate-900 tabular-nums">{selectedNodes.length}</span>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nodes Selected</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActiveProject(null)}
                                    className="px-6 py-3.5 text-[12px] font-bold text-slate-600 hover:text-slate-900 transition-colors uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={selectedNodes.length === 0 || assigning}
                                    onClick={handleAssignNodes}
                                    className="px-10 py-3.5 bg-indigo-600 text-white rounded-[5px] font-bold text-[12px] uppercase tracking-widest shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:bg-slate-950 hover:shadow-none hover:translate-y-[-2px] active:translate-y-0 disabled:opacity-30 disabled:translate-y-0 transition-all flex items-center gap-3"
                                >
                                    {assigning ? 'Scheduling...' : 'Confirm Deployment'}
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.getElementById('modal-root')
            )}
        </div>
    );
};

export default ManagerProjects;
