import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Target, Clock, CheckCircle2, Zap, ArrowUpRight, 
    MoreVertical, ExternalLink, Activity, Shield, AlertCircle,
    Briefcase, X, Calendar, User
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import TaskDetailView from '../../components/TaskDetailView';

const EmployeeProjects = () => {
    const location = useLocation();
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

    const token = sessionStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async (silentParam = false) => {
        const silent = silentParam === true;
        try {
            if (!silent) setLoading(true);
            const [tasksRes, projectsRes] = await Promise.all([
                axios.get('/api/tasks/my', { headers }),
                axios.get('/api/projects/my', { headers })
            ]);
            const fetchedTasks = Array.isArray(tasksRes.data)
                ? tasksRes.data
                : Array.isArray(tasksRes.data?.data)
                    ? tasksRes.data.data
                    : Array.isArray(tasksRes.data?.tasks)
                        ? tasksRes.data.tasks
                        : [];

            const fetchedProjects = Array.isArray(projectsRes.data)
                ? projectsRes.data
                : Array.isArray(projectsRes.data?.data)
                    ? projectsRes.data.data
                    : Array.isArray(projectsRes.data?.projects)
                        ? projectsRes.data.projects
                        : [];

            setTasks(fetchedTasks);
            setProjects(fetchedProjects);
        } catch (error) {
            console.error('Data Sync Failure:', error);
            setTasks([]);
            setProjects([]);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 🎯 DEEP LINKING OBSERVER: Watch for taskId in URL changes
    useEffect(() => {
        if (!loading && tasks.length > 0) {
            const params = new URLSearchParams(location.search);
            const taskId = params.get('taskId');
            if (taskId) {
                const targetTask = tasks.find(t => t._id === taskId);
                if (targetTask) {
                    setSelectedTask(targetTask);
                    setIsTaskModalOpen(true);
                }
            }
        }
    }, [location.search, tasks, loading]);

    const statusColors = {
        assigned: 'bg-gray-500',
        in_progress: 'bg-blue-500',
        submitted: 'bg-emerald-500',
        under_review: 'bg-purple-500',
        completed: 'bg-green-500',
        rework: 'bg-red-500',
        active: 'bg-green-500',
        pending: 'bg-emerald-500'
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-6 opacity-30">
            <div className="w-12 h-12 border-4 border-t-[#00a76b] border-[#eceae3] rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Synchronizing Active Arcs...</p>
        </div>
    );

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeProjects = Array.isArray(projects) ? projects : [];
    const hasAssignments = safeTasks.length > 0 || safeProjects.length > 0;

    return (
        <>
            <div className="space-y-12 animate-in fade-in duration-700 pb-20 max-w-[1600px] mx-auto">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#00a76b] mb-2">My Work Hub V4.2</p>
                        <h1 className="text-6xl font-black text-[#201515] tracking-tighter leading-none mb-3 uppercase">
                            My <span className="text-[#00a76b]">Tasks.</span>
                        </h1>
                        <p className="text-[#939084] font-bold text-[11px] uppercase tracking-[0.2em] flex items-center gap-3">
                            <span className="w-12 h-[2px] bg-[#00a76b]"></span>
                            See all your assigned work here
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-[#eceae3]/50 p-2 rounded-2xl border border-[#c5c0b1]">
                        <div className="px-6 py-3 bg-white rounded-xl shadow-sm">
                            <p className="text-[9px] font-black text-[#939084] uppercase tracking-widest mb-1">Total Work</p>
                            <p className="text-xl font-black text-[#201515]">{safeTasks.length + safeProjects.length}</p>
                        </div>
                        <div className="px-6 py-3 bg-white rounded-xl shadow-sm">
                            <p className="text-[9px] font-black text-[#939084] uppercase tracking-widest mb-1">Active Now</p>
                            <p className="text-xl font-black text-[#00a76b]">{safeTasks.filter(t => t.status !== 'completed').length + safeProjects.filter(p => p.status !== 'completed').length}</p>
                        </div>
                    </div>
                </div>

                {!hasAssignments ? (
                    <div className="p-32 bg-white border border-[#c5c0b1] rounded-[48px] flex flex-col items-center text-center shadow-sm">
                        <div className="w-24 h-24 bg-[#eceae3] rounded-3xl flex items-center justify-center text-[#939084] mb-8">
                            <Target size={48} />
                        </div>
                        <h3 className="text-3xl font-black text-[#201515] uppercase italic tracking-tighter">No Work Assigned Yet</h3>
                        <p className="text-[#939084] font-bold text-[12px] mt-4 uppercase tracking-[0.3em]">Waiting for your manager to assign work</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {/* PROJECTS SECTION */}
                        {safeProjects.length > 0 && (
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-[14px] font-black uppercase tracking-[0.4em] text-[#201515]">My Projects</h2>
                                    <div className="h-[1px] bg-[#c5c0b1] flex-1"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {safeProjects.map((project) => (
                                        <div key={project._id} className="bg-white border border-[#c5c0b1] rounded-[40px] p-8 hover:border-[#00a76b] transition-all group relative overflow-hidden shadow-sm flex flex-col min-h-[320px]">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="p-3 rounded-2xl bg-[#eceae3] text-[#201515] group-hover:bg-[#00a76b] group-hover:text-white transition-all">
                                                    <Briefcase size={20} />
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${statusColors[project.status] || 'bg-gray-400'}`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-black text-[#201515] uppercase tracking-tighter italic mb-2">{project.projectName}</h3>
                                            <p className="text-[12px] font-bold text-[#939084] mb-6 line-clamp-2 italic">"{project.description}"</p>
                                            
                                            <div className="mt-auto space-y-4">
                                                <div className="pt-4 border-t border-[#eceae3] flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-[#201515] flex items-center justify-center text-[10px] text-white font-bold">
                                                            {project.assignedManager?.name?.charAt(0)}
                                                        </div>
                                                        <span className="text-[10px] font-black text-[#201515] uppercase italic">{project.assignedManager?.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-[#939084] uppercase tracking-widest">
                                                        {new Date(project.startDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button 
                                                        onClick={() => { setSelectedProject(project); setIsProjectModalOpen(true); }}
                                                        className="verdant-btn-secondary" style={{ flex: 1, height: 38, fontSize: 11 }}
                                                    >
                                                        Details
                                                    </button>
                                                    <button 
                                                        onClick={() => { setSelectedProject(project); setIsProjectModalOpen(true); }}
                                                        className="verdant-btn-primary" style={{ flex: 1, height: 38, fontSize: 11 }}
                                                    >
                                                        Start Work
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TASKS SECTION */}
                        {safeTasks.length > 0 && (
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-[14px] font-black uppercase tracking-[0.4em] text-[#201515]">Specific Tasks</h2>
                                    <div className="h-[1px] bg-[#c5c0b1] flex-1"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {safeTasks.map((task) => (
                                        <div key={task._id} className="bg-white border border-[#c5c0b1] rounded-[40px] p-8 hover:border-[#00a76b] transition-all group relative overflow-hidden shadow-sm flex flex-col min-h-[400px]">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="p-3 rounded-2xl bg-[#eceae3] text-[#201515] group-hover:bg-[#00a76b] group-hover:text-white transition-all">
                                                    <Target size={20} />
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${statusColors[task.status] || 'bg-gray-400'}`}>
                                                        {task.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[8px] font-black text-[#939084] uppercase tracking-widest">ID: {task._id.substring(18)}</span>
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-black text-[#201515] uppercase tracking-tighter italic mb-2 group-hover:text-[#00a76b] transition-colors">{task.title}</h3>
                                            <p className="text-[12px] font-bold text-[#939084] mb-6 line-clamp-3 italic">"{task.description}"</p>
                                            
                                            <div className="mt-auto space-y-6">
                                                {/* METADATA */}
                                                <div className="pt-4 border-t border-[#eceae3] grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[8px] font-black text-[#939084] uppercase tracking-widest mb-1">Priority</p>
                                                        <p className="text-[10px] font-black text-[#201515] uppercase italic">{task.priority}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-[#939084] uppercase tracking-widest mb-1">Deadline</p>
                                                        <p className="text-[10px] font-black text-[#00a76b] uppercase italic">{new Date(task.dueDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>

                                                {/* PROGRESS & ACTIONS */}
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 flex flex-col gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setIsTaskModalOpen(true); }}
                                                            className="verdant-btn-secondary" style={{ width: '100%', height: 36, fontSize: 11, gap: 4 }}
                                                        >
                                                            Details <ArrowUpRight size={12} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setIsTaskModalOpen(true); }}
                                                            className="verdant-btn-primary" style={{ width: '100%', height: 36, fontSize: 11, gap: 4 }}
                                                        >
                                                            Execute <Zap size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {task.status === 'rework' && (
                                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* TASK DETAIL MODAL */}
            {selectedTask && isTaskModalOpen && (
                <TaskDetailView 
                    task={tasks.find(t => t._id === selectedTask._id) || selectedTask}
                    onClose={() => {
                        setIsTaskModalOpen(false);
                        setSelectedTask(null);
                        fetchData(true);
                    }}
                />
            )}

            {/* PROJECT DETAIL MODAL */}
            {isProjectModalOpen && selectedProject && createPortal(
                <div 
                    onClick={() => setIsProjectModalOpen(false)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-white/10 backdrop-blur-xl animate-in fade-in duration-300 cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl bg-white border border-[#c5c0b1] rounded-3xl shadow-[0_40px_120px_rgba(0,0,0,0.1)] p-12 relative cursor-default overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#eceae3]/30 rounded-full -mr-20 -mt-20"></div>
                        
                        <button onClick={() => setIsProjectModalOpen(false)} className="absolute top-8 right-8 text-[#939084] hover:text-[#201515] transition-all">
                            <X size={24} />
                        </button>

                        <div className="mb-10 relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00a76b] mb-2 italic">Project Details</p>
                            <h2 className="text-4xl font-black text-[#201515] uppercase tracking-tighter italic leading-none">{selectedProject.projectName}</h2>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-[#eceae3]/50 rounded-[24px] border border-[#c5c0b1]/30">
                                    <p className="text-[9px] font-black text-[#939084] uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <User size={12} /> Manager
                                    </p>
                                    <p className="text-[13px] font-black text-[#201515] uppercase italic">{selectedProject.assignedManager?.name}</p>
                                    <p className="text-[10px] font-bold text-[#939084] lowercase">{selectedProject.assignedManager?.email}</p>
                                </div>
                                <div className="p-6 bg-[#eceae3]/50 rounded-[24px] border border-[#c5c0b1]/30">
                                    <p className="text-[9px] font-black text-[#939084] uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Calendar size={12} /> Work Dates
                                    </p>
                                    <p className="text-[11px] font-black text-[#201515] uppercase tracking-widest">{new Date(selectedProject.startDate).toLocaleDateString()} — {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'Continuous'}</p>
                                </div>
                            </div>

                            <div className="p-8 bg-white border border-[#c5c0b1] rounded-[32px] shadow-sm">
                                <p className="text-[9px] font-black text-[#939084] uppercase tracking-widest mb-4">Project Description</p>
                                <p className="text-[15px] font-bold text-[#36342e] leading-relaxed italic">
                                    "{selectedProject.description}"
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setIsProjectModalOpen(false)}
                                    className="verdant-btn-secondary" style={{ flex: 1 }}
                                >
                                    Close
                                </button>
                                <button 
                                    onClick={() => setIsProjectModalOpen(false)}
                                    className="verdant-btn-primary" style={{ flex: 1, gap: 8 }}
                                >
                                    Start Working <Zap size={16} fill="white" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.getElementById('modal-root')
            )}
        </>
    );
};

export default EmployeeProjects;
