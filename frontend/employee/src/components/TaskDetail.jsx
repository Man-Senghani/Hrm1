import React, { useState } from 'react';
import axios from 'axios';
import {
  X, Send, Paperclip, CheckCircle2, AlertCircle,
  MessageSquare, Clock, Shield, User, FileText, Download,
  RefreshCw, Trash2
} from 'lucide-react';
import { io } from 'socket.io-client';

const TaskDetail = ({ task, isOpen, onClose, onUpdate, userRole }) => {
  const [comment, setComment] = useState('');
  const [progress, setProgress] = useState(task?.progress || 0);
  const [feedback, setFeedback] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState([]);
  const [zoomImage, setZoomImage] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, employeeId: null });
  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const chatEndRef = React.useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [task?.comments]);

  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id || currentUser.id;

  // 📡 Real-time Socket Connection
  React.useEffect(() => {
    if (!isOpen || !task?._id) return;

    // Connect to backend (adjust URL if needed, usually same as origin in dev)
    const socket = io(window.location.origin, {
      transports: ['websocket'],
      upgrade: false,
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('📡 Socket Connected for Task:', task._id);
      socket.emit('join_task', task._id);
    });

    socket.on('new_comment', (data) => {
      console.log('💬 New Comment Received via Socket:', data);
      if (data.taskId === task._id) {
        onUpdate(); // Trigger refresh when new message arrives
      }
    });

    socket.on('task_updated', (data) => {
      console.log('🔄 Task Update Received via Socket:', data);
      if (data.taskId === task._id) {
        // Direct state update for instant feedback
        if (data.updatedFields.progress !== undefined) {
          setProgress(data.updatedFields.progress);
        }
        if (data.updatedFields.feedback !== undefined) {
          setFeedback(data.updatedFields.feedback);
        }
        onUpdate(); // Still call parent update to keep overall state consistent
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen, task?._id]);

  // 🔄 Sync Progress with Task Data
  React.useEffect(() => {
    if (task?.progress !== undefined) {
      setProgress(task.progress);
    }
  }, [task?.progress]);

  React.useEffect(() => {
    if (isOpen && (userRole === 'manager' || userRole === 'hr' || userRole === 'admin')) {
      const fetchPersonnel = async () => {
        try {
          // HR/Admin can see all personnel (Managers, HR, Employees)
          // Managers see only Employees
          const endpoint = (userRole === 'admin' || userRole === 'hr') ? '/api/personnel/all' : '/api/personnel/employees';
          const res = await axios.get(endpoint, { headers });
          setEmployees(res.data || []);
        } catch (err) { console.error('Personnel Registry fetch failed'); }
      };
      fetchPersonnel();
    }
  }, [isOpen, userRole]);

  if (!isOpen || !task) return null;

  const isLead = ['admin', 'hr', 'manager'].includes(userRole);
  const canEditProgress = isLead || (userRole === 'employee' && !['completed', 'submitted', 'under_review'].includes(task.status));

    const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    // 🛡️ PRE-FLIGHT IDENTITY CHECK
    const activeToken = sessionStorage.getItem('token');
    if (!activeToken) {
      alert('Session Expired. Please re-authenticate.');
      return;
    }

    try {
      const res = await axios.post(`/api/tasks/comment/${task._id}`, 
        { message: comment }, 
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );
      
      if (res.status === 200) {
        setComment(''); // 🚀 Definitively clear UI
        onUpdate();     // 📡 Trigger real-time refresh
      }
    } catch (err) { 
      console.error('--- COMMS FAILURE ---');
      console.error('Status:', err.response?.status);
      console.error('Message:', err.response?.data?.message);
      alert(`Transmission Failed: ${err.response?.data?.message || 'Server Offline'}`);
    }
  };

  const handleProgress = async (val) => {
    setProgress(val);
    try {
      await axios.put(`/api/tasks/progress/${task._id}`, { progress: val }, { headers });
      onUpdate();
    } catch (err) { console.error('Sync failure:', err); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      await axios.post(`/api/tasks/upload-proof/${task._id}`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      alert('Upload Successful');
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed. Please check file size (<5MB).');
      console.error('Upload failed:', err);
    }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleStatusAction = async (action, data = {}) => {
    try {
      await axios.put(`/api/tasks/${action}/${task._id}`, data, { headers });
      onUpdate();
      onClose();
    } catch (err) { console.error('Action failed:', err); }
  };

  const handleAssignEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      await axios.put(`/api/tasks/assign/${task._id}`, { employeeId: selectedEmployee }, { headers });
      setSelectedEmployee('');
      onUpdate();
      // alert(`Personnel Assigned Successfully`);
    } catch (err) { console.error('Assignment failed:', err); }
  };

  const handleUnassignEmployee = async (employeeId) => {
    try {
      await axios.put(`/api/tasks/unassign/${task._id}`, { employeeId }, { headers });
      setContextMenu({ ...contextMenu, show: false });
      onUpdate();
    } catch (err) { console.error('Unassignment failed:', err); }
  };

  const handleContextMenu = (e, employeeId) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.pageX,
      y: e.pageY,
      employeeId
    });
  };

  const closeContextMenu = () => setContextMenu({ ...contextMenu, show: false });

  const statusColors = {
    assigned: 'bg-gray-500 text-white',
    in_progress: 'bg-blue-500 text-white',
    submitted: 'bg-emerald-500 text-white',
    under_review: 'bg-purple-500 text-white',
    completed: 'bg-green-500 text-white',
    rework: 'bg-red-500 text-white'
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#201515]/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-[#fffefb] w-full max-w-4xl h-[85vh] rounded-[24px] overflow-hidden shadow-2xl flex flex-col border border-[#c5c0b1] animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="p-6 border-b border-[#eceae3] bg-[#fffdf9] flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${statusColors[task.status]}`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className="text-[9px] font-black text-[#939084] uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} /> Due: {new Date(task.dueDate).toLocaleDateString()}
              </span>
              {task.createdBy && (
                <span className="text-[9px] font-black text-[#00a76b] uppercase tracking-widest flex items-center gap-1.5 ml-4">
                  <Shield size={12} /> HR: {task.createdBy.name}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black text-[#201515] uppercase italic tracking-tighter">{task.title}</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white border border-[#eceae3] rounded-xl flex items-center justify-center text-[#939084] hover:bg-[#00a76b] hover:text-white transition-all shadow-sm cursor-pointer border-none">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: INFO & FILES */}
          <div className="w-[55%] p-8 overflow-y-auto border-r border-[#eceae3] space-y-6 custom-scrollbar">

            <section>
              <h4 className="text-[9px] font-black text-[#939084] uppercase tracking-[0.4em] mb-3 italic">Task Description</h4>
              <p className="text-md font-bold text-[#36342e] leading-relaxed italic">"{task.description}"</p>
            </section>

            {task.status === 'rework' && task.feedback && (
              <section className="p-6 bg-red-50 border border-red-100 rounded-[24px]">
                <h4 className="text-[9px] font-black text-red-500 uppercase tracking-[0.4em] mb-3 flex items-center gap-2 italic">
                  <AlertCircle size={12} /> Rework Directive
                </h4>
                <p className="text-md font-bold text-red-900 italic">"{task.feedback}"</p>
              </section>
            )}

            {/* DELEGATION SECTION */}
            {(userRole === 'manager' || userRole === 'hr' || userRole === 'admin') && (
              <section className="p-6 bg-[#eceae3]/20 border border-[#c5c0b1] rounded-[24px] space-y-4">
                <h4 className="text-[9px] font-black text-[#939084] uppercase tracking-[0.4em] italic">
                  { (userRole === 'admin' || userRole === 'hr') ? 'Lead Assignment' : 'Delegate Mission' }
                </h4>
                
                {/* 1. ADMIN/HR VIEW: Single Lead Assignment */}
                {(userRole === 'admin' || userRole === 'hr') && (
                  <div className="flex flex-col gap-3">
                    {task.assignedManager ? (
                      <div className="flex items-center gap-3 p-4 bg-white border border-[#c5c0b1] rounded-xl shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-[#00a76b] flex items-center justify-center text-[11px] font-black text-white">
                          {task.assignedManager.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-[#201515] uppercase tracking-wider">{task.assignedManager.name}</p>
                          <p className="text-[9px] font-bold text-[#939084] uppercase">Lead Manager Assigned</p>
                        </div>
                        <button 
                          onClick={() => handleUnassignEmployee(task.assignedManager._id)}
                          className="ml-auto w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-all border-none bg-transparent cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <select
                          className="flex-1 h-11 px-8 bg-white border border-[#c5c0b1] rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-[#00a76b] cursor-pointer shadow-sm appearance-none"
                          value={selectedEmployee}
                          onChange={(e) => setSelectedEmployee(e.target.value)}
                        >
                          <option value="">Select Lead Manager</option>
                          {employees.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name || emp.fullName || 'Unknown'}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleAssignEmployee}
                          disabled={!selectedEmployee}
                          className={`px-6 h-11 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all italic border-none cursor-pointer ${selectedEmployee ? 'bg-[#00a76b] text-white shadow-lg' : 'bg-[#eceae3] text-[#939084] cursor-not-allowed opacity-50'}`}
                        >
                          Assign
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. MANAGER VIEW: Multi-Employee Delegation */}
                {userRole === 'manager' && (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(task.assignedEmployees || []).length > 0 ? (
                        (task.assignedEmployees || []).map(emp => (
                          <div 
                            key={emp._id} 
                            onContextMenu={(e) => handleContextMenu(e, emp._id)}
                            className="flex items-center gap-2 bg-white border border-[#c5c0b1] px-4 py-2 rounded-xl shadow-sm hover:border-[#00a76b] transition-all cursor-context-menu"
                          >
                            <div className="w-5 h-5 rounded-full bg-[#00a76b]/10 flex items-center justify-center text-[10px] font-black text-[#00a76b]">
                              {emp.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[11px] font-black text-[#201515] uppercase tracking-wider">{emp.name}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] font-bold text-[#939084] uppercase italic">No tactical assets deployed.</p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[#c5c0b1]/30">
                      <select
                        className="flex-1 h-11 px-8 bg-white border border-[#c5c0b1] rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-[#00a76b] cursor-pointer shadow-sm appearance-none"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                      >
                        <option value="">Add More Personnel</option>
                        {employees
                          .filter(e => !(task.assignedEmployees || []).some(ae => ae._id === e._id))
                          .map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name || emp.fullName || 'Unknown'}</option>
                          ))}
                      </select>
                      <button
                        onClick={handleAssignEmployee}
                        disabled={!selectedEmployee}
                        className={`px-6 h-11 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all italic border-none cursor-pointer ${selectedEmployee ? 'bg-[#00a76b] text-white shadow-lg' : 'bg-[#eceae3] text-[#939084] cursor-not-allowed opacity-50'}`}
                      >
                        Assign
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ATTACHMENTS */}
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black text-[#939084] uppercase tracking-[0.4em] italic">Attachments</h4>
                {(userRole === 'employee' || userRole === 'manager' || userRole === 'hr') && task.status !== 'completed' && (
                  <label className="cursor-pointer bg-[#201515] text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00a76b] transition-all">
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {task.attachments?.length === 0 ? (
                  <p className="text-[11px] font-bold text-[#939084] uppercase italic">No attachments uploaded.</p>
                ) : (
                  [...task.attachments].reverse().map((file, i) => {
                    const isImage = file.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const fileUrl = `${window.location.protocol}//${window.location.hostname}:5000${file.fileUrl}`;

                    return (
                      <div key={i} className="p-4 bg-white border border-[#c5c0b1] rounded-2xl space-y-4 group hover:border-[#00a76b] transition-all shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <FileText size={18} className="text-[#939084]" />
                            <div>
                              <p className="text-[12px] font-black text-[#201515] uppercase italic truncate max-w-[200px]">{file.fileName}</p>
                              <p className="text-[9px] font-bold text-[#939084] uppercase">{new Date(file.uploadedAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="w-9 h-9 bg-[#eceae3] rounded-xl flex items-center justify-center text-[#201515] hover:bg-[#00a76b] hover:text-white transition-all">
                            <Download size={16} />
                          </a>
                        </div>
                        {isImage && (
                          <div
                            className="w-full rounded-xl overflow-hidden border border-[#c5c0b1] bg-[#eceae3] cursor-zoom-in group/img"
                            onClick={() => setZoomImage(fileUrl)}
                          >
                            <img src={fileUrl} alt="Preview" className="w-full h-auto object-contain max-h-[180px] mx-auto group-hover/img:scale-105 transition-transform duration-500" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* RIGHT: COMMENTS & ACTIONS */}
          <div className="w-[45%] flex flex-col bg-[#fffdf9]">
            {/* COMMENTS AREA */}
            <div className="flex-1 p-8 overflow-y-auto space-y-5 custom-scrollbar flex flex-col">
              <h4 className="text-[9px] font-black text-[#939084] uppercase tracking-[0.4em] mb-6 italic flex items-center gap-2">
                <MessageSquare size={12} /> Tactical Comms
              </h4>
              <div className="flex-1 flex flex-col space-y-2 justify-end">
                {task.comments?.map((c, i) => {
                  const senderId = (c.userId?._id || c.userId || '').toString();
                  const currentId = (currentUserId || '').toString();
                  const senderName = (c.userName || c.userId?.name || 'Personnel').toUpperCase().trim();
                  const myName = (currentUser?.name || '').toUpperCase().trim();
                  
                  // 🛡️ TRIPLE-CHECK IDENTITY (ID or NAME)
                  const isMe = (senderId === currentId && currentId !== '') || (senderName === myName && myName !== '');
                  
                  const senderImage = c.profileImage || c.userId?.profileImage;
                  const initials = senderName.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

                  return (
                    <div key={i} className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start animate-in slide-in-from-left-2 duration-300'}`}>
                      <div className={`flex max-w-[85%] gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* 👤 AVATAR */}
                        <div className="w-8 h-8 rounded-full bg-[#eceae3] shrink-0 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm mt-1">
                          {senderImage ? (
                            <img src={senderImage.startsWith('/uploads') ? `${window.location.protocol}//${window.location.hostname}:5000${senderImage}` : senderImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-black text-[#939084]">{initials}</span>
                          )}
                        </div>

                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`py-3 px-5 rounded-[22px] shadow-sm ${isMe ? 'bg-[#201515] text-white rounded-tr-none' : 'bg-white border border-[#eceae3] text-[#201515] rounded-tl-none'}`}>
                            <p className="text-[14px] font-medium leading-relaxed italic">{c.message}</p>
                          </div>
                          <span className="text-[8px] font-black uppercase text-[#939084] mt-1.5 px-2 tracking-widest opacity-60">
                            {isMe ? 'YOU' : senderName} • {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* ACTION AREA */}
            <div className="p-8 border-t border-[#eceae3] bg-white space-y-4">
              <form onSubmit={handleComment} className="flex gap-3">
                <input
                  type="text" placeholder="Type tactical update..."
                  className="flex-1 h-12 px-5 bg-[#eceae3] rounded-xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-[#00a76b]/20 transition-all italic"
                  value={comment} onChange={(e) => setComment(e.target.value)}
                />
                <button type="submit" className="w-12 h-12 bg-[#00a76b] text-white rounded-xl flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all border-none cursor-pointer">
                  <Send size={18} />
                </button>
              </form>

              {/* STATUS SPECIFIC BUTTONS */}
              <div className="flex gap-3 pt-1">
                {userRole === 'employee' && (task.status === 'in_progress' || task.status === 'rework') && (
                  <button
                    onClick={() => handleStatusAction('submit')}
                    className="flex-1 h-14 bg-[#201515] text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#00a76b] shadow-lg transition-all italic"
                  >
                    Submit Task <CheckCircle2 size={16} />
                  </button>
                )}

                {(userRole === 'manager' || userRole === 'hr' || userRole === 'admin') && task.status === 'submitted' && (
                  <>
                    <button
                      onClick={() => handleStatusAction('approve')}
                      className="flex-1 h-14 bg-[#24a148] text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all italic shadow-lg"
                    >
                      Approve <CheckCircle2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        const fb = prompt('Provide rework instructions:');
                        if (fb) handleStatusAction('reject', { feedback: fb });
                      }}
                      className="flex-1 h-14 bg-[#00a76b] text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all italic shadow-lg"
                    >
                      Rework <AlertCircle size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEXT MENU */}
      {contextMenu.show && (
        <div 
          className="fixed z-[9999] bg-white border border-[#c5c0b1] shadow-2xl rounded-xl overflow-hidden min-w-[180px] animate-in zoom-in-95 duration-200"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-[#eceae3] bg-[#fffdf9]">
            <p className="text-[9px] font-black text-[#939084] uppercase tracking-widest px-3 py-1 italic">Asset Protocols</p>
          </div>
          <button 
            onClick={() => handleUnassignEmployee(contextMenu.employeeId)}
            className="w-full text-left px-5 py-3 text-[11px] font-bold text-[#00a76b] hover:bg-[#00a76b] hover:text-white transition-all flex items-center gap-3 border-none bg-transparent cursor-pointer"
          >
            <Trash2 size={14} /> Remove from Task
          </button>
          <button 
            onClick={closeContextMenu}
            className="w-full text-left px-5 py-3 text-[11px] font-bold text-[#201515] hover:bg-[#eceae3] transition-all flex items-center gap-3 border-none bg-transparent cursor-pointer border-t border-[#eceae3]"
          >
            <X size={14} /> Cancel Protocol
          </button>
        </div>
      )}
      
      {/* OVERLAY TO CLOSE CONTEXT MENU */}
      {contextMenu.show && (
        <div 
          className="fixed inset-0 z-[9998] bg-transparent"
          onClick={closeContextMenu}
          onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
        />
      )}

      {/* IMAGE ZOOM LIGHTBOX */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-10 animate-in fade-in duration-300 cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <button className="absolute top-10 right-10 text-white/50 hover:text-white"><X size={40} /></button>
          <img src={zoomImage} alt="Zoom" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300" />
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
