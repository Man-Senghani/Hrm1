import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, ArrowLeft, Paperclip, X, CheckCircle2, 
  Target, Info, FileText, Send, Zap, ShieldCheck, Clock, RefreshCw, MessageSquare, ChevronLeft, ChevronRight, Download, Type, Calendar, Users, ChevronDown, UserCheck, AlertCircle, ClipboardList, ClipboardCheck, Minus, Sparkles, Bell, Monitor, LayoutDashboard, User, Flag, Tag, MoreHorizontal, LayoutTemplate, Palette, Trash2, Layers, Link2
} from 'lucide-react';
import toast from 'react-hot-toast';
import TaskDetailView from '../components/TaskDetailView';
import { io } from 'socket.io-client';

// Modal Wrapper Helper Component
const ModalWrapper = ({ isModal, onClose, children }) => {
  if (!isModal) return children;
  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[9999] bg-[#201515]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#fffefb] rounded-[5px] shadow-2xl border border-[#c5c0b1] w-full max-w-6xl relative max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#939084] hover:text-[#00a76b] z-[100] transition-colors border-none bg-transparent cursor-pointer"
        >
          <X size={24} />
        </button>
        <div className="overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

// Robust Date Formatter
const getYYYYMMDD = (dateInput) => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) { return ''; }
};

// ABSOLUTE ASSET NORMALIZER
const getEvidenceUrl = (file) => {
  if (!file) return '';
  if (file instanceof File) return URL.createObjectURL(file);
  
  // Check all possible database field names
  const rawUrl = file.fileUrl || file.url || file.path || '';
  if (!rawUrl) return '';
  
  // If it's already an absolute URL or has a leading slash, use it
  if (rawUrl.startsWith('http') || rawUrl.startsWith('/')) {
    return rawUrl;
  }
  
  // Otherwise, ensure it points to the root uploads directory
  return `/${rawUrl}`;
};

