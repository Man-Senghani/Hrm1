import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, TrendingUp, AlertCircle, 
  MessageSquare, Save, Clock, Target, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const TaskUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState(null);
  
  const [status, setStatus] = useState('Ongoing');
  const [progressNote, setProgressNote] = useState('');

  const role = sessionStorage.getItem('role');
  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    try {
      const res = await axios.get(`/api/tasks/${id}`, { headers });
      if (res.data.success) {
        const t = res.data.data;
        setTask(t);
        setStatus(t.status);
        setProgressNote(t.progressNote || '');
      }
    } catch (err) {
      toast.error('Failed to load task details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((status === 'Pending' || status === 'Ongoing') && !progressNote) {
      toast.error('A progress report note is required for non-completed tasks');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.put(`/api/tasks/${id}`, {
        status,
        progressNote
      }, { headers });

      if (res.data.success) {
        toast.success('Daily status updated successfully');
        navigate(`/${role}/task-management`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return (
    <div className="p-12 text-center text-[#939084] font-black uppercase tracking-widest italic animate-pulse">
      Loading Task...
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="mb-10 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#939084] hover:text-[#201515] font-black text-[10px] uppercase tracking-widest transition-all bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={16} /> Cancel Update
        </button>
        <div className="text-right">
          <h1 className="text-3xl font-semibold text-[#201515] tracking-tight uppercase">
            End-of-Day <span className="text-[#00a76b]">Update.</span>
          </h1>
          <p className="text-[10px] font-black text-[#939084] uppercase tracking-widest mt-1">Daily Work Status Reporting</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: STATUS FORM */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[40px] border border-[#eceae3] shadow-sm space-y-8">
            {/* TASK CONTEXT PREVIEW */}
            <div className="bg-[#f8f9fa] p-6 rounded-3xl border border-[#eceae3] border-dashed mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00a76b] animate-pulse"></div>
                <span className="text-[10px] font-black text-[#939084] uppercase tracking-widest">Active Task Node</span>
              </div>
              <h2 className="text-xl font-black text-[#201515] uppercase">{task.title}</h2>
              <p className="text-[12px] text-[#939084] mt-2 line-clamp-2">{task.description}</p>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#939084] ml-1 flex items-center gap-2">
                <Clock size={14} className="text-[#00a76b]" /> Select Current Lifecycle State
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'Completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'hover:bg-emerald-50' },
                  { id: 'Ongoing', label: 'Ongoing', icon: TrendingUp, color: 'text-blue-600', bg: 'hover:bg-blue-50' },
                  { id: 'Pending', label: 'Pending', icon: AlertCircle, color: 'text-amber-600', bg: 'hover:bg-amber-50' },
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all cursor-pointer bg-transparent ${
                      status === s.id 
                        ? `border-[#00a76b] shadow-lg ${s.color}` 
                        : 'border-[#eceae3] text-[#939084] hover:border-[#c5c0b1]'
                    } ${s.bg}`}
                  >
                    <s.icon size={24} />
                    <span className="text-[11px] font-black uppercase tracking-widest">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#939084] ml-1 flex items-center gap-2">
                <MessageSquare size={14} className="text-[#00a76b]" /> Progress Report Narrative {status !== 'Completed' && '(Required)'}
              </label>
              <textarea 
                required={status !== 'Completed'}
                placeholder={status === 'Completed' ? "What did you achieve? (Optional)" : "Provide a detailed update on progress or blockers..."}
                className="w-full h-48 p-6 bg-[#f8f9fa] rounded-[32px] text-[15px] font-medium text-[#201515] focus:outline-none border-2 border-transparent focus:border-[#00a76b]/20 shadow-inner transition-all leading-relaxed"
                value={progressNote} 
                onChange={e => setProgressNote(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-[#201515] hover:bg-[#00a76b] text-white rounded-[24px] font-black text-[13px] uppercase tracking-[0.4em] transition-all shadow-2xl mt-8 italic flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'COMMITTING CHANGES...' : (
                <>COMMIT DAILY UPDATE <Save size={16} /></>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT: TASK ARCHIVE PREVIEW */}
        <div className="space-y-6">
          <div className="bg-[#fffdf9] p-8 rounded-[40px] border border-[#c5c0b1] shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#201515] mb-6 flex items-center gap-2">
              <Target size={16} className="text-[#00a76b]" /> Morning Log Meta
            </h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eceae3] flex items-center justify-center text-[#939084] shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#939084]">Created At</p>
                  <p className="text-[13px] font-black text-[#201515] mt-1">{new Date(task.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eceae3] flex items-center justify-center text-[#939084] shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#939084]">Work Proof</p>
                  <p className="text-[13px] font-black text-[#201515] mt-1">{task.attachments?.length || 0} File(s) Attached</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#00a76b]/5 p-8 rounded-[32px] border border-[#00a76b]/20">
            <p className="text-[11px] font-bold text-[#201515] leading-relaxed">
              "Honest reporting drives team transparency. Your EOD update helps us maintain focus and velocity."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskUpdate;
