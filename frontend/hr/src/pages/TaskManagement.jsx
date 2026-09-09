import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Plus, Edit, Trash2, CheckCircle2, 
  Clock, AlertCircle, FileText, Download, Eye, ArrowRight,
  MoreVertical, Calendar, User, Briefcase, RefreshCw, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Universal Gallery State
  const [previewGallery, setPreviewGallery] = useState({ items: [], index: 0 });

  const role = sessionStorage.getItem('role');
  const token = sessionStorage.getItem('token');
  const navigate = useNavigate();

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/tasks', { headers });
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`/api/tasks/${id}`, { status }, { headers });
      toast.success(`Mission status: ${status}`);
      fetchTasks();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const quickCompleteTask = async (id) => {
    try {
      await axios.put(`/api/tasks/${id}`, { status: 'Completed' }, { headers });
      toast.success('Mission Accomplished');
      fetchTasks();
    } catch (err) {
      toast.error('Status injection failed');
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Erase this mission log permanently?')) return;
    try {
      await axios.delete(`/api/tasks/${id}`, { headers });
      toast.success('Mission Expunged');
      fetchTasks();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const openGallery = (attachments, startIndex = 0) => {
    if (!attachments || attachments.length === 0) return;

    const galleryItems = attachments.map(file => {
      // Precise mapping to DB schema
      const filePath = file.fileName || file.path || file.filename || '';
      const fileUrl = file.fileUrl || file.url || '';
      const fileType = file.fileType || file.type || '';
      const name = file.name || filePath || 'Mission Evidence';
      
      const isImage = (fileType.startsWith('image/')) || (name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i));
      
      let url = '';
      if (file instanceof File) {
        url = URL.createObjectURL(file);
      } else {
        url = fileUrl || (filePath ? `/api/uploads/${filePath}` : '');
      }

      return { url, name, isImage };
    });
    
    setPreviewGallery({ items: galleryItems, index: startIndex });
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                         task.assignedTo?.name?.toLowerCase().includes(searchTerm.trim().toLowerCase());
    const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Ongoing': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  return (
    <div className="p-4 md:p-8 bg-[#fcfcfc] min-h-screen animate-in fade-in duration-500">
      {/* Universal Multi-Image Lightbox */}
      {previewGallery.items.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-[#201515]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <button onClick={() => setPreviewGallery({ items: [], index: 0 })} className="absolute top-6 right-6 w-12 h-12 rounded-[5px] bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border-none cursor-pointer z-[10001]">
            <X size={24} />
          </button>
          
          {previewGallery.items.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setPreviewGallery(prev => ({ ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length })) }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-[5px] bg-white/10 text-white flex items-center justify-center hover:bg-[#00a76b] transition-all border-none cursor-pointer z-[10001]"
              >
                <ChevronLeft size={32} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setPreviewGallery(prev => ({ ...prev, index: (prev.index + 1) % prev.items.length })) }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-[5px] bg-white/10 text-white flex items-center justify-center hover:bg-[#00a76b] transition-all border-none cursor-pointer z-[10001]"
              >
                <ChevronRight size={32} />
              </button>
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-2 bg-white/10 rounded-[5px] text-white text-[12px] font-black uppercase tracking-[0.3em] backdrop-blur-md">
                {previewGallery.index + 1} / {previewGallery.items.length}
              </div>
            </>
          )}

          <div className="max-w-full max-h-[85vh] flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
            {previewGallery.items[previewGallery.index].isImage ? (
              <img 
                src={previewGallery.items[previewGallery.index].url} 
                alt="Full Preview" 
                className="max-w-full max-h-[80vh] object-contain rounded-[5px] shadow-2xl ring-1 ring-white/10"
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-[400px] aspect-video bg-white/5 rounded-[5px] border border-white/10 flex flex-col items-center justify-center p-10 text-center gap-6 backdrop-blur-md">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-[#00a76b]"><FileText size={40} /></div>
                <div>
                  <p className="text-white text-[18px] font-black tracking-tight line-clamp-1">{previewGallery.items[previewGallery.index].name}</p>
                  <p className="text-white/40 text-[12px] font-bold uppercase tracking-widest mt-1">Non-Visual Document detected</p>
                </div>
                <a 
                  href={previewGallery.items[previewGallery.index].url} 
                  download 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-14 bg-[#00a76b] text-white rounded-[5px] font-black text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 no-underline hover:scale-105 transition-all"
                >
                  DOWNLOAD FILE <Download size={18} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[5px] border border-[#eceae3] shadow-sm">
          <div>
            <h1 className="text-3xl font-semibold text-[#201515] tracking-tight uppercase leading-none">Mission <span className="text-[#00a76b]">Control.</span></h1>
            <p className="text-[12px] font-bold text-[#939084] uppercase tracking-[0.2em] mt-2 flex items-center gap-2 ml-1"><Briefcase size={12} className="text-[#00a76b]" /> Orchestrating Operational Tasks</p>
          </div>
          <button 
            onClick={() => navigate(`/${role}/task-management/create`)}
            className="group h-14 px-8 bg-[#201515] hover:bg-[#00a76b] text-white rounded-[5px] font-black text-[12px] uppercase tracking-[0.3em] transition-all flex items-center gap-3 shadow-lg shadow-[#201515]/10"
          >
            New Mission <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#939084]" size={20} />
            <input 
              type="text" 
              placeholder="Search missions or operatives..." 
              className="w-full h-16 pl-16 pr-6 bg-white border border-[#eceae3] rounded-[5px] text-[15px] font-bold text-[#201515] focus:outline-none focus:ring-4 focus:ring-[#00a76b]/5 focus:border-[#00a76b] transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-[#939084]" size={20} />
            <select 
              className="w-full h-16 pl-16 pr-6 bg-white border border-[#eceae3] rounded-[5px] text-[15px] font-bold text-[#201515] focus:outline-none focus:ring-4 focus:ring-[#00a76b]/5 focus:border-[#00a76b] transition-all shadow-sm appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {['All', 'Pending', 'Ongoing', 'Completed'].map(s => <option key={s} value={s}>{s} Status</option>)}
            </select>
          </div>
          <button 
            onClick={fetchTasks}
            className="h-16 bg-white border border-[#eceae3] rounded-[5px] flex items-center justify-center text-[#201515] hover:text-[#00a76b] hover:border-[#00a76b] transition-all group shadow-sm"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#eceae3] rounded-xl p-6 shadow-sm flex flex-col gap-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredTasks.length === 0 ? (
            <div className="col-span-full bg-white border border-[#eceae3] rounded-xl p-20 flex flex-col items-center justify-center text-center shadow-sm">
              <ClipboardList size={48} className="text-[#939084] mb-4 opacity-50" />
              <p className="text-lg font-bold text-[#939084]">No missions detected in current sector.</p>
            </div>
          ) : filteredTasks.map((task) => (
            <div key={task._id} className="bg-white border border-[#eceae3] rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col relative group overflow-hidden">
              {/* Top Accent Line based on status */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Ongoing' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getStatusColor(task.status)}`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Ongoing' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                    {task.status}
                  </div>
                  <div className="flex items-center gap-2 text-[#939084]">
                    <Calendar size={14} className="text-[#00a76b]" />
                    <span className="text-xs font-bold">{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mb-6 flex-1">
                  <h3 className="text-lg font-black text-[#201515] tracking-tight line-clamp-2 leading-tight">{task.title}</h3>
                  <p className="text-[13px] font-medium text-[#939084] mt-2 line-clamp-3 italic leading-relaxed">"{task.description}"</p>
                </div>

                <div className="flex items-center justify-between mt-auto border-t border-[#eceae3] pt-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#201515] flex items-center justify-center text-white font-black text-sm shadow-md ring-2 ring-white">
                      {task.assignedTo?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#201515] tracking-tight leading-none">{task.assignedTo?.name || 'Unassigned'}</p>
                      <p className="text-[10px] font-bold text-[#939084] uppercase tracking-widest mt-1">{task.assignedTo?.role || 'Operative'}</p>
                    </div>
                  </div>
                  
                  {task.attachments?.length > 0 && (
                    <div 
                      onClick={() => openGallery(task.attachments, 0)}
                      className="w-12 h-12 rounded-lg border-2 border-white bg-[#f8f9fa] flex items-center justify-center overflow-hidden shadow-sm ring-1 ring-[#eceae3] transition-all cursor-pointer hover:scale-110 hover:shadow-md relative group shrink-0"
                    >
                      {((typeof task.attachments[0] === 'string' ? task.attachments[0] : (task.attachments[0].fileName || task.attachments[0].path || task.attachments[0].filename || '')) || '').match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || (task.attachments[0].fileType?.startsWith('image/')) ? (
                        <img src={task.attachments[0].fileUrl || `/api/uploads/${typeof task.attachments[0] === 'string' ? task.attachments[0] : (task.attachments[0].fileName || task.attachments[0].path || task.attachments[0].filename)}`} className="w-full h-full object-cover" />
                      ) : (
                        <FileText size={18} className="text-[#939084]" />
                      )}
                      {task.attachments.length > 1 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[11px] font-black text-white backdrop-blur-[1px]">+{task.attachments.length - 1}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#fcfcfc] px-6 py-4 border-t border-[#eceae3] flex items-center justify-end gap-8">
                <button 
                  onClick={() => navigate(`/${role}/task-management/update/${task._id}`)}
                  className="h-10 px-6 bg-[#201515] text-white rounded-lg text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#00a76b] transition-all shadow-md flex items-center gap-2"
                >
                  LOG UPDATE <ArrowRight size={14} />
                </button>
                <button 
                  onClick={() => deleteTask(task._id)}
                  className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;