const TaskCreate = ({ isModal = false, onClose, onSuccess, defaultStatus = 'Ongoing' }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    attachments: []
  });

  // State setup matching visual controls
  const [activeTab, setActiveTab] = useState('Task');
  const tabs = [
    { id: 'Task', label: 'Task' },
    { id: 'Doc', label: 'Doc' },
    { id: 'Reminder', label: 'Reminder' },
    { id: 'Whiteboard', label: 'Whiteboard' },
    { id: 'Dashboard', label: 'Dashboard' },
  ];

  // Projects & Personnel Lists
  const [projectsList, setProjectsList] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  
  // Attribute States
  const [selectedProject, setSelectedProject] = useState({ projectName: 'Project 1' });
  const [taskType, setTaskType] = useState('Task');
  const [statusVal, setStatusVal] = useState(defaultStatus);
  const [assignedUser, setAssignedUser] = useState(null);
  const [dueDateVal, setDueDateVal] = useState('');
  const [priorityVal, setPriorityVal] = useState('Medium');
  const [tagsList, setTagsList] = useState([]);
  const [customFields, setCustomFields] = useState([]);

  // Tag Input & Custom Field states
  const [newTagInput, setNewTagInput] = useState('');
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isAlertEnabled, setIsAlertEnabled] = useState(false);

  // Dropdown open states
  const [openProjectDrop, setOpenProjectDrop] = useState(false);
  const [openTypeDrop, setOpenTypeDrop] = useState(false);
  const [openStatusDrop, setOpenStatusDrop] = useState(false);
  const [openAssigneeDrop, setOpenAssigneeDrop] = useState(false);
  const [openPriorityDrop, setOpenPriorityDrop] = useState(false);
  const [openTemplatesDrop, setOpenTemplatesDrop] = useState(false);

  // Doc, Reminder, Whiteboard active tab state inputs
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');

  // Whiteboard drawing states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(4);
  const [savedDrawings, setSavedDrawings] = useState([]);
  const [showDrawingSidebar, setShowDrawingSidebar] = useState(false);

  // AI loading indicator
  const [aiLoading, setAiLoading] = useState(false);

  // List tasks & sync registry states
  const [tasks, setTasks] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const userRole = sessionStorage.getItem('role')?.toLowerCase() || 'employee';
  const isHigherRole = userRole === 'admin' || userRole === 'hr' || userRole === 'manager';
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(sessionStorage.getItem('user')) || null);
  const [selectedTask, setSelectedTask] = useState(null);
  const today = getYYYYMMDD(new Date());
  const [registryDate, setRegistryDate] = useState(today); 
  const [roleFilter, setRoleFilter] = useState(userRole === 'employee' ? 'Employee' : 'All'); 
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [statusNote, setStatusNote] = useState({ taskId: null, nextStatus: null, note: '' });

  // Custom Date Picker states and refs
  const [showPersonalCalendar, setShowPersonalCalendar] = useState(false);
  const [showRegistryCalendar, setShowRegistryCalendar] = useState(false);
  const [personalCalendarMonth, setPersonalCalendarMonth] = useState(new Date());
  const [registryCalendarMonth, setRegistryCalendarMonth] = useState(new Date());
  const personalCalendarRef = useRef(null);
  const registryCalendarRef = useRef(null);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= numDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  useEffect(() => {
    if (registryDate) {
      const parsedDate = new Date(registryDate);
      if (!isNaN(parsedDate.getTime())) {
        setPersonalCalendarMonth(parsedDate);
        setRegistryCalendarMonth(parsedDate);
      }
    }
  }, [registryDate]);

  // Refs for closing dropdowns
  const projectRef = useRef(null);
  const typeRef = useRef(null);
  const statusRef = useRef(null);
  const assigneeRef = useRef(null);
  const priorityRef = useRef(null);
  const templatesRef = useRef(null);
  const registryFilterRef = useRef(null);

  const getAuth = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : null;
  };

  const [previewGallery, setPreviewGallery] = useState({ items: [], index: 0 });

  // Handle outside dropdown clicks
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (projectRef.current && !projectRef.current.contains(e.target)) setOpenProjectDrop(false);
      if (typeRef.current && !typeRef.current.contains(e.target)) setOpenTypeDrop(false);
      if (statusRef.current && !statusRef.current.contains(e.target)) setOpenStatusDrop(false);
      if (assigneeRef.current && !assigneeRef.current.contains(e.target)) setOpenAssigneeDrop(false);
      if (priorityRef.current && !priorityRef.current.contains(e.target)) setOpenPriorityDrop(false);
      if (templatesRef.current && !templatesRef.current.contains(e.target)) setOpenTemplatesDrop(false);
      if (registryFilterRef.current && !registryFilterRef.current.contains(e.target)) setShowRoleDropdown(false);
      if (personalCalendarRef.current && !personalCalendarRef.current.contains(e.target)) setShowPersonalCalendar(false);
      if (registryCalendarRef.current && !registryCalendarRef.current.contains(e.target)) setShowRegistryCalendar(false);
      
      // Also close the Create Task dropdown if clicked outside
      const dropdownBtn = document.getElementById('create-task-dropdown-btn');
      const dropdownMenu = document.getElementById('create-task-dropdown-menu');
      if (
        dropdownBtn && !dropdownBtn.contains(e.target) &&
        dropdownMenu && !dropdownMenu.contains(e.target)
      ) {
        setShowCreateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial dropdown options: projects & personnel
  const fetchDropdownData = async () => {
    const auth = getAuth();
    if (!auth) return;
    try {
      // 1. Fetch Projects list according to user permissions
      let projectsRes;
      if (userRole === 'admin' || userRole === 'hr') {
        projectsRes = await axios.get('/api/projects/hr', auth).catch(() => ({ data: [] }));
      } else if (userRole === 'manager') {
        projectsRes = await axios.get('/api/projects/manager', auth).catch(() => ({ data: [] }));
      } else {
        projectsRes = await axios.get('/api/projects/my', auth).catch(() => ({ data: [] }));
      }
      setProjectsList(Array.isArray(projectsRes.data) ? projectsRes.data : []);

      // 2. Fetch Personnel list
      const personnelRes = await axios.get('/api/personnel/all', auth).catch(() => ({ data: [] }));
      setPersonnelList(Array.isArray(personnelRes.data) ? personnelRes.data : []);
    } catch (err) {
      console.error("Dropdown data fetch failed", err);
    }
  };

  const fetchCurrentUser = useCallback(async () => {
    const auth = getAuth();
    if (!auth) return;
    try {
      const res = await axios.get('/api/auth/me', auth);
      if (res.data) setCurrentUser(res.data);
    } catch (err) { console.error('User fetch failed'); }
  }, []);

  const fetchTasks = useCallback(async (date = registryDate) => {
    const auth = getAuth();
    if (!auth) return;
    try {
      setIsSyncing(true);
      const res = await axios.get(`/api/tasks?date=${date}`, auth);
      if (res.data.success) {
        setTasks(res.data.data);
        setCurrentPage(1);
      }
    } catch (err) { 
      console.error('Task fetch failed'); 
    } finally {
      setIsSyncing(false);
    }
  }, [registryDate]);

  useEffect(() => {
    fetchTasks(registryDate);
    fetchCurrentUser();
    fetchDropdownData();
    const interval = setInterval(() => fetchTasks(registryDate), 30000);
    return () => clearInterval(interval);
  }, [registryDate, fetchTasks, fetchCurrentUser]);

  // Real-time socket events
  useEffect(() => {
    const socket = io(window.location.origin, {
       transports: ['websocket']
    });
    socket.on('task_updated', (updatedTask) => {
      setTasks(prevTasks => prevTasks.map(t => t._id === updatedTask._id ? updatedTask : t));
      setSelectedTask(prevSelected => prevSelected?._id === updatedTask._id ? updatedTask : prevSelected);
    });
    return () => socket.disconnect();
  }, []);

  // High-DPI (Retina) canvas setup — runs whenever Whiteboard tab is active
  useEffect(() => {
    if (activeTab !== 'Whiteboard') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width || 700;
      const height = rect.height || 300;

      // If the size and DPR haven't changed, do not resize (prevents clearing the canvas)
      if (
        canvas.dataset.width === String(width) &&
        canvas.dataset.height === String(height) &&
        canvas.dataset.dpr === String(dpr)
      ) {
        return;
      }

      // Backup existing drawing
      let tempCanvas = null;
      if (canvas.width > 0 && canvas.height > 0) {
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Set physical dimensions
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      // Lock visual CSS dimensions to keep the page layout stable
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale the context by DPR
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Restore backup drawing scaled to the new physical size
      if (tempCanvas && tempCanvas.width > 0 && tempCanvas.height > 0) {
        const prevDpr = Number(canvas.dataset.dpr) || 1;
        ctx.drawImage(
          tempCanvas,
          0,
          0,
          tempCanvas.width,
          tempCanvas.height,
          0,
          0,
          tempCanvas.width / prevDpr,
          tempCanvas.height / prevDpr
        );
      }

      // Save current metrics for future change detection
      canvas.dataset.width = String(width);
      canvas.dataset.height = String(height);
      canvas.dataset.dpr = String(dpr);
    };

    // Delay setup slightly to ensure the browser has finished layout/rendering
    const timer = setTimeout(resizeCanvas, 50);

    window.addEventListener('resize', resizeCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [activeTab]);


  // AI Generation Simulation
  const handleAIGenerate = () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a Task Name first");
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      const promptResult = `[AI CO-PILOT DRAFT]\nObjective: Create complete, verified layout updates for: ${formData.title}.\n\nDeliverables:\n- Integrate high-fidelity styling tokens.\n- Confirm Mongoose field mappings.\n- Verify cross-role accessibility.`;
      setFormData(prev => ({ ...prev, description: promptResult }));
      setAiLoading(false);
      toast.success("AI description generated successfully!");
    }, 1200);
  };

  // Add tag chips
  const handleAddTag = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newTagInput.trim() && !tagsList.includes(newTagInput.trim())) {
        setTagsList([...tagsList, newTagInput.trim()]);
        setNewTagInput('');
      }
      setShowTagInput(false);
    }
  };

  const removeTag = (tag) => {
    setTagsList(tagsList.filter(t => t !== tag));
  };

  // Custom key-value fields management
  const handleAddCustomField = () => {
    const name = window.prompt("Enter new field name (e.g. Estimation, Department, Sprint):");
    if (!name || !name.trim()) return;
    setCustomFields([...customFields, { name: name.trim(), value: '' }]);
  };

  const updateCustomFieldValue = (index, value) => {
    const updated = [...customFields];
    updated[index].value = value;
    setCustomFields(updated);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  // Templates implementation
  const templates = [
    {
      name: "API Design Sprint",
      title: "Design and implement REST endpoints",
      description: "Perform endpoint structuring and construct express controller functions. Verify Mongoose model bindings and validate data models.",
      priority: "High",
      tags: ["API", "Backend"]
    },
    {
      name: "QA UI Audit",
      title: "Run responsive cross-browser validation",
      description: "Verify visual consistency, CSS responsive scaling margins, and action buttons hover transitions across Chrome, Safari, and Mobile viewports.",
      priority: "Medium",
      tags: ["QA", "UI/UX"]
    },
    {
      name: "Weekly Analytics Report",
      title: "Deliver operational task registry statistics",
      description: "Compute task success rates, time logging ratios, and export summaries. Compile dashboard charts.",
      priority: "Low",
      tags: ["Report", "Operations"]
    }
  ];

  const applyTemplate = (tpl) => {
    setFormData({
      title: tpl.title,
      description: tpl.description,
      attachments: []
    });
    setPriorityVal(tpl.priority);
    setTagsList(tpl.tags);
    setOpenTemplatesDrop(false);
    toast.success(`${tpl.name} template applied!`);
  };

  // Whiteboard Canvas Drawing Logic
  // Helper: converts mouse event coords to canvas CSS coords
  const getCanvasCoords = (nativeEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: nativeEvent.clientX - rect.left,
      y: nativeEvent.clientY - rect.top,
    };
  };

  const startDrawing = ({ nativeEvent }) => {
    if (activeTab !== 'Whiteboard') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasCoords(nativeEvent);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing || activeTab !== 'Whiteboard') return;
    const canvas = canvasRef.current;
    const { x, y } = getCanvasCoords(nativeEvent);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  };

  const saveWhiteboardAsAttachment = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    // Save to sidebar gallery
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSavedDrawings(prev => [{ dataUrl, timestamp, id: Date.now() }, ...prev]);
    setShowDrawingSidebar(true);
    // Also attach as file
    canvas.toBlob((blob) => {
      const file = new File([blob], `whiteboard-${Date.now()}.png`, { type: 'image/png' });
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, file] }));
    });
    toast.success('Drawing saved to sidebar!');
  };

  const loadDrawingToCanvas = (dataUrl) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    };
    img.src = dataUrl;
    toast.success('Drawing loaded to canvas!');
  };

  const deleteDrawing = (id) => {
    setSavedDrawings(prev => prev.filter(d => d.id !== id));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab !== 'Task') {
      toast.error("Switch to Task tab to create task");
      return;
    }
    const auth = getAuth();
    setLoading(true);

    const data = new FormData();
    data.append('title', formData.title);
    
    // Append tags and custom fields into description block nicely
    let desc = formData.description;
    if (tagsList.length > 0) {
      desc += `\n\nTags: ${tagsList.join(', ')}`;
    }
    if (customFields.length > 0) {
      desc += `\n\nCustom Attributes:\n` + customFields.map(f => `- ${f.name}: ${f.value}`).join('\n');
    }
    if (selectedProject?.projectName) {
      desc += `\n\nProject Scope: ${selectedProject.projectName}`;
    }

    data.append('description', desc);
    data.append('date', registryDate);
    data.append('status', statusVal);
    data.append('priority', priorityVal);

    if (assignedUser) {
      data.append('userId', assignedUser._id);
      data.append('employeeName', assignedUser.fullName || assignedUser.name);
      data.append('employeeRole', assignedUser.role);
    }

    formData.attachments.forEach(file => {
      data.append('attachments', file);
    });

    try {
      const res = await axios.post('/api/tasks', data, { 
        headers: { ...auth.headers, 'Content-Type': 'multipart/form-data' } 
      });
      if (res.data.success) {
        toast.success('Mission Logged Successfully');
        setFormData({ title: '', description: '', attachments: [] });
        setTagsList([]);
        setCustomFields([]);
        setAssignedUser(null);
        setDueDateVal('');
        if (isModal) {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        } else {
          setTimeout(() => fetchTasks(registryDate), 1000); 
        }
      }
    } catch (err) {
      toast.error('Failed to register task');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (taskId, nextStatus) => {
    if (nextStatus === 'Completed' || nextStatus === 'Review' || nextStatus === 'Need to Improve') {
      updateTaskStatus(taskId, nextStatus, 'Mission Milestone Reached');
    } else {
      setStatusNote({ taskId, nextStatus, note: '' });
    }
  };

  const updateTaskStatus = async (id, newStatus, note, newComment = null) => {
    const auth = getAuth();
    try {
      const payload = { status: newStatus, progressNote: note };
      if (newComment) payload.newComment = newComment;
      await axios.put(`/api/tasks/${id}`, payload, auth);
      toast.success('Updated successfully');
      setStatusNote({ taskId: null, nextStatus: null, note: '' });
      fetchTasks(registryDate);
    } catch (err) { toast.error('Update failed'); }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const removeFile = (e, index) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  const openGallery = (attachments, startIndex = 0) => {
    if (!attachments || attachments.length === 0) return;
    const galleryItems = attachments.map(file => {
      const url = getEvidenceUrl(file);
      const fileType = file.fileType || file.type || '';
      const fileName = file.fileName || file.name || 'Evidence';
      const isImage = (fileType.startsWith('image/')) || (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i));
      return { url, name: fileName, isImage };
    });
    setPreviewGallery({ items: galleryItems, index: startIndex });
  };

  // Filtering for lists
  const myTasks = tasks.filter(task => task.employeeId === currentUser?._id || task.employeeName === currentUser?.fullName || task.employeeName === currentUser?.name);
  
  const filteredTasks = tasks.filter(task => {
    if (userRole === 'hr' && task.employeeRole?.toLowerCase() === 'hr') return false;
    if (roleFilter === 'All') return true;
    return task.employeeRole?.toLowerCase() === roleFilter.toLowerCase();
  });

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const roleOptions = [
    { label: 'All Roles', value: 'All' },
    ...(userRole === 'admin' ? [
      { label: 'HR', value: 'HR' },
      { label: 'Manager', value: 'Manager' }
    ] : []),
    ...(userRole === 'hr' ? [
      { label: 'Manager', value: 'Manager' }
    ] : []),
    { label: 'Employee', value: 'Employee' }
  ];

  return (
    <ModalWrapper isModal={isModal} onClose={onClose}>
      <div className={isModal ? "" : "max-w-7xl mx-auto pt-4 pb-8 px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen flex flex-col overflow-y-auto scrollbar-hide"}>
      
      <style>{`
        .absolute-invisible-scroll::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; background: transparent !important; }
        .absolute-invisible-scroll::-webkit-scrollbar-track { background: transparent !important; border: none !important; }
        .absolute-invisible-scroll::-webkit-scrollbar-thumb { background: transparent !important; border: none !important; }
        .absolute-invisible-scroll { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailView 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onTaskChange={() => fetchTasks(registryDate)}
          onAddComment={async (comment) => {
            await updateTaskStatus(selectedTask._id, selectedTask.status, selectedTask.progressNote, comment);
            setSelectedTask(prev => ({
              ...prev, 
              comments: [...(prev.comments || []), { text: comment, userName: currentUser?.fullName || currentUser?.name || 'System Admin', userRole: currentUser?.role || 'admin', createdAt: new Date().toISOString() }]
            }));
          }}
          onAddTimeLog={async (timeLogData) => {
            const auth = getAuth();
            try {
              const res = await axios.put(`/api/tasks/${selectedTask._id}`, { newTimeLog: timeLogData }, auth);
              if (res.data.success) {
                toast.success('Time logged successfully');
                setSelectedTask(res.data.data);
                setTasks(prevTasks => prevTasks.map(t => t._id === res.data.data._id ? res.data.data : t));
              }
            } catch (err) {
              toast.error('Failed to log time');
            }
          }}
        />
      )}

      {/* Lightbox Gallery */}
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
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = 'https://placehold.co/600x400/201515/ff4f00?text=IMAGE+LOST+IN+MATRIX';
                }}
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

      {/* Status Note Popup */}
      {statusNote.taskId && (
        <div className="fixed inset-0 z-[10000] bg-[#201515]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-[5px] p-10 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-300">
              <button 
                onClick={() => setStatusNote({ taskId: null, nextStatus: null, note: '' })} 
                className="absolute top-6 right-6 text-[#939084] hover:text-[#00a76b] border-none bg-transparent cursor-pointer"
              >
                <X size={24} />
              </button>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-[5px] bg-[#00a76b]/10 flex items-center justify-center text-[#00a76b]">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">Status <span className="text-[#00a76b]">Report.</span></h2>
                  <p className="text-[10px] font-bold text-[#939084] uppercase tracking-[0.2em]">Required for transition to {statusNote.nextStatus}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#939084] mb-3 block ml-1">Progress Intelligence</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-5 text-[#939084]/60" size={18} />
                      <textarea 
                        autoFocus
                        placeholder="What is the current status of this objective?"
                        className="w-full h-40 pl-12 pr-5 pt-4 bg-white rounded-[5px] text-[15px] font-medium focus:outline-none border border-[#eceae3] focus:border-[#00a76b]/40 shadow-sm resize-none leading-relaxed" 
                        value={statusNote.note} 
                        onChange={e => setStatusNote({...statusNote, note: e.target.value})} 
                      />
                    </div>
                 </div>
                 <button 
                   onClick={() => updateTaskStatus(statusNote.taskId, statusNote.nextStatus, statusNote.note)}
                   disabled={!statusNote.note.trim()}
                   className="w-full h-14 bg-[#201515] hover:bg-[#00a76b] text-white rounded-[5px] font-black text-[12px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                 >
                    SEND UPDATE <Send size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Main Grid Header */}
        <div className="w-full flex flex-col gap-6">
          {!isModal && (
            <div className="flex items-center justify-between w-full mb-2">
              <div>
                <h1 className="text-3xl font-semibold text-[#201515] tracking-tight uppercase">
                  Hello {currentUser?.fullName?.split(' ')[0] || currentUser?.name?.split(' ')[0] || ''}, <span className="text-[#00a76b]">{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}.</span>
                </h1>
              </div>
              <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#939084] hover:text-[#201515] font-black text-[10px] uppercase tracking-widest transition-all bg-transparent border-none cursor-pointer"><ArrowLeft size={14} /> Back</button>
            </div>
          )}

        {/* Task Creator Window Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 w-full">
          <div className="lg:col-span-3 flex flex-col gap-6">
            <form onSubmit={handleSubmit} className="w-full bg-[#fffefb] rounded-[5px] shadow-xl overflow-hidden border border-[#c5c0b1] flex flex-col">
              
              {/* Header Tabs */}
              <div className="flex items-center justify-between px-4 bg-[#00a76b] border-b border-[#00a76b]/80 shrink-0">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-3 text-[13px] font-bold transition-colors relative whitespace-nowrap ${
                        activeTab === tab.id ? 'text-white font-extrabold' : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Removed window control buttons */}
              </div>

              {/* Dynamic Tab Content rendering */}
              <div className="flex-1 p-5 bg-[#fffefb] flex flex-col gap-5">
                
                {activeTab === 'Task' && (
                  <>
                    {/* Project & Task type selectors */}
                    <div className="flex items-center gap-2">
                      <div className="relative" ref={projectRef}>
                        <button 
                          type="button" 
                          onClick={() => setOpenProjectDrop(!openProjectDrop)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#eceae3] hover:bg-[#c5c0b1] border border-[#c5c0b1] rounded-[4px] text-[#201515] text-[11px] font-bold transition-colors"
                        >
                          <CheckCircle2 size={12} className="text-[#00a76b]" />
                          {selectedProject?.projectName || 'Project 1'}
                          <ChevronDown size={12} className="text-[#939084] ml-0.5" />
                        </button>
                        {openProjectDrop && (
                          <div className="absolute left-0 top-full mt-1 w-44 bg-[#fffefb] border border-[#c5c0b1] rounded-[5px] p-1 shadow-xl z-50 animate-in fade-in duration-100 max-h-40 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => { setSelectedProject({ projectName: 'General Scope' }); setOpenProjectDrop(false); }}
                              className="w-full text-left px-2 py-1.5 text-xs text-[#36342e] hover:bg-[#eceae3] hover:text-[#201515] rounded font-semibold"
                            >
                              General Scope
                            </button>
                            {projectsList.map(p => (
                              <button
                                key={p._id}
                                type="button"
                                onClick={() => { setSelectedProject(p); setOpenProjectDrop(false); }}
                                className="w-full text-left px-2 py-1.5 text-xs text-[#36342e] hover:bg-[#eceae3] hover:text-[#201515] rounded truncate font-semibold"
                              >
                                {p.projectName}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative" ref={typeRef}>
                        <button 
                          type="button" 
                          onClick={() => setOpenTypeDrop(!openTypeDrop)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#eceae3] hover:bg-[#c5c0b1] border border-[#c5c0b1] rounded-[4px] text-[#201515] text-[11px] font-bold transition-colors"
                        >
                          <Type size={12} className="text-[#939084]" />
                          {taskType}
                          <ChevronDown size={12} className="text-[#939084] ml-0.5" />
                        </button>
                        {openTypeDrop && (
                          <div className="absolute left-0 top-full mt-1 w-32 bg-[#fffefb] border border-[#c5c0b1] rounded-[5px] p-1 shadow-xl z-50 animate-in fade-in duration-100">
                            {['Task', 'Bug', 'Epic', 'Story'].map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => { setTaskType(t); setOpenTypeDrop(false); }}
                                className="w-full text-left px-2 py-1.5 text-xs text-[#36342e] hover:bg-[#eceae3] hover:text-[#201515] rounded font-semibold"
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Task Title Input */}
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Task Name"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-transparent text-[#201515] text-xl font-bold placeholder:text-[#c5c0b1] outline-none border-none focus:ring-0 p-0"
                        autoFocus
                      />
                    </div>

                    {/* Task Description */}
                    <div className="relative group">
                      <textarea
                        required
                        placeholder="Add description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full h-24 bg-transparent text-[#36342e] text-xs placeholder:text-[#939084] outline-none border-none focus:ring-0 p-0 resize-none leading-relaxed"
                      />
                    </div>

                    {/* Task Attributes (Interactive dropdown pickers) */}
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-[#eceae3] pt-3">
                      
                      {/* Status */}
                      <div className="relative" ref={statusRef}>
                        <button 
                          type="button" 
                          onClick={() => setOpenStatusDrop(!openStatusDrop)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#201515] hover:bg-[#201515]/80 rounded-[4px] text-white text-[11px] font-bold transition-colors border border-transparent"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusVal === 'Completed' ? 'bg-green-400' : statusVal === 'Review' ? 'bg-[#00a76b]' : statusVal === 'Need to Improve' ? 'bg-red-400' : 'bg-[#c5c0b1]'}`}></span>
                          {statusVal === 'Ongoing' ? 'TO DO' : statusVal === 'Pending' ? 'IN PROGRESS' : statusVal === 'Review' ? 'UNDER REVIEW' : statusVal}
                        </button>
                        {openStatusDrop && (
                          <div className="absolute left-0 bottom-full mb-1 w-36 bg-[#fffefb] border border-[#c5c0b1] rounded-[5px] p-1 shadow-xl z-50">
                            {['Ongoing', 'Pending', 'Review', 'Need to Improve', 'Completed'].map(st => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => { setStatusVal(st); setOpenStatusDrop(false); }}
                                className="w-full text-left px-2 py-1.5 text-xs text-[#36342e] hover:bg-[#00a76b] hover:text-white rounded font-semibold transition-colors"
                              >
                                {st === 'Ongoing' ? 'TO DO' : st === 'Pending' ? 'IN PROGRESS' : st === 'Review' ? 'UNDER REVIEW' : st}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Assignee */}
                      <div className="relative" ref={assigneeRef}>
                        <button 
                          type="button" 
                          onClick={() => setOpenAssigneeDrop(!openAssigneeDrop)}
                          className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-[#eceae3] rounded-[4px] text-[#939084] hover:text-[#201515] text-[11px] font-bold transition-colors border border-dashed border-[#c5c0b1]"
                        >
                          <User size={12} />
                          {assignedUser ? assignedUser.fullName || assignedUser.name : 'Assignee'}
                        </button>
                        {openAssigneeDrop && (
                          <div className="absolute left-0 bottom-full mb-1 w-44 bg-[#fffefb] border border-[#c5c0b1] rounded-[5px] p-1 shadow-xl z-50 max-h-40 overflow-y-auto">
                            {personnelList.map(p => (
                              <button
                                key={p._id}
                                type="button"
                                onClick={() => { setAssignedUser(p); setOpenAssigneeDrop(false); }}
                                className="w-full text-left px-2 py-1.5 text-xs text-[#36342e] hover:bg-[#00a76b] hover:text-white rounded font-semibold transition-colors"
                              >
                                {p.fullName || p.name}
                              </button>
                            ))}
                            {personnelList.length === 0 && (
                              <div className="text-[10px] text-[#939084] text-center py-2">No personnel found</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Due Date */}
                      <div 
                        className="relative flex items-center gap-1.5 px-2.5 py-1 hover:bg-[#eceae3] rounded-[4px] text-[#939084] hover:text-[#201515] text-[11px] font-bold transition-colors border border-dashed border-[#c5c0b1] cursor-pointer"
                        onClick={(e) => {
                          const input = e.currentTarget.querySelector('input');
                          if (input && input.showPicker) {
                            try { input.showPicker(); } catch (err) {}
                          }
                        }}
                      >
                        <Calendar size={12} />
                        <span>{dueDateVal ? new Date(dueDateVal).toLocaleDateString() : 'Due date'}</span>
                        <input
                          type="date"
                          value={dueDateVal}
                          onChange={(e) => setDueDateVal(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onClick={(e) => {
                            // Prevent bubbling if input is clicked directly, to avoid double showPicker
                            e.stopPropagation();
                            if (e.target.showPicker) {
                              try { e.target.showPicker(); } catch (err) {}
                            }
                          }}
                        />
                      </div>

                      {/* Priority */}
                      <div className="relative" ref={priorityRef}>
                        <button 
                          type="button" 
                          onClick={() => setOpenPriorityDrop(!openPriorityDrop)}
                          className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-[#eceae3] rounded-[4px] text-[#939084] hover:text-[#201515] text-[11px] font-bold transition-colors border border-dashed border-[#c5c0b1]"
                        >
                          <Flag size={12} className={priorityVal === 'High' ? 'text-red-500' : priorityVal === 'Medium' ? 'text-amber-500' : 'text-[#939084]'} />
                          {priorityVal} Priority
                        </button>
                        {openPriorityDrop && (
                          <div className="absolute left-0 bottom-full mb-1 w-32 bg-[#fffefb] border border-[#c5c0b1] rounded-[5px] p-1 shadow-xl z-50">
                            {['High', 'Medium', 'Low'].map(prio => (
                              <button
                                key={prio}
                                type="button"
                                onClick={() => { setPriorityVal(prio); setOpenPriorityDrop(false); }}
                                className="w-full text-left px-2 py-1.5 text-xs text-[#36342e] hover:bg-[#00a76b] hover:text-white rounded font-semibold transition-colors"
                              >
                                {prio}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="relative">
                        <button 
                          type="button" 
                          onClick={() => setShowTagInput(!showTagInput)}
                          className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-[#eceae3] rounded-[4px] text-[#939084] hover:text-[#201515] text-[11px] font-bold transition-colors border border-dashed border-[#c5c0b1]"
                        >
                          <Tag size={12} />
                          Tags
                        </button>
                        {showTagInput && (
                          <input
                            type="text"
                            placeholder="Add tag + Enter"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            className="absolute left-0 bottom-full mb-1 w-36 bg-[#fffefb] border border-[#c5c0b1] text-xs rounded-[4px] px-2 py-1 outline-none text-[#201515] shadow-lg"
                            autoFocus
                            onBlur={() => setShowTagInput(false)}
                          />
                        )}
                      </div>

                      <div className="relative">
                        <button 
                          type="button" 
                          onClick={() => setShowMoreOptions(!showMoreOptions)}
                          className={`p-1 rounded-[4px] transition-colors border border-transparent ${showMoreOptions ? 'bg-[#00a76b] text-white' : 'hover:bg-[#eceae3] text-[#939084]'}`}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {showMoreOptions && (
                          <div className="absolute left-0 bottom-full mb-1 w-40 bg-[#fffefb] border border-[#c5c0b1] rounded-[5px] p-1 shadow-xl z-50">
                            {[
                              { label: 'Add Watchers', icon: <Users size={12} /> },
                              { label: 'Set Dependencies', icon: <Link2 size={12} /> },
                              { label: 'Make Private', icon: <ShieldCheck size={12} /> },
                              { label: 'Clear Form', icon: <RefreshCw size={12} />, action: () => setFormData({ title: '', description: '', tags: '', dueDate: '', priority: 'Normal', projectId: '', assignedUser: null, attachments: [] }) }
                            ].map((opt, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (opt.action) opt.action();
                                  else toast.success(`${opt.label} feature coming soon`);
                                  setShowMoreOptions(false);
                                }}
                                className="w-full flex items-center gap-2 text-left px-2 py-1.5 text-xs text-[#36342e] hover:bg-[#00a76b] hover:text-white rounded font-semibold transition-colors"
                              >
                                {opt.icon}
                                <span>{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tag chips rendering */}
                    {tagsList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tagsList.map(tag => (
                          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#201515] text-[#00a76b] text-[10px] font-bold border border-[#201515]/80 uppercase">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="text-white/40 hover:text-red-400">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Custom fields inline controls */}
                    {customFields.length > 0 && (
                      <div className="space-y-2 mt-3 pt-3 border-t border-[#eceae3]">
                        <p className="text-[10px] text-[#939084] font-bold uppercase tracking-wider">Custom Properties</p>
                        {customFields.map((f, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <span className="text-xs text-[#36342e] w-24 truncate font-semibold">{f.name}:</span>
                            <input
                              type="text"
                              placeholder={`Enter ${f.name}`}
                              value={f.value}
                              onChange={(e) => updateCustomFieldValue(index, e.target.value)}
                              className="bg-[#eceae3] border border-[#c5c0b1] rounded-[4px] px-2.5 py-1 text-xs text-[#201515] placeholder:text-[#939084] focus:outline-none focus:border-[#00a76b] w-48"
                            />
                            <button type="button" onClick={() => removeCustomField(index)} className="text-[#939084] hover:text-red-500">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fields Section */}
                    <div className="pt-4 border-t border-[#eceae3]">
                      <p className="text-[11px] text-[#939084] font-bold uppercase tracking-wider mb-2">Fields</p>
                      <button 
                        type="button" 
                        onClick={handleAddCustomField}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[#eceae3] hover:bg-[#00a76b] hover:text-white border border-[#c5c0b1] hover:border-[#00a76b] rounded-[4px] text-[#36342e] text-[11px] font-bold transition-colors w-max"
                      >
                        <Plus size={12} />
                        Create new field
                      </button>
                    </div>
                  </>
                )}

                {/* Doc Editor Tab */}
                {activeTab === 'Doc' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <input
                      type="text"
                      placeholder="Doc Title"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full bg-transparent text-[#201515] text-lg font-bold placeholder:text-[#c5c0b1] outline-none border-none focus:ring-0 p-0"
                    />
                    <textarea
                      placeholder="Start writing documentation, notes, or sprint scopes..."
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                      className="w-full h-48 bg-transparent text-[#36342e] text-xs placeholder:text-[#939084] outline-none border-none focus:ring-0 p-0 resize-none leading-relaxed"
                    />
                    <div className="flex justify-end gap-2 pt-3 border-t border-[#eceae3]">
                      <button
                        type="button"
                        onClick={() => {
                          if (docTitle.trim() && docContent.trim()) {
                            setFormData(prev => ({
                              ...prev,
                              description: `${prev.description}\n\n### Doc: ${docTitle}\n${docContent}`
                            }));
                            setDocTitle('');
                            setDocContent('');
                            toast.success("Document appended to task description!");
                            setActiveTab('Task');
                          } else {
                            toast.error("Please enter a title and content first");
                          }
                        }}
                        className="px-4 py-1.5 bg-[#00a76b] hover:bg-[#e64600] text-white rounded-[4px] text-xs font-bold"
                      >
                        Append to Task
                      </button>
                    </div>
                  </div>
                )}

                {/* Reminder Tab */}
                {activeTab === 'Reminder' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <label className="text-[10px] text-[#939084] font-bold uppercase tracking-wider block mb-1">Reminder Action</label>
                      <input
                        type="text"
                        placeholder="E.g. Check database metrics, Ping HR lead..."
                        value={reminderTitle}
                        onChange={(e) => setReminderTitle(e.target.value)}
                        className="w-full bg-[#eceae3] border border-[#c5c0b1] rounded-[4px] p-2 text-xs text-[#201515] placeholder:text-[#939084] focus:outline-none focus:border-[#00a76b]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#939084] font-bold uppercase tracking-wider block mb-1">Set Date & Time</label>
                      <input
                        type="datetime-local"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="bg-[#eceae3] border border-[#c5c0b1] rounded-[4px] p-2 text-xs text-[#201515] focus:outline-none focus:border-[#00a76b]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-[#eceae3]">
                      <button
                        type="button"
                        onClick={() => {
                          if (reminderTitle.trim() && reminderTime) {
                            setFormData(prev => ({
                              ...prev,
                              description: `${prev.description}\n\n[Reminder: ${reminderTitle} at ${new Date(reminderTime).toLocaleString()}]`
                            }));
                            setReminderTitle('');
                            setReminderTime('');
                            toast.success("Reminder added to task!");
                            setActiveTab('Task');
                          } else {
                            toast.error("Please enter action and choose time");
                          }
                        }}
                        className="px-4 py-1.5 bg-[#00a76b] hover:bg-[#e64600] text-white rounded-[4px] text-xs font-bold"
                      >
                        Set Reminder
                      </button>
                    </div>
                  </div>
                )}

                {/* Whiteboard tab */}
                {activeTab === 'Whiteboard' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      {/* Color palette */}
                      <div className="flex items-center gap-2">
                        {[
                          { color: '#ef4444', bg: 'bg-red-500' },
                          { color: '#8b5cf6', bg: 'bg-purple-500' },
                          { color: '#3b82f6', bg: 'bg-blue-500' },
                          { color: '#22c55e', bg: 'bg-green-500' },
                          { color: '#f59e0b', bg: 'bg-amber-500' },
                          { color: '#201515', bg: 'bg-[#201515]' },
                          { color: '#ffffff', bg: 'bg-white' },
                        ].map(({ color, bg }) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setBrushColor(color)}
                            className={`w-5 h-5 rounded-full ${bg} border-2 transition-all ${
                              brushColor === color ? 'border-[#00a76b] scale-125' : 'border-[#c5c0b1]'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#939084]">
                        <span>Brush:</span>
                        <input
                          type="range"
                          min="1"
                          max="15"
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="w-20 accent-[#00a76b]"
                        />
                        <span className="w-4 text-center font-bold text-[#201515]">{brushSize}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button type="button" onClick={clearCanvas} className="px-2.5 py-1 hover:bg-[#eceae3] rounded-[4px] text-[#939084] hover:text-[#201515] text-xs font-semibold transition-colors">
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={saveWhiteboardAsAttachment}
                          className="px-3 py-1 bg-[#00a76b] hover:bg-[#e64600] text-white rounded-[4px] text-xs font-bold transition-colors"
                        >
                          Save drawing
                        </button>
                        {/* Sidebar toggle */}
                        <button
                          type="button"
                          onClick={() => setShowDrawingSidebar(s => !s)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-bold border transition-all ${
                            showDrawingSidebar
                              ? 'bg-[#201515] text-white border-[#201515]'
                              : 'bg-[#eceae3] text-[#36342e] border-[#c5c0b1] hover:border-[#201515]'
                          }`}
                          title={showDrawingSidebar ? 'Close saved drawings' : 'Open saved drawings'}
                        >
                          <Layers size={13} />
                          {showDrawingSidebar ? 'Hide' : 'Gallery'}
                          {savedDrawings.length > 0 && (
                            <span className="bg-[#00a76b] text-white text-[9px] font-black px-1.5 rounded-full">
                              {savedDrawings.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Canvas wrapper — sidebar floats absolutely so canvas never shrinks */}
                    <div className="relative border border-[#c5c0b1] rounded-[5px] overflow-hidden bg-white shadow-inner">
                      <canvas
                        ref={canvasRef}
                        width="700"
                        height="300"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="w-full cursor-crosshair block"
                        style={{ touchAction: 'none', height: '300px' }}
                      />

                      {/* Saved Drawings Sidebar — absolute overlay on canvas right side */}
                      {showDrawingSidebar && (
                        <div className="absolute top-0 right-0 h-full w-44 border-l border-[#c5c0b1] bg-[#fffefb] flex flex-col overflow-hidden shadow-xl animate-in slide-in-from-right-2 duration-200 z-10">
                          {/* Sidebar header */}
                          <div className="flex items-center justify-between px-3 py-2 bg-[#00a76b] shrink-0">
                            <div className="flex items-center gap-1.5">
                              <Layers size={12} className="text-white" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-white">Saved</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowDrawingSidebar(false)}
                              className="text-white/60 hover:text-white transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          {/* Sidebar drawings list */}
                          <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {savedDrawings.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
                                <Palette size={24} className="text-[#c5c0b1]" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-[#c5c0b1]">No drawings saved yet</p>
                              </div>
                            ) : (
                              savedDrawings.map((drawing) => (
                                <div
                                  key={drawing.id}
                                  className="group relative border border-[#eceae3] rounded-[4px] overflow-hidden cursor-pointer hover:border-[#00a76b] transition-all bg-white shadow-sm"
                                >
                                  <img
                                    src={drawing.dataUrl}
                                    alt={`Drawing ${drawing.timestamp}`}
                                    className="w-full h-20 object-cover block"
                                    onClick={() => loadDrawingToCanvas(drawing.dataUrl)}
                                  />
                                  {/* Overlay actions */}
                                  <div className="absolute inset-0 bg-[#201515]/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => loadDrawingToCanvas(drawing.dataUrl)}
                                      className="flex items-center gap-1 px-2 py-1 bg-[#00a76b] text-white rounded-[3px] text-[9px] font-black uppercase tracking-widest hover:bg-[#e64600] transition-colors"
                                    >
                                      <Monitor size={10} /> Load
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteDrawing(drawing.id)}
                                      className="flex items-center gap-1 px-2 py-1 bg-white/10 text-white rounded-[3px] text-[9px] font-black uppercase tracking-widest hover:bg-red-500 transition-colors"
                                    >
                                      <Trash2 size={10} /> Delete
                                    </button>
                                  </div>
                                  <div className="px-2 py-1 bg-[#eceae3] border-t border-[#c5c0b1]">
                                    <p className="text-[8px] font-bold text-[#939084] uppercase tracking-widest">{drawing.timestamp}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dashboard Analytics Tab */}
                {activeTab === 'Dashboard' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
                    <div className="bg-[#eceae3] border border-[#c5c0b1] p-4 rounded-[5px] text-center">
                      <p className="text-[#939084] text-[10px] font-bold uppercase tracking-wider mb-1">Total Objectives</p>
                      <h4 className="text-2xl font-black text-[#201515]">{tasks.length}</h4>
                    </div>
                    <div className="bg-[#eceae3] border border-[#c5c0b1] p-4 rounded-[5px] text-center">
                      <p className="text-[#939084] text-[10px] font-bold uppercase tracking-wider mb-1">Completed Rate</p>
                      <h4 className="text-2xl font-black text-green-600">
                        {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100) : 0}%
                      </h4>
                    </div>
                    <div className="bg-[#eceae3] border border-[#c5c0b1] p-4 rounded-[5px] text-center">
                      <p className="text-[#939084] text-[10px] font-bold uppercase tracking-wider mb-1">Under Review</p>
                      <h4 className="text-2xl font-black text-[#00a76b]">
                        {tasks.filter(t => t.status === 'Review').length}
                      </h4>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer controls */}
              {activeTab !== 'Whiteboard' && (
                <div className="flex items-center justify-between p-3 bg-[#00a76b] border-t border-[#00a76b]/80 shrink-0">
                  <div className="relative" ref={templatesRef}>
                    <button 
                      type="button" 
                      onClick={() => setOpenTemplatesDrop(!openTemplatesDrop)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-white hover:bg-white/10 rounded-[4px] text-xs font-bold transition-colors"
                    >
                      <LayoutTemplate size={14} />
                      Templates
                    </button>
                    {openTemplatesDrop && (
                      <div className="absolute left-0 bottom-full mb-1 w-56 bg-[#fffefb] border border-[#c5c0b1] rounded-[5px] p-1.5 shadow-xl z-50">
                        <p className="text-[10px] text-[#939084] font-bold uppercase tracking-wider px-2 py-1 border-b border-[#eceae3] mb-1">Choose Template</p>
                        {templates.map(tpl => (
                          <button
                            key={tpl.name}
                            type="button"
                            onClick={() => applyTemplate(tpl)}
                            className="w-full text-left px-2 py-1.5 text-xs text-[#36342e] hover:bg-[#00a76b] hover:text-white rounded-[4px] font-semibold transition-colors"
                          >
                            {tpl.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 mr-1">
                      <label className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-[4px] transition-colors cursor-pointer" title="Attach file">
                        <Paperclip size={16} />
                        <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                      </label>
                      
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAlertEnabled(!isAlertEnabled);
                          toast.success(isAlertEnabled ? "Task notification disabled" : "Task notification enabled");
                        }}
                        className={`flex items-center gap-1 p-1.5 rounded-[4px] transition-colors relative ${isAlertEnabled ? 'text-amber-300 bg-white/10 hover:bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        title="Toggle notification alerts"
                      >
                        <Bell size={16} />
                        {formData.attachments.length > 0 && (
                          <span className="text-[9px] font-bold bg-[#201515] text-white px-1.5 rounded-full absolute -top-0.5 -right-0.5">
                            {formData.attachments.length}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center relative">
                      <button 
                        type="submit" 
                        disabled={loading || activeTab !== 'Task'} 
                        className="bg-[#201515] hover:bg-[#2c1f1f] text-white px-4 py-1.5 rounded-l-[4px] text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Creating...' : 'Create Task'}
                      </button>
                      <button 
                        id="create-task-dropdown-btn"
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowCreateDropdown(!showCreateDropdown);
                        }}
                        className="bg-[#201515] hover:bg-[#2c1f1f] border-l border-white/20 text-white px-1.5 py-1.5 rounded-r-[4px] transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>

                      {showCreateDropdown && (
                        <div id="create-task-dropdown-menu" className="absolute bottom-full right-0 mb-1 w-48 bg-white border border-[#eceae3] rounded-[8px] shadow-xl overflow-hidden z-[9999]">
                          <div className="py-1">
                            <button 
                              type="button"
                              onClick={(e) => {
                                setShowCreateDropdown(false);
                                handleSubmit(e);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-[#36342e] hover:bg-[#f5f4f0] transition-colors"
                            >
                              Create & Add Another
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                setShowCreateDropdown(false);
                                setStatusVal('Pending');
                                setTimeout(() => handleSubmit(e), 0);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-[#36342e] hover:bg-[#f5f4f0] transition-colors"
                            >
                              Save as Draft
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right Protocol/Guidelines column */}
          <div className="space-y-4 flex flex-col">
            <div className="text-center"><h1 className="text-xl font-black text-[#201515] tracking-tighter uppercase leading-none">Morning <span className="text-[#00a76b]">Creation.</span></h1></div>
            <div className="bg-[#201515] text-white p-5 rounded-[5px] shadow-xl relative overflow-hidden flex-1 min-h-[220px]">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#00a76b]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="relative h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4 shrink-0"><Info size={16} className="text-[#00a76b]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#00a76b]">Protocol.</h3></div>
                <ul className="space-y-4 text-[11px] font-bold text-white/80 p-0 list-none flex-1">
                  <li className="flex gap-3"><div className="w-6 h-6 rounded-[3px] bg-[#00a76b] flex items-center justify-center text-white shrink-0 text-[10px]">1</div><span className="leading-tight">Log within first hour of shift.</span></li>
                  <li className="flex gap-3"><div className="w-6 h-6 rounded-[3px] bg-[#00a76b] flex items-center justify-center text-white shrink-0 text-[10px]">2</div><span className="leading-tight">Upload all visual references.</span></li>
                  <li className="flex gap-3"><div className="w-6 h-6 rounded-[3px] bg-[#00a76b] flex items-center justify-center text-white shrink-0 text-[10px]">3</div><span className="leading-tight">Update status at EOD.</span></li>
                </ul>
                <div className="mt-6 pt-4 border-t border-white/10 shrink-0">
                   <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={13} className="text-[#00a76b]" /><h4 className="text-[10px] font-black uppercase tracking-widest text-[#00a76b]">Mission.</h4></div>
                   <p className="text-[12px] font-bold text-white italic leading-relaxed">"Clear mission wins days. Precision execution defines success."</p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Personal Mission Control Section */}
        {(isHigherRole || userRole === 'employee') && (
           <div className="mt-10 animate-in slide-in-from-right-8 duration-500">
              <div className="zap-card !bg-[#201515] border-none !p-8 shadow-2xl relative !overflow-visible group rounded-[5px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00a76b]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-[#00a76b]/10 transition-colors"></div>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[5px] bg-[#00a76b] flex items-center justify-center text-white shadow-lg shadow-[#00a76b]/20">
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-[18px] font-black text-white uppercase tracking-tighter">Personal Mission Control</h3>
                            <p className="text-[10px] font-bold text-[#00a76b] uppercase tracking-[0.3em]">Direct Command Objectives — {registryDate}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="bg-white/10 text-white text-[9px] font-black px-3 py-2.5 rounded-[5px] uppercase tracking-widest leading-none shrink-0">{myTasks.length} OBJECTIVES</span>
                        <div className="relative" ref={personalCalendarRef}>
                          <button
                            type="button"
                            onClick={() => setShowPersonalCalendar(!showPersonalCalendar)}
                            className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-[#00a76b]/40 rounded-[5px] px-4 h-10 text-[11px] font-black text-white transition-all cursor-pointer uppercase shadow-lg select-none"
                          >
                            <Calendar className="text-[#00a76b]" size={14} />
                            <span>{formatDateDisplay(registryDate)}</span>
                          </button>

                          {showPersonalCalendar && (
                            <div className="absolute right-0 bottom-full mb-2 w-72 bg-[#201515]/95 backdrop-blur-xl border border-white/10 rounded-[5px] p-4 shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-2 duration-200">
                              {/* Calendar Header */}
                              <div className="flex items-center justify-between mb-4">
                                <button
                                  type="button"
                                  onClick={() => setPersonalCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-white transition-colors border-none cursor-pointer"
                                >
                                  <ChevronLeft size={14} />
                                </button>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][personalCalendarMonth.getMonth()]} {personalCalendarMonth.getFullYear()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPersonalCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                  disabled={personalCalendarMonth.getFullYear() >= new Date().getFullYear() && personalCalendarMonth.getMonth() >= new Date().getMonth()}
                                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-white transition-colors border-none cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              </div>

                              {/* Week Days Header */}
                              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                  <div key={d} className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                                    {d}
                                  </div>
                                ))}
                              </div>

                              {/* Days Grid */}
                              <div className="grid grid-cols-7 gap-1">
                                {getDaysInMonth(personalCalendarMonth).map((day, idx) => {
                                  if (!day) return <div key={`empty-${idx}`} className="w-8 h-8" />;
                                  
                                  const dayStr = getYYYYMMDD(day);
                                  const isSelected = dayStr === registryDate;
                                  const isFuture = dayStr > today;
                                  
                                  return (
                                    <button
                                      key={dayStr}
                                      type="button"
                                      disabled={isFuture}
                                      onClick={() => {
                                        setRegistryDate(dayStr);
                                        setShowPersonalCalendar(false);
                                      }}
                                      className={`w-8 h-8 rounded-[5px] flex items-center justify-center text-[10px] font-bold transition-all border-none cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#00a76b] text-white shadow-lg shadow-[#00a76b]/20'
                                          : isFuture
                                          ? 'text-white/10 cursor-not-allowed pointer-events-none'
                                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                                      }`}
                                    >
                                      {day.getDate()}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myTasks.length === 0 ? (
                        <div className="col-span-full py-10 text-center border-2 border-dashed border-white/10 rounded-[5px] bg-white/5">
                            <p className="text-[11px] font-black text-white/40 uppercase tracking-widest">No Personal Strategic Objectives Logged</p>
                        </div>
                    ) : myTasks.map(task => (
                        <div 
                            key={task._id} 
                            onClick={() => setSelectedTask(task)}
                            className="bg-white/5 border border-white/10 p-6 rounded-[5px] flex flex-col gap-6 group hover:border-[#00a76b]/50 transition-all shadow-lg hover:shadow-[#00a76b]/5 h-fit cursor-pointer"
                        >
                            <div className="min-w-0 pr-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                           <div className="w-8 h-8 rounded-full bg-[#00a76b]/10 border border-[#00a76b]/30 flex items-center justify-center text-[#00a76b] text-[10px] font-black uppercase shrink-0">
                                              {task.employeeName?.substring(0, 2) || '??'}
                                           </div>
                                           <div className="min-w-0">
                                              <p className="text-[10px] font-black text-white truncate leading-none uppercase tracking-tighter">{task.employeeName || 'COMMANDER'}</p>
                                              <span className="text-[8px] font-black uppercase tracking-widest mt-1 inline-block text-amber-400">
                                                 {userRole?.toUpperCase() || 'OPERATIVE'}
                                              </span>
                                           </div>
                                        </div>

                                        <p className="text-[18px] font-black text-white truncate tracking-tight">{task.title}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                          <div className={`w-2 h-2 rounded-full ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Review' ? 'bg-[#00a76b]' : task.status === 'Need to Improve' ? 'bg-rose-500 animate-pulse' : task.status === 'Ongoing' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                          <span className={`text-[10px] font-black uppercase tracking-widest ${task.status === 'Need to Improve' ? 'text-rose-400' : 'text-white/40'}`}>
                                            {task.status === 'Review' ? 'UNDER REVIEW' : task.status}
                                          </span>
                                        </div>

                                        {task.progressNote && (
                                          <div className="mt-4 p-3 bg-white/5 border-l-2 border-[#00a76b] rounded-r-[5px] animate-in fade-in slide-in-from-left-2">
                                            <p className="text-[8px] font-black text-[#00a76b] uppercase tracking-[0.2em] mb-1">Progress Intel</p>
                                            <p className="text-[11px] font-medium text-white/70 line-clamp-3 leading-relaxed italic">"{task.progressNote}"</p>
                                          </div>
                                        )}
                                    </div>
                                    
                                    {task.attachments?.length > 0 && (
                                        <div className="flex gap-2">
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); openGallery(task.attachments, 0); }}
                                                className="w-14 h-14 rounded-[5px] border-2 border-white/10 overflow-hidden bg-white/10 flex items-center justify-center transition-all cursor-pointer hover:scale-110 hover:border-[#00a76b]/50 shadow-2xl relative group"
                                            >
                                                {((task.attachments[0].fileName || task.attachments[0].path || '').match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) || (task.attachments[0].fileType?.startsWith('image/')) ? (
                                                    <img 
                                                        src={getEvidenceUrl(task.attachments[0])} 
                                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100/201515/ff4f00?text=LOST'; }}
                                                    />
                                                ) : (
                                                    <FileText size={18} className="text-white/40 group-hover:text-[#00a76b] transition-colors" />
                                                )}
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-white">{task.attachments.length > 1 ? `+${task.attachments.length}` : 'VIEW'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 w-full">
                                {[
                                    { s: 'Pending', c: 'bg-amber-500' },
                                    { s: 'Ongoing', c: 'bg-blue-500' },
                                    { s: 'Review', c: 'bg-[#00a76b]' }
                                ].map((btn, idx) => (
                                    <button 
                                        key={btn.s}
                                        onClick={(e) => { e.stopPropagation(); task._id && handleStatusClick(task._id, btn.s); }}
                                        className={`h-9 px-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer flex items-center justify-center gap-1 shadow-lg ${task.status === btn.s ? btn.c + ' text-white ring-2 ring-white/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.status === btn.s ? 'bg-white' : btn.c}`}></div>
                                        <span>{btn.s}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
              </div>
           </div>
        )}

        {/* Mission Registry Section (Higher Roles Only) */}
        {!isModal && isHigherRole && (
          <div className="mt-10 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="zap-card !bg-[#201515] border-none !px-8 !pt-6 !pb-5 flex flex-col gap-4 shadow-2xl rounded-[5px] min-h-[680px]">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-3"><ShieldCheck size={16} className="text-[#00a76b]" /> Mission Registry</h4>
                   <span className="bg-[#00a76b] text-white text-[9px] font-black px-2 py-0.5 rounded-[5px] uppercase tracking-tighter">{filteredTasks.length} Nodes Detected</span>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-4">
                   {userRole !== 'employee' && (
                      <div className="relative" ref={registryFilterRef}>
                          <div 
                          onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                          className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-[5px] px-5 py-1.5 h-12 cursor-pointer hover:border-[#00a76b]/40 transition-all min-w-[180px]"
                          >
                          <Users size={16} className="text-[#00a76b]" />
                          <span className="text-[11px] font-black text-white uppercase tracking-widest flex-1">
                              {roleOptions.find(o => o.value === roleFilter)?.label || 'All Roles'}
                          </span>
                          <ChevronDown size={14} className={`text-white/40 transition-transform duration-300 ${showRoleDropdown ? 'rotate-180' : ''}`} />
                          </div>
                          
                          {showRoleDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#201515] border border-white/10 rounded-[5px] shadow-2xl z-[100] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                              {roleOptions.map((opt) => (
                                  <div 
                                  key={opt.value}
                                  onClick={() => { setRoleFilter(opt.value); setShowRoleDropdown(false); }}
                                  className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${roleFilter === opt.value ? 'bg-[#00a76b] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                                  >
                                      {opt.label}
                                  </div>
                              ))}
                          </div>
                          )}
                      </div>
                   )}

                   <div className="relative" ref={registryCalendarRef}>
                      <button
                        type="button"
                        onClick={() => setShowRegistryCalendar(!showRegistryCalendar)}
                        className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-[#00a76b]/40 rounded-[5px] px-5 h-12 text-[11px] font-black text-white transition-all cursor-pointer uppercase shadow-lg select-none min-w-[150px]"
                      >
                        <Calendar className="text-[#00a76b]" size={16} />
                        <span>{formatDateDisplay(registryDate)}</span>
                      </button>

                      {showRegistryCalendar && (
                        <div className="absolute right-0 bottom-full mb-2 w-72 bg-[#201515]/95 backdrop-blur-xl border border-white/10 rounded-[5px] p-4 shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-2 duration-200">
                          {/* Calendar Header */}
                          <div className="flex items-center justify-between mb-4">
                            <button
                              type="button"
                              onClick={() => setRegistryCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-white transition-colors border-none cursor-pointer"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">
                              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][registryCalendarMonth.getMonth()]} {registryCalendarMonth.getFullYear()}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRegistryCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                              disabled={registryCalendarMonth.getFullYear() >= new Date().getFullYear() && registryCalendarMonth.getMonth() >= new Date().getMonth()}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-white transition-colors border-none cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>

                          {/* Week Days Header */}
                          <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                              <div key={d} className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                                {d}
                              </div>
                            ))}
                          </div>

                          {/* Days Grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(registryCalendarMonth).map((day, idx) => {
                              if (!day) return <div key={`empty-${idx}`} className="w-8 h-8" />;
                              
                              const dayStr = getYYYYMMDD(day);
                              const isSelected = dayStr === registryDate;
                              const isFuture = dayStr > today;
                              
                              return (
                                <button
                                  key={dayStr}
                                  type="button"
                                  disabled={isFuture}
                                  onClick={() => {
                                    setRegistryDate(dayStr);
                                    setShowRegistryCalendar(false);
                                  }}
                                  className={`w-8 h-8 rounded-[5px] flex items-center justify-center text-[10px] font-bold transition-all border-none cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#00a76b] text-white shadow-lg shadow-[#00a76b]/20'
                                      : isFuture
                                      ? 'text-white/10 cursor-not-allowed pointer-events-none'
                                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  {day.getDate()}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                   <button onClick={() => fetchTasks(registryDate)} className={`p-3 bg-white/5 hover:bg-[#00a76b]/10 rounded-[5px] text-white/40 hover:text-[#00a76b] transition-all border border-white/10 hover:border-[#00a76b] cursor-pointer ${isSyncing ? 'animate-spin text-[#00a76b]' : ''}`}><RefreshCw size={16} /></button>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto overflow-x-hidden h-[600px] absolute-invisible-scroll pt-6 px-2 pb-8">
                  {paginatedTasks.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-white/5 border border-dashed border-white/10 rounded-[5px] animate-pulse h-full flex flex-col items-center justify-center">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/40">No {roleFilter !== 'All' ? roleFilter : ''} missions logged for {registryDate}</p>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-2 italic">Protocol: Initialize new nodes for this date</p>
                    </div>
                  ) : paginatedTasks.map(task => (
                    <div 
                      key={task._id || (task.title + task.description)} 
                      onClick={() => setSelectedTask(task)}
                      className="bg-white/5 border border-white/10 p-6 rounded-[5px] flex flex-col gap-6 group hover:border-[#00a76b]/50 transition-all shadow-lg hover:shadow-[#00a76b]/5 h-fit cursor-pointer"
                    >
                        <div className="min-w-0 pr-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                 <div className="w-8 h-8 rounded-full bg-[#00a76b]/10 border border-[#00a76b]/30 flex items-center justify-center text-[#00a76b] text-[10px] font-black uppercase shrink-0">
                                    {task.employeeName?.substring(0, 2) || '??'}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-[10px] font-black text-white truncate leading-none uppercase tracking-tighter">{task.employeeName || 'Unknown Agent'}</p>
                                    <span className={`text-[8px] font-black uppercase tracking-widest mt-1 inline-block ${task.employeeRole === 'HR' ? 'text-rose-400' : task.employeeRole === 'Manager' ? 'text-amber-400' : 'text-blue-400'}`}>
                                       {task.employeeRole || 'Infiltrator'}
                                    </span>
                                 </div>
                              </div>

                              <p className="text-[18px] font-black text-white truncate tracking-tight">{task.title}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className={`w-2 h-2 rounded-full ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Review' ? 'bg-[#00a76b]' : task.status === 'Need to Improve' ? 'bg-rose-500 animate-pulse' : task.status === 'Ongoing' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${task.status === 'Need to Improve' ? 'text-rose-400' : 'text-white/40'}`}>
                                  {task.status === 'Review' ? 'UNDER REVIEW' : task.status}
                                </span>
                              </div>
                            </div>
                            
                            {task.attachments?.length > 0 && (
                              <div className="flex gap-2">
                                <div 
                                  onClick={() => openGallery(task.attachments, 0)}
                                  className="w-14 h-14 rounded-[5px] border-2 border-white/10 overflow-hidden bg-white/10 flex items-center justify-center transition-all cursor-pointer hover:scale-110 hover:border-[#00a76b]/50 shadow-2xl relative group"
                                >
                                  {((task.attachments[0].fileName || task.attachments[0].path || '').match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) || (task.attachments[0].fileType?.startsWith('image/')) ? (
                                    <img 
                                      src={getEvidenceUrl(task.attachments[0])} 
                                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100/201515/ff4f00?text=LOST'; }}
                                    />
                                  ) : (
                                    <FileText size={18} className="text-white/40 group-hover:text-[#00a76b] transition-colors" />
                                  )}
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all flex items-center justify-center">
                                    <span className="text-[10px] font-black text-white">{task.attachments.length > 1 ? `+${task.attachments.length}` : 'VIEW'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {statusNote.taskId === task._id ? (
                          <div className="bg-white/10 p-4 rounded-[5px] animate-in zoom-in-95 duration-200">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#00a76b] mb-2 block flex items-center gap-2"><MessageSquare size={10} /> Reason for {statusNote.nextStatus} Status</label>
                            <textarea 
                              autoFocus
                              required
                              placeholder="Provide a brief update..." 
                              className="w-full h-20 bg-black/20 border border-white/10 rounded-[5px] p-3 text-[12px] text-white focus:outline-none focus:border-[#00a76b]/50 resize-none mb-3"
                              value={statusNote.note}
                              onChange={e => setStatusNote({...statusNote, note: e.target.value})}
                            />
                            <div className="flex gap-2">
                              <button onClick={() => setStatusNote({ taskId: null, nextStatus: null, note: '' })} className="flex-1 h-9 rounded-[5px] bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 border-none cursor-pointer">Cancel</button>
                              <button 
                                onClick={() => updateTaskStatus(task._id, statusNote.nextStatus, statusNote.note)}
                                disabled={!statusNote.note.trim()}
                                className="flex-[2] h-9 rounded-[5px] bg-[#00a76b] text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all border-none cursor-pointer disabled:opacity-50"
                              >
                                Confirm Status Update
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 w-full">
                               {isHigherRole && task.status === 'Review' ? (
                                  <>
                                      <button 
                                          onClick={() => handleStatusClick(task._id, 'Need to Improve')}
                                          className="h-10 px-4 col-span-1 rounded-[5px] bg-rose-500/10 text-rose-500 border border-rose-500/50 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                                      >
                                          <AlertCircle size={14} /> IMPROVE
                                      </button>
                                      <button 
                                          onClick={() => handleStatusClick(task._id, 'Completed')}
                                          className="h-10 px-4 col-span-1 rounded-[5px] bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                                      >
                                          <CheckCircle2 size={14} /> COMPLETE
                                      </button>
                                  </>
                              ) : (
                                  [
                                      { s: 'Pending', c: 'bg-amber-500' },
                                      { s: 'Ongoing', c: 'bg-blue-500' },
                                      { s: 'Review', c: 'bg-[#00a76b]' },
                                      ...(isHigherRole ? [{ s: 'Completed', c: 'bg-emerald-500' }] : [])
                                  ].map((btn, idx) => (
                                      <button 
                                          key={btn.s}
                                          onClick={(e) => { e.stopPropagation(); task._id && handleStatusClick(task._id, btn.s); }}
                                          className={`h-10 px-4 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer flex items-center justify-center gap-1 shadow-lg ${isHigherRole && (btn.s === 'Completed' || btn.s === 'Review') ? 'col-span-2' : !isHigherRole && btn.s === 'Review' ? 'col-span-2' : 'col-span-1'} ${task.status === btn.s ? btn.c + ' text-white ring-2 ring-white/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                      >
                                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.status === btn.s ? 'bg-white' : btn.c}`}></div>
                                          <span>{btn.s}</span>
                                      </button>
                                  ))
                              )}
                          </div>
                        )}
                    </div>
                  ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/5">
                   <button 
                     onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                     disabled={currentPage === 1}
                     className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-[#00a76b] text-white rounded-[5px] border border-white/10 transition-all disabled:opacity-20 disabled:hover:bg-white/5 cursor-pointer"
                   >
                    <ChevronLeft size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Previous</span>
                   </button>
                   
                   <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button 
                          key={i} 
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-8 h-8 rounded-[5px] text-[10px] font-black border transition-all cursor-pointer ${currentPage === i + 1 ? 'bg-[#00a76b] border-[#00a76b] text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'}`}
                        >
                           {i + 1}
                        </button>
                      ))}
                   </div>

                   <button 
                     onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                     disabled={currentPage === totalPages}
                     className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-[#00a76b] text-white rounded-[5px] border border-white/10 transition-all disabled:opacity-20 disabled:hover:bg-white/5 cursor-pointer"
                   >
                    <span className="text-[10px] font-black uppercase tracking-widest">Next</span>
                    <ChevronRight size={16} />
                   </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </ModalWrapper>
  );
};

export default TaskCreate;
