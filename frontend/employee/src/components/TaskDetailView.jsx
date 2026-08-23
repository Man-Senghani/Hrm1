import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, ChevronRight, Plus, Phone, CheckCircle2, Maximize2, Sparkles, 
  Circle, Calendar, Hourglass, Timer, User, Flag, Target, Tag, 
  PlusCircle, ListTodo, Link2, CheckSquare, Search, Filter, 
  MoreHorizontal, Star, X, MessageSquare, Paperclip, Smile, Send,
  Play, ChevronDown, Bookmark, Pencil, UserPlus, Reply, ThumbsUp, AlignLeft, Clock, Pause, ShieldCheck, MoreVertical, Trash2,
  Minimize2, Copy, Download, Printer, ArrowDown, ArrowUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const TaskDetailView = ({ onClose, task: initialTask, onAddComment, onAddTimeLog, onTaskChange }) => {
  const [task, setTask] = useState(initialTask);
  
  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const [taskName, setTaskName] = useState(task?.title || 'Task');
  const [description, setDescription] = useState(task?.description || '');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimePopup, setShowTimePopup] = useState(false);

  // Attachment upload states and handlers
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const getEvidenceUrl = (file) => {
    if (!file) return '';
    const rawUrl = file.fileUrl || file.url || file.path || '';
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http') || rawUrl.startsWith('/')) {
      return rawUrl.replace(/\\/g, '/');
    }
    return `/${rawUrl.replace(/\\/g, '/')}`;
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments', file);
    });
    
    const auth = getAuth();
    if (!auth || !task?._id) return;
    
    setIsUploading(true);
    try {
      const res = await axios.put(`/api/tasks/${task._id}`, formData, {
        headers: {
          ...auth.headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data?.success) {
        setTask(res.data.data);
        toast.success("Attachment(s) uploaded successfully!");
      }
    } catch (err) {
      console.error("Failed to upload attachments:", err);
      toast.error(err.response?.data?.message || "Failed to upload attachments");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (fileToDelete) => {
    if (!task?.attachments) return;
    if (!window.confirm(`Are you sure you want to remove "${fileToDelete.fileName || 'this file'}"?`)) return;
    
    const updatedAttachments = task.attachments.filter(a => a._id !== fileToDelete._id);
    
    const auth = getAuth();
    if (!auth || !task?._id) return;
    
    try {
      const res = await axios.put(`/api/tasks/${task._id}`, { attachments: updatedAttachments }, auth);
      if (res.data?.success) {
        setTask(res.data.data);
        toast.success("Attachment removed");
      }
    } catch (err) {
      console.error("Failed to delete attachment:", err);
      toast.error("Failed to remove attachment");
    }
  };

  // New States and Action Handlers
  const navigate = useNavigate();
  const [isStarred, setIsStarred] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [personnelList, setPersonnelList] = useState([]);
  const [searchShareQuery, setSearchShareQuery] = useState('');
  const [showActivitySearch, setShowActivitySearch] = useState(false);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activitySortOrder, setActivitySortOrder] = useState('newest'); // newest | oldest
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);

  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiConversation, setAiConversation] = useState([
    { role: 'assistant', text: 'Hi! I am the Brain AI assistant. How can I help you with this task?' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const shareDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  
  const [isEditingEstimate, setIsEditingEstimate] = useState(false);
  const [estimateVal, setEstimateVal] = useState(task?.timeEstimate || '');
  const [isEditingSprintPoints, setIsEditingSprintPoints] = useState(false);
  const [sprintPointsVal, setSprintPointsVal] = useState(task?.sprintPoints || 0);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagVal, setNewTagVal] = useState('');

  const statusDropdownRef = useRef(null);
  const assigneeDropdownRef = useRef(null);
  const priorityDropdownRef = useRef(null);

  useEffect(() => {
    setEstimateVal(task?.timeEstimate || '');
    setSprintPointsVal(task?.sprintPoints || 0);
  }, [task]);

  const updateTaskProperty = async (fields) => {
    if (!task?._id) return;
    const auth = getAuth();
    if (!auth) return;
    try {
      const res = await axios.put(`/api/tasks/${task._id}`, fields, auth);
      if (res.data?.success) {
        setTask(res.data.data);
        toast.success("Task updated");
        return res.data.data;
      }
    } catch (err) {
      console.error("Failed to update task property:", err);
      toast.error(err.response?.data?.message || "Failed to update task property");
    }
  };

  useEffect(() => {
    if (task?._id) {
      const starred = localStorage.getItem(`starred_task_${task._id}`);
      setIsStarred(starred === 'true');
    }
  }, [task?._id]);

  const toggleStar = () => {
    if (!task?._id) return;
    const newState = !isStarred;
    setIsStarred(newState);
    localStorage.setItem(`starred_task_${task._id}`, newState ? 'true' : 'false');
    if (newState) {
      toast.success('Task added to Favorites');
    } else {
      toast.success('Task removed from Favorites');
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(prev => !prev);
  };

  useEffect(() => {
    const fetchPersonnel = async () => {
      const auth = getAuth();
      if (!auth) return;
      try {
        const res = await axios.get('/api/personnel/all', auth);
        if (res.data) {
          setPersonnelList(res.data);
        }
      } catch (err) {
        try {
          const res = await axios.get('/api/employees', auth);
          if (res.data) setPersonnelList(res.data);
        } catch (e) {
          console.error('Failed to fetch personnel', e);
        }
      }
    };
    fetchPersonnel();
  }, []);

  useEffect(() => {
    const handleClickOutsideDropdowns = (event) => {
      if (showShareDropdown && shareDropdownRef.current && !shareDropdownRef.current.contains(event.target)) {
        if (!event.target.closest('.share-trigger-btn')) {
          setShowShareDropdown(false);
        }
      }
      if (showMoreDropdown && moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        if (!event.target.closest('.more-trigger-btn')) {
          setShowMoreDropdown(false);
        }
      }
      if (showStatusDropdown && statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        if (!event.target.closest('.status-trigger-btn')) {
          setShowStatusDropdown(false);
        }
      }
      if (showAssigneeDropdown && assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target)) {
        if (!event.target.closest('.assignee-trigger-btn')) {
          setShowAssigneeDropdown(false);
        }
      }
      if (showPriorityDropdown && priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
        if (!event.target.closest('.priority-trigger-btn')) {
          setShowPriorityDropdown(false);
        }
      }
      if (!event.target.closest('[data-mention-picker]') && !event.target.closest('[data-mention-trigger]')) {
        setShowMentionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideDropdowns);
    return () => document.removeEventListener('mousedown', handleClickOutsideDropdowns);
  }, [showShareDropdown, showMoreDropdown, showStatusDropdown, showAssigneeDropdown, showPriorityDropdown, showMentionPicker]);

  const handleShareWithUser = async (user) => {
    if (!task?._id) return;
    const auth = getAuth();
    if (!auth) return;
    
    const shareMessage = `Shared this task with ${user.fullName || user.name || 'User'} (${user.role || 'employee'})`;
    
    const systemComment = {
      text: shareMessage,
      userName: 'System Log',
      userRole: 'system',
      createdAt: new Date().toISOString()
    };
    
    const updatedComments = [...(task.comments || []), systemComment];
    setTask(prev => prev ? { ...prev, comments: updatedComments } : prev);
    setShowShareDropdown(false);
    toast.success(`Shared task with ${user.fullName || user.name}`);
    
    try {
      await axios.put(`/api/tasks/${task._id}`, { comments: updatedComments }, auth);
    } catch (err) {
      console.error('Failed to save share event:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!task?._id) return;
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    const auth = getAuth();
    if (!auth) return;
    try {
      await axios.delete(`/api/tasks/${task._id}`, auth);
      toast.success("Task deleted successfully");
      setShowMoreDropdown(false);
      if (onTaskChange) onTaskChange();
      onClose();
    } catch (err) {
      toast.error("Failed to delete task");
    }
  };

  const handleDuplicateTask = async () => {
    if (!task?._id) return;
    const auth = getAuth();
    if (!auth) return;
    try {
      const duplicatedPayload = {
        title: `${task.title} (Copy)`,
        description: task.description || 'No description',
        date: task.date || new Date().toISOString().split('T')[0]
      };
      const res = await axios.post('/api/tasks', duplicatedPayload, auth);
      if (res.data?.success) {
        toast.success("Task duplicated successfully");
        setShowMoreDropdown(false);
        if (onTaskChange) onTaskChange();
        setTask(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to duplicate task");
    }
  };

  const handleExportJSON = () => {
    if (!task) return;
    try {
      const jsonStr = JSON.stringify(task, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Task_${task.title || 'Export'}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Task downloaded as JSON");
      setShowMoreDropdown(false);
    } catch (err) {
      toast.error("Failed to export task");
    }
  };

  const handleProjectsBreadcrumb = () => {
    const activeRole = currentUser?.role || 'admin';
    if (activeRole === 'admin') {
      navigate('/admin/tasks');
    } else {
      navigate(`/${activeRole}/projects`);
    }
    onClose();
  };

  const handleQuickAddFields = () => {
    const tagName = window.prompt("Enter a tag to add to this task:");
    if (!tagName || !tagName.trim()) return;
    const tagMarkdown = `\n\n**Tags:** #${tagName.trim().replace(/\s+/g, '')}`;
    const newDesc = (description || '') + tagMarkdown;
    setDescription(newDesc);
    toast.success(`Tag #${tagName} added to description!`);
    const auth = getAuth();
    if (auth && task?._id) {
      axios.put(`/api/tasks/${task._id}`, { description: newDesc }, auth)
        .catch(err => console.error("Failed to save tag field", err));
    }
  };

  const handleQuickAddSubtask = () => {
    const subtaskText = window.prompt("Enter subtask name:");
    if (!subtaskText || !subtaskText.trim()) return;
    const checklistMarkdown = `\n- [ ] ${subtaskText.trim()}`;
    const newDesc = (description || '') + checklistMarkdown;
    setDescription(newDesc);
    toast.success(`Subtask "${subtaskText}" added to description!`);
    const auth = getAuth();
    if (auth && task?._id) {
      axios.put(`/api/tasks/${task._id}`, { description: newDesc }, auth)
        .catch(err => console.error("Failed to save subtask description", err));
    }
  };

  const handleQuickRelateItems = async () => {
    const auth = getAuth();
    if (!auth) return;
    try {
      const res = await axios.get('/api/tasks', auth);
      if (res.data?.data) {
        const tasks = res.data.data.filter(t => t._id !== task?._id);
        if (tasks.length === 0) {
          toast.error("No other tasks found to relate.");
          return;
        }
        const taskTitles = tasks.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');
        const selectedIdxStr = window.prompt(`Select a task to relate/add dependency:\n\n${taskTitles}\n\nEnter number (1-${tasks.length}):`);
        if (!selectedIdxStr) return;
        const selectedIdx = parseInt(selectedIdxStr) - 1;
        if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= tasks.length) {
          toast.error("Invalid selection.");
          return;
        }
        const relatedTask = tasks[selectedIdx];
        const relationMarkdown = `\n\n**Related Task / Dependency:** [${relatedTask.title}](dependency-task-id:${relatedTask._id})`;
        const newDesc = (description || '') + relationMarkdown;
        setDescription(newDesc);
        toast.success(`Task related to "${relatedTask.title}"!`);
        axios.put(`/api/tasks/${task._id}`, { description: newDesc }, auth)
          .catch(err => console.error("Failed to save relationship", err));
      }
    } catch (err) {
      toast.error("Failed to fetch tasks list for relations.");
    }
  };

  const handleQuickCreateChecklist = () => {
    const listTitle = window.prompt("Enter checklist title:", "Checklist");
    if (listTitle === null) return;
    const checklistMarkdown = `\n\n### ${listTitle || 'Checklist'}:\n- [ ] Task 1\n- [ ] Task 2`;
    const newDesc = (description || '') + checklistMarkdown;
    setDescription(newDesc);
    toast.success("Checklist template appended to description!");
    const auth = getAuth();
    if (auth && task?._id) {
      axios.put(`/api/tasks/${task._id}`, { description: newDesc }, auth)
        .catch(err => console.error("Failed to save checklist description", err));
    }
  };

  const handleAskAIQuickAction = async (actionType) => {
    setAiLoading(true);
    let userMsg = '';
    if (actionType === 'description') {
      userMsg = 'Write a professional description for this task.';
    } else if (actionType === 'subtasks') {
      userMsg = 'Suggest relevant subtasks for this task.';
    } else {
      userMsg = 'Summarize current task progress.';
    }
    
    setAiConversation(prev => [...prev, { role: 'user', text: userMsg }]);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let replyText = '';
    if (actionType === 'description') {
      const generatedDesc = `This objective centers on executing the "${task?.title || 'task'}" scope of work. Critical components include:
1. Requirements gathering and initial mapping.
2. Architecture design aligned with the team's premium UX specifications.
3. Development of key modular features.
4. Validation and end-to-end testing before final deployment.`;
      
      replyText = `I have generated a professional description for you and updated the task details.`;
      setDescription(generatedDesc);
      
      const auth = getAuth();
      if (auth && task?._id) {
        try {
          await axios.put(`/api/tasks/${task._id}`, { description: generatedDesc }, auth);
          toast.success("Task description updated by AI");
        } catch (err) {
          toast.error("Failed to update description");
        }
      }
    } else if (actionType === 'subtasks') {
      const subtaskChecklist = `

### Brain AI Suggested Checklist:
- [ ] [AI] Prepare wireframes and design specs for "${task?.title}"
- [ ] [AI] Implement frontend layouts using CSS variables
- [ ] [AI] Write unit test cases and run automated builds
- [ ] [AI] Perform manual verification across roles (Admin vs HR)`;

      const newDesc = (description || '') + subtaskChecklist;
      replyText = `I have analyzed the title "${task?.title}" and generated a 4-step suggested checklist at the bottom of the description.`;
      setDescription(newDesc);
      
      const auth = getAuth();
      if (auth && task?._id) {
        try {
          await axios.put(`/api/tasks/${task._id}`, { description: newDesc }, auth);
          toast.success("AI subtasks checklist appended!");
        } catch (err) {
          toast.error("Failed to append subtasks");
        }
      }
    } else {
      const logCount = task?.timeLogs?.length || 0;
      const hoursLogged = formatSecondsToHoursMinutes(totalSecondsLogged);
      replyText = `Here is the current EOD status summary for "${task?.title}":
- **Status**: ${task?.status || 'Ongoing'}
- **Created Date**: ${createdDate}
- **Assigned To**: ${task?.employeeName || 'Unassigned'}
- **Time Logged**: ${hoursLogged} across ${logCount} session(s)
- **Activity**: ${task?.comments?.length || 0} comment(s) posted on the feed.`;
    }
    
    setAiConversation(prev => [...prev, { role: 'assistant', text: replyText }]);
    setAiLoading(false);
  };

  const handleCustomAiQuery = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    const query = aiQuery.trim();
    setAiQuery('');
    setAiConversation(prev => [...prev, { role: 'user', text: query }]);
    setAiLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    let reply = '';
    const lower = query.toLowerCase();
    if (lower.includes('help') || lower.includes('what') || lower.includes('how')) {
      reply = `To work with "${task?.title || 'this task'}", you can log time using the Time Tracking panel, add feedback in the comments feed, or toggle the star icon in the navbar to bookmark it. Let me know if you want me to write a description or list checklist items!`;
    } else if (lower.includes('complete') || lower.includes('finish') || lower.includes('done')) {
      reply = `If the task is completed, you can change the status dropdown to "Completed" on the left panel. Don't forget to submit a EOD progress report note if required!`;
    } else {
      reply = `Understood. Regarding your request "${query}" for "${task?.title || 'this task'}", I recommend checking the project guidelines or assigning specific subtasks. Let me know if you would like me to generate a subtask list!`;
    }
    
    setAiConversation(prev => [...prev, { role: 'assistant', text: reply }]);
    setAiLoading(false);
  };

  const messagesEndRef = useRef(null);
  const timePopupRef = useRef(null);

  // Time tracking states
  const [timeInput, setTimeInput] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState([]);
  const [showNotesField, setShowNotesField] = useState(false);
  const [showTagsField, setShowTagsField] = useState(false);
  const [isBillable, setIsBillable] = useState(false);

  // Timer Tick Hook
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Click outside time tracking popup to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTimePopup && timePopupRef.current && !timePopupRef.current.contains(event.target)) {
        if (event.target.closest('.track-time-trigger')) {
          return;
        }
        setShowTimePopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTimePopup]);

  // Update input text with running timer
  useEffect(() => {
    if (isTimerRunning) {
      setTimeInput(formatTimerValue(timerSeconds));
    }
  }, [timerSeconds, isTimerRunning]);

  const formatTimerValue = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  const parseTimeToSeconds = (input) => {
    if (!input) return 0;
    const trimmed = input.toLowerCase().trim();
    let totalSeconds = 0;
    
    const hourRegex = /(\d+(\.\d+)?)\s*h/;
    const minRegex = /(\d+)\s*m/;
    const secRegex = /(\d+)\s*s/;
    
    const hourMatch = trimmed.match(hourRegex);
    const minMatch = trimmed.match(minRegex);
    const secMatch = trimmed.match(secRegex);
    
    if (hourMatch) {
      totalSeconds += parseFloat(hourMatch[1]) * 3600;
    }
    if (minMatch) {
      totalSeconds += parseInt(minMatch[1], 10) * 60;
    }
    if (secMatch) {
      totalSeconds += parseInt(secMatch[1], 10);
    }
    
    if (!hourMatch && !minMatch && !secMatch) {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) {
        totalSeconds = num * 60; // default to minutes if just a number
      }
    }
    
    return totalSeconds;
  };

  const formatSecondsToHoursMinutes = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  const formatLogTimeRange = () => {
    const start = new Date(Date.now() - parseTimeToSeconds(timeInput) * 1000);
    const end = new Date();
    const formatTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
    return `${formatTime(start)} – ${formatTime(end)}`;
  };

  const [editingCommentIdx, setEditingCommentIdx] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [activeDropdownIdx, setActiveDropdownIdx] = useState(null);
  const [activeReactionPickerIdx, setActiveReactionPickerIdx] = useState(null);
  const [bookmarkedComments, setBookmarkedComments] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const getAuth = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : null;
  };

  useEffect(() => {
    const fetchUser = async () => {
      const auth = getAuth();
      if (!auth) return;
      try {
        const res = await axios.get('/api/auth/me', auth);
        if (res.data) {
          setCurrentUser(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch user in detail view');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownIdx(null);
      setActiveReactionPickerIdx(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const toggleReaction = async (commentIdx, emoji) => {
    if (!task?._id || !currentUser) return;
    const auth = getAuth();
    if (!auth) return;

    const updatedComments = [...(task.comments || [])];
    const commentItem = { ...updatedComments[commentIdx] };
    
    if (!commentItem.reactions) {
      commentItem.reactions = {};
    } else {
      commentItem.reactions = { ...commentItem.reactions };
    }

    const myName = currentUser.fullName || currentUser.name || 'System Admin';
    const usersList = commentItem.reactions[emoji] ? [...commentItem.reactions[emoji]] : [];

    if (usersList.includes(myName)) {
      commentItem.reactions[emoji] = usersList.filter(u => u !== myName);
    } else {
      commentItem.reactions[emoji] = [...usersList, myName];
    }

    if (commentItem.reactions[emoji].length === 0) {
      delete commentItem.reactions[emoji];
    }

    updatedComments[commentIdx] = commentItem;
    setTask(prev => ({ ...prev, comments: updatedComments }));

    try {
      const res = await axios.put(`/api/tasks/${task._id}`, { comments: updatedComments }, auth);
      if (res.data.success) {
        setTask(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to update reaction');
    }
  };

  const isCommentLikedByMe = (commentItem) => {
    const myName = currentUser?.fullName || currentUser?.name || 'System Admin';
    return commentItem?.reactions?.['👍']?.includes(myName) || false;
  };

  const saveEditedComment = async (commentIdx) => {
    if (!task?._id || !editingCommentText.trim()) return;
    const auth = getAuth();
    if (!auth) return;

    const updatedComments = [...(task.comments || [])];
    updatedComments[commentIdx] = {
      ...updatedComments[commentIdx],
      text: editingCommentText
    };

    setTask(prev => ({ ...prev, comments: updatedComments }));
    setEditingCommentIdx(null);

    try {
      const res = await axios.put(`/api/tasks/${task._id}`, { comments: updatedComments }, auth);
      if (res.data.success) {
        setTask(res.data.data);
        toast.success('Comment updated');
      }
    } catch (err) {
      toast.error('Failed to update comment');
    }
  };

  const deleteComment = async (commentIdx) => {
    if (!task?._id) return;
    const auth = getAuth();
    if (!auth) return;

    const updatedComments = (task.comments || []).filter((_, idx) => idx !== commentIdx);
    setTask(prev => ({ ...prev, comments: updatedComments }));

    try {
      const res = await axios.put(`/api/tasks/${task._id}`, { comments: updatedComments }, auth);
      if (res.data.success) {
        setTask(res.data.data);
        toast.success('Comment deleted');
      }
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const toggleBookmark = (commentIdx) => {
    setBookmarkedComments(prev => {
      const next = { ...prev, [commentIdx]: !prev[commentIdx] };
      if (next[commentIdx]) {
        toast.success('Comment bookmarked');
      } else {
        toast.success('Removed bookmark');
      }
      return next;
    });
  };

  const improveCommentWithAI = () => {
    if (!comment.trim()) {
      toast.error('Type a comment draft first, then click Sparkles to improve it!');
      return;
    }
    
    const phrase = comment.trim().toLowerCase();
    let professionalText = '';
    
    if (phrase.includes('hello') || phrase.includes('hi') || phrase.includes('hey')) {
      professionalText = "Greetings Team, hope this message finds you well. I would like to initiate an update on the progress of our current objectives.";
    } else if (phrase.includes('done') || phrase.includes('complete') || phrase.includes('finished')) {
      professionalText = "Understood. The assigned parameters of this mission have been successfully executed and validated for deployment.";
    } else if (phrase.includes('need help') || phrase.includes('stuck') || phrase.includes('blocked')) {
      professionalText = "I have encountered an impediment regarding this objective. Requesting assistance or alignment from the team to proceed.";
    } else if (phrase.includes('thanks') || phrase.includes('thank you')) {
      professionalText = "Your prompt response and assistance are highly appreciated. Let's maintain this momentum.";
    } else {
      professionalText = `Acknowledged. Regarding "${comment.trim()}", I have completed my analysis and would recommend aligning on the next phases.`;
    }
    
    setComment(professionalText);
    toast.success('AI Sparkles: Comment professionalized!');
  };

  const improveExistingComment = (commentIdx, text) => {
    setEditingCommentIdx(commentIdx);
    
    const phrase = text.toLowerCase();
    let professionalText = '';
    
    if (phrase.includes('hello') || phrase.includes('hi') || phrase.includes('hey')) {
      professionalText = "Greetings Team, hope this message finds you well. I would like to initiate an update on the progress of our current objectives.";
    } else if (phrase.includes('done') || phrase.includes('complete') || phrase.includes('finished')) {
      professionalText = "Understood. The assigned parameters of this mission have been successfully executed and validated for deployment.";
    } else if (phrase.includes('need help') || phrase.includes('stuck') || phrase.includes('blocked')) {
      professionalText = "I have encountered an impediment regarding this objective. Requesting assistance or alignment from the team to proceed.";
    } else if (phrase.includes('thanks') || phrase.includes('thank you')) {
      professionalText = "Your prompt response and assistance are highly appreciated. Let's maintain this momentum.";
    } else {
      professionalText = `Acknowledged. Regarding "${text}", I have completed my analysis and would recommend aligning on the next phases.`;
    }
    
    setEditingCommentText(professionalText);
    toast.success('AI Sparkles: Rewrote comment. Click Save to update!');
  };

  const handleReplyClick = (userName) => {
    setComment(prev => prev ? `${prev} @${userName} ` : `@${userName} `);
  };

  const handleStartStopTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      onAddTimeLog({
        timeSeconds: timerSeconds,
        notes,
        tags: tagsList,
        isBillable
      });
      setTimerSeconds(0);
      setTimeInput('');
      setNotes('');
      setTagsList([]);
      setShowTimePopup(false);
    } else {
      setIsTimerRunning(true);
    }
  };

  const handleSaveTimeLog = async () => {
    const finalSeconds = parseTimeToSeconds(timeInput);
    if (finalSeconds <= 0) {
      toast.error('Please enter a valid time duration.');
      return;
    }
    try {
      const auth = getAuth();
      if (auth && task?._id) {
        const payload = {
          newTimeLog: {
            duration: finalSeconds,
            startTime: new Date(Date.now() - finalSeconds * 1000).toISOString(),
            endTime: new Date().toISOString(),
            notes: notes || '',
            tags: tagsList || []
          }
        };
        const res = await axios.put(`/api/tasks/${task._id}`, payload, auth);
        if (res.data?.success) {
          setTask(res.data.data);
          toast.success("Time logged successfully!");
        }
      }
      if (onAddTimeLog) {
        await onAddTimeLog({
          timeSeconds: finalSeconds,
          notes,
          tags: tagsList,
          isBillable
        });
      }
      setTimerSeconds(0);
      setTimeInput('');
      setNotes('');
      setTagsList([]);
      setShowTimePopup(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to log time");
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      if (!tagsList.includes(tagInput.trim())) {
        setTagsList([...tagsList, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTagsList(tagsList.filter(tag => tag !== tagToRemove));
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    
    try {
      if (onAddComment) {
        await onAddComment(comment);
      } else {
        // Fallback for standalone usage
        const myName = currentUser?.fullName || currentUser?.name || 'System Admin';
        const myRole = currentUser?.role || 'admin';
        const newComment = {
          text: comment,
          userName: myName,
          userRole: myRole,
          createdAt: new Date().toISOString()
        };
        const updatedComments = [...(task?.comments || []), newComment];
        setTask(prev => prev ? { ...prev, comments: updatedComments } : prev);
        
        const auth = getAuth();
        if (auth && task?._id) {
          await axios.put(`/api/tasks/${task._id}`, { comments: updatedComments }, auth);
        }
      }
      setComment('');
    } catch (err) {
      toast.error('Failed to save comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = task?.status || 'TO DO';
  const createdDate = task?.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
  const totalSecondsLogged = task?.timeLogs?.reduce((acc, log) => acc + (log.duration || log.seconds || 0), 0) || 0;

  return createPortal(
    <>
      <style>{`
        @media print {
          /* Hide EVERYTHING in body except our portal container */
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          
          body, html {
            background: white !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .print-portal-container {
            display: block !important;
            position: static !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          
          #print-task-container {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #print-main-split {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          #print-left-panel, #print-right-panel {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            border: none !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          textarea {
            overflow: visible !important;
            height: auto !important;
          }
        }
      `}</style>
      <div className="print-portal-container fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto animate-in fade-in duration-200 p-4 sm:p-6">
        <div className="fixed inset-0 bg-[#201515]/40 backdrop-blur-sm no-print" onClick={onClose} />
        <div id="print-task-container" className="relative my-auto z-10 flex flex-col bg-[#fffdf9] w-full max-w-[1400px] h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300 border border-[#c5c0b1] rounded-[12px] overflow-hidden">
        
        {/* Top Navigation Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#c5c0b1] bg-[#fffdf9] no-print">
          <span 
            className="cursor-help hover:text-[#201515] transition-colors text-xs text-[#939084] font-bold"
            title={`Created on ${task?.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A'}`}
          >
            Created {createdDate}
          </span>

          <div className="flex items-center gap-4 text-xs text-[#939084] font-bold">
            <div className="relative">
              <button 
                onClick={() => setShowShareDropdown(prev => !prev)}
                className="share-trigger-btn flex items-center gap-1.5 hover:text-[#201515] transition-colors py-1 px-2.5 rounded-[4px] hover:bg-[#eceae3] text-[#939084] font-black text-[10px] uppercase tracking-wider"
              >
                <Users size={14} /> Share
              </button>
            {showShareDropdown && (
              <div 
                ref={shareDropdownRef}
                className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#c5c0b1] rounded-[8px] p-3 shadow-2xl z-[150] animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="text-[11px] font-black uppercase tracking-wider text-[#201515] mb-2">Share Task</div>
                <input
                  type="text"
                  placeholder="Search personnel..."
                  value={searchShareQuery}
                  onChange={(e) => setSearchShareQuery(e.target.value)}
                  className="w-full bg-[#eceae3] border border-[#c5c0b1] rounded-[6px] px-2.5 py-1.5 text-xs text-[#201515] placeholder:text-[#939084] outline-none focus:border-[#00a76b] mb-3"
                />
                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                  {personnelList
                    .filter(u => (u.fullName || u.name || '').toLowerCase().includes(searchShareQuery.toLowerCase()))
                    .map(user => (
                      <button
                        key={user._id}
                        onClick={() => handleShareWithUser(user)}
                        className="w-full flex items-center justify-between text-left p-1.5 rounded-[4px] hover:bg-[#eceae3] transition-colors text-xs text-[#201515] font-bold uppercase"
                      >
                        <span>{user.fullName || user.name}</span>
                        <span className="text-[9px] text-[#939084] uppercase bg-[#eceae3] px-1.5 py-0.5 rounded border border-[#c5c0b1]">{user.role}</span>
                      </button>
                    ))}
                  {personnelList.length === 0 && (
                    <div className="text-[11px] text-[#939084] text-center py-4">No recipients found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 border-l border-[#c5c0b1] pl-4">
            <div className="relative">
              <button 
                onClick={() => setShowMoreDropdown(prev => !prev)}
                className="more-trigger-btn p-1.5 hover:bg-[#eceae3] rounded transition-colors text-[#939084] hover:text-[#201515]"
                title="More Options"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMoreDropdown && (
                <div 
                  ref={moreDropdownRef}
                  className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#c5c0b1] rounded-[8px] py-1.5 shadow-2xl z-[150] animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <button
                    onClick={handleDuplicateTask}
                    className="w-full text-left px-4 py-2 hover:bg-[#eceae3] text-[11px] font-bold uppercase text-[#201515] transition-colors flex items-center gap-2"
                  >
                    <Copy size={13} className="text-[#939084]" /> Duplicate Task
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full text-left px-4 py-2 hover:bg-[#eceae3] text-[11px] font-bold uppercase text-[#201515] transition-colors flex items-center gap-2"
                  >
                    <Download size={13} className="text-[#939084]" /> Export as JSON
                  </button>
                  <button
                    onClick={() => { window.print(); setShowMoreDropdown(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-[#eceae3] text-[11px] font-bold uppercase text-[#201515] transition-colors flex items-center gap-2"
                  >
                    <Printer size={13} className="text-[#939084]" /> Print Task
                  </button>
                  <div className="border-t border-[#c5c0b1] my-1"></div>
                  <button
                    onClick={handleDeleteTask}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-[11px] font-black uppercase text-red-600 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={13} className="text-red-500" /> Delete Task
                  </button>
                </div>
              )}
            </div>
            
            <button 
              onClick={toggleStar}
              className={`p-1.5 hover:bg-[#eceae3] rounded transition-colors ${isStarred ? 'text-amber-500' : 'text-[#939084] hover:text-[#201515]'}`}
              title={isStarred ? "Remove from favorites" : "Add to favorites"}
            >
              <Star size={16} className={isStarred ? 'fill-current' : ''} />
            </button>

            <button 
              onClick={toggleMaximize}
              className="p-1.5 hover:bg-[#eceae3] rounded transition-colors text-[#939084] hover:text-[#201515]"
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button onClick={onClose} className="p-1.5 hover:bg-[#eceae3] rounded transition-colors text-[#201515]" title="Close"><X size={16} /></button>
          </div>
        </div>
      </div>

        {/* Main Content Area Split */}
        <div id="print-main-split" className="flex-1 flex overflow-hidden">
          
          {/* Left Panel - Task Details */}
          <div id="print-left-panel" className="flex-1 overflow-y-auto bg-[#fffdf9] p-3 custom-scrollbar">
            
            {/* Task Title */}
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              onBlur={() => updateTaskProperty({ title: taskName })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.target.blur();
                }
              }}
              className="w-full bg-transparent text-[#201515] text-2xl font-black mb-2 outline-none border-none focus:ring-0 p-0 uppercase tracking-tight"
            />

            {/* Attributes Grid - Order: Status, Assignees, Time Estimate, Track Time, Dates, Sprint Points, Priority, Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-3 w-full">
              
              {/* Status */}
              <div className="flex items-center justify-between group relative">
                <div className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] w-[160px] shrink-0 mr-3"><Circle size={13}/> Status</div>
                <div className="flex-1 flex items-center gap-1.5" ref={statusDropdownRef}>
                  <button 
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="status-trigger-btn flex items-center gap-1.5 px-2.5 py-1 bg-[#eceae3] rounded-[3px] text-[13px] font-black uppercase tracking-wider text-[#201515] hover:bg-[#201515] hover:text-white transition-colors border border-[#c5c0b1]"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      status === 'Completed' ? 'bg-[#24a148]' : 
                      status === 'Ongoing' ? 'bg-blue-500' : 
                      status === 'Review' ? 'bg-[#00a76b]' : 
                      status === 'Need to Improve' ? 'bg-red-500' : 'bg-[#939084]'
                    }`}></span> {status === 'Pending' ? 'In process' : status} <ChevronDown size={10}/>
                  </button>
                  <button 
                    onClick={() => updateTaskProperty({ status: status === 'Completed' ? 'Ongoing' : 'Completed' })}
                    className="p-0.5 bg-[#eceae3] rounded-[3px] text-[#939084] hover:text-[#00a76b] transition-colors border border-[#c5c0b1]"
                    title={status === 'Completed' ? "Mark Ongoing" : "Mark Completed"}
                  >
                    <CheckCircle2 size={12}/>
                  </button>

                  {showStatusDropdown && (
                    <div className="absolute top-full left-32 mt-1 w-48 bg-white border border-[#c5c0b1] rounded-[6px] py-1 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      {['Pending', 'Ongoing', 'Review', 'Completed', 'Need to Improve'].map(sOption => (
                        <button
                          key={sOption}
                          onClick={async () => {
                            setShowStatusDropdown(false);
                            await updateTaskProperty({ status: sOption });
                          }}
                          className="w-full flex items-center gap-2 text-left px-3 py-1.5 hover:bg-[#eceae3] text-[13px] font-black uppercase tracking-wider text-[#201515] transition-colors"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            sOption === 'Completed' ? 'bg-[#24a148]' : 
                            sOption === 'Ongoing' ? 'bg-blue-500' : 
                            sOption === 'Review' ? 'bg-[#00a76b]' : 
                            sOption === 'Need to Improve' ? 'bg-red-500' : 'bg-[#939084]'
                          }`}></span>
                          {sOption === 'Pending' ? 'In process' : sOption}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignees */}
              <div className="flex items-center justify-between group relative">
                <div className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] w-[160px] shrink-0 mr-3"><User size={13}/> Assignees</div>
                <div className="flex-1" ref={assigneeDropdownRef}>
                  <button 
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    className="assignee-trigger-btn text-[13px] text-[#201515] font-bold cursor-pointer hover:text-[#00a76b] transition-colors flex items-center gap-1.5"
                  >
                    {task?.employeeName || 'Empty'} <ChevronDown size={10} className="text-[#939084]"/>
                  </button>
                  {showAssigneeDropdown && (
                    <div className="absolute top-full left-32 mt-1 w-60 bg-white border border-[#c5c0b1] rounded-[6px] p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-48 overflow-y-auto custom-scrollbar">
                      {personnelList.map(u => (
                        <button
                          key={u._id}
                          onClick={async () => {
                            setShowAssigneeDropdown(false);
                            await updateTaskProperty({ userId: u._id });
                          }}
                          className="w-full flex items-center justify-between text-left px-2.5 py-1.5 hover:bg-[#eceae3] rounded-[4px] text-[13px] font-black uppercase tracking-wider text-[#201515] transition-colors"
                        >
                          <span>{u.fullName || u.name}</span>
                          <span className="text-[9px] text-[#939084] uppercase bg-[#eceae3] px-1 py-0.5 rounded border border-[#c5c0b1]">{u.role}</span>
                        </button>
                      ))}
                      {personnelList.length === 0 && (
                        <div className="text-[13px] text-[#939084] text-center py-2">No personnel found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Time Estimate */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] w-[160px] shrink-0 mr-3"><Hourglass size={13}/> Time estimate</div>
                <div className="flex-1">
                  {isEditingEstimate ? (
                    <input
                      type="text"
                      value={estimateVal}
                      onChange={(e) => setEstimateVal(e.target.value)}
                      onBlur={async () => {
                        setIsEditingEstimate(false);
                        await updateTaskProperty({ timeEstimate: estimateVal });
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          setIsEditingEstimate(false);
                          await updateTaskProperty({ timeEstimate: estimateVal });
                        }
                      }}
                      placeholder="e.g. 4h"
                      className="bg-[#eceae3] border border-[#c5c0b1] rounded-[4px] px-1.5 py-1 text-[13px] text-[#201515] font-bold outline-none focus:border-[#00a76b] w-24"
                      autoFocus
                    />
                  ) : (
                    <div 
                      onClick={() => setIsEditingEstimate(true)}
                      className={`text-[13px] font-bold cursor-pointer hover:text-[#00a76b] transition-colors ${task?.timeEstimate ? 'text-[#201515]' : 'text-[#c5c0b1]'}`}
                    >
                      {task?.timeEstimate || 'Empty'}
                    </div>
                  )}
                </div>
              </div>

              {/* Track Time */}
              <div className="flex flex-col gap-1.5 group relative w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] w-[160px] shrink-0 mr-3"><Timer size={13}/> Track time</div>
                  <div className="flex-1 flex items-center gap-1.5">
                    <button 
                      onClick={() => setShowTimePopup(!showTimePopup)}
                      className="track-time-trigger flex items-center gap-1.5 px-2 py-1 hover:bg-[#eceae3] rounded-[3px] text-[13px] font-black uppercase tracking-wider text-[#201515] border border-[#c5c0b1] transition-colors"
                    >
                      <Play size={11} fill="currentColor"/> {totalSecondsLogged > 0 ? formatSecondsToHoursMinutes(totalSecondsLogged) : 'Start'}
                    </button>
                  </div>
                </div>

                {showTimePopup && (
                  <div ref={timePopupRef} className="absolute top-full right-0 mt-1 w-72 md:w-80 bg-white border border-[#c5c0b1] rounded-[8px] shadow-md z-[50] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                    <div className="p-3 border-b border-[#c5c0b1]">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#201515]">Time on all tasks</span>
                        <span className="text-[11px] font-black text-[#201515]">
                          {totalSecondsLogged > 0 ? formatSecondsToHoursMinutes(totalSecondsLogged) : '0h'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-[#939084]">
                          <ListTodo size={10}/> Without Subtasks
                        </div>
                        <span className="text-[9px] font-bold text-[#939084]">
                          {totalSecondsLogged > 0 ? formatSecondsToHoursMinutes(totalSecondsLogged) : '0h'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 space-y-3.5">
                      <button className="flex items-center gap-1.5 text-xs text-[#939084] hover:text-[#201515] transition-colors">
                        <div className="w-4.5 h-4.5 rounded-full bg-[#eceae3] flex items-center justify-center text-[9px] font-bold text-[#201515]">
                          {task?.employeeName?.charAt(0) || 'M'}
                        </div>
                        {task?.employeeName || 'Man Sengani'} <ChevronDown size={12} className="text-[#939084]"/>
                      </button>
                      
                      <div className="flex items-center gap-2">
                         <input 
                           type="text" 
                           placeholder="Enter time (ex: 3h 20m) or start timer" 
                           value={timeInput}
                           onChange={(e) => setTimeInput(e.target.value)}
                           disabled={isTimerRunning}
                           className="flex-1 bg-transparent text-xs text-[#201515] placeholder:text-[#939084] outline-none border-none focus:ring-0 p-0" 
                         />
                         
                         {isTimerRunning ? (
                           <button onClick={handleStartStopTimer} className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 transition-colors shrink-0 cursor-pointer">
                             <Pause size={10} fill="currentColor" />
                           </button>
                         ) : (
                           <button onClick={handleStartStopTimer} className="w-6 h-6 rounded-full bg-[#eceae3] hover:bg-[#c5c0b1] flex items-center justify-center text-[#201515] transition-colors shrink-0 cursor-pointer">
                             <Play size={10} fill="currentColor" />
                           </button>
                         )}
                      </div>
                      
                      <div className="space-y-2 pt-3 border-t border-[#c5c0b1]/30">
                        {/* Date details */}
                        <div className="flex items-center gap-2 text-[11px] font-medium text-[#939084]">
                          <Clock size={14}/> 
                          <span className="text-[11px]">
                            {timeInput ? formatLogTimeRange() : `${new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}    ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}  –  ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`}
                          </span>
                        </div>
                        
                        {/* Notes field toggle/input */}
                        {showNotesField ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[11px] font-medium text-[#201515]">
                              <AlignLeft size={14}/> <span>Notes</span>
                            </div>
                            <textarea 
                              placeholder="Enter session notes..." 
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className="w-full bg-[#eceae3] border border-[#c5c0b1] rounded-lg p-1.5 text-xs text-[#201515] focus:outline-none focus:border-[#00a76b] resize-none h-12"
                            />
                          </div>
                        ) : (
                          <div onClick={() => setShowNotesField(true)} className="flex items-center gap-2 text-[11px] font-medium text-[#939084] cursor-pointer hover:text-[#201515] transition-colors">
                            <AlignLeft size={14}/> <span>{notes ? `Notes: ${notes.substring(0, 25)}${notes.length > 25 ? '...' : ''}` : 'Notes'}</span>
                          </div>
                        )}
                        
                        {/* Tags field toggle/input */}
                        {showTagsField ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-[11px] font-medium text-[#201515]">
                              <Tag size={14}/> <span>Tags</span>
                            </div>
                            <div className="flex flex-wrap gap-1 p-1 bg-[#eceae3] border border-[#c5c0b1] rounded-lg min-h-[30px]">
                              {tagsList.map(tag => (
                                <span key={tag} className="flex items-center gap-1 bg-[#fffdf9] border border-[#c5c0b1] text-[#201515] text-[10px] px-1.5 py-0.5 rounded">
                                  {tag}
                                  <X size={9} className="cursor-pointer hover:text-[#00a76b]" onClick={() => handleRemoveTag(tag)}/>
                                </span>
                              ))}
                              <input 
                                type="text" 
                                placeholder="Press enter" 
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                className="bg-transparent border-none outline-none text-xs text-[#201515] p-0.5 placeholder:text-[#939084] flex-1 min-w-[80px]"
                              />
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => setShowTagsField(true)} className="flex items-center gap-2 text-[11px] font-medium text-[#939084] cursor-pointer hover:text-[#201515] transition-colors">
                            <Tag size={14}/> <span>{tagsList.length > 0 ? `Tags: ${tagsList.join(', ')}` : 'Add tags'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-2 border-t border-[#c5c0b1] flex items-center justify-between bg-[#fffdf9]">
                       <div className="flex items-center gap-2">
                         <button 
                           onClick={() => setIsBillable(!isBillable)}
                           className={`w-7 h-3.5 rounded-full relative transition-colors cursor-pointer ${isBillable ? 'bg-[#00a76b]' : 'bg-[#c5c0b1]'}`}
                         >
                           <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${isBillable ? 'left-[15px]' : 'left-0.5'}`}></div>
                         </button>
                         <span className="text-[9px] font-black uppercase tracking-wider text-[#939084]">Billable</span>
                       </div>
                       <button className="px-4 py-1 bg-[#00a76b] hover:bg-[#201515] text-white text-[10px] font-black uppercase tracking-wider rounded-[3px] transition-colors shadow-sm cursor-pointer" onClick={handleSaveTimeLog}>Save</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dates - Row 3 */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] w-[160px] shrink-0 mr-3"><Calendar size={13}/> Dates</div>
                <div className="flex-1 flex items-center gap-1.5 text-[13px] text-[#939084] font-bold">
                  <input
                    type="date"
                    value={task?.date || ''}
                    onChange={async (e) => {
                      await updateTaskProperty({ date: e.target.value });
                    }}
                    style={{ colorScheme: 'light' }}
                    className="bg-[#eceae3] border border-[#c5c0b1] rounded-[4px] px-1.5 py-1 text-[13px] text-[#201515] font-black uppercase tracking-wider outline-none focus:border-[#00a76b] cursor-pointer"
                  />
                </div>
              </div>

              {/* Sprint Points - Row 3 */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] w-[160px] shrink-0 mr-3"><Target size={13}/> Sprint points</div>
                <div className="flex-1">
                  {isEditingSprintPoints ? (
                    <input
                      type="number"
                      value={sprintPointsVal}
                      onChange={(e) => setSprintPointsVal(e.target.value)}
                      onBlur={async () => {
                        setIsEditingSprintPoints(false);
                        await updateTaskProperty({ sprintPoints: Number(sprintPointsVal) || 0 });
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          setIsEditingSprintPoints(false);
                          await updateTaskProperty({ sprintPoints: Number(sprintPointsVal) || 0 });
                        }
                      }}
                      className="bg-[#eceae3] border border-[#c5c0b1] rounded-[4px] px-1.5 py-1 text-[13px] text-[#201515] font-bold outline-none focus:border-[#00a76b] w-16"
                      autoFocus
                    />
                  ) : (
                    <div 
                      onClick={() => setIsEditingSprintPoints(true)}
                      className={`text-[13px] font-bold cursor-pointer hover:text-[#00a76b] transition-colors ${task?.sprintPoints ? 'text-[#201515]' : 'text-[#c5c0b1]'}`}
                    >
                      {task?.sprintPoints || 'Empty'}
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between group relative">
                <div className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] w-[160px] shrink-0 mr-3"><Flag size={13}/> Priority</div>
                <div className="flex-1" ref={priorityDropdownRef}>
                  <button 
                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                    className="priority-trigger-btn text-[13px] font-bold cursor-pointer hover:text-[#00a76b] transition-colors flex items-center gap-1.5 text-left"
                  >
                    {task?.priority || 'Empty'} <ChevronDown size={11} className="text-[#939084]"/>
                  </button>
                  {showPriorityDropdown && (
                    <div className="absolute top-full left-32 mt-1 w-36 bg-white border border-[#c5c0b1] rounded-[6px] py-1 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      {['Low', 'Medium', 'High'].map(p => (
                        <button
                          key={p}
                          onClick={async () => {
                            setShowPriorityDropdown(false);
                            await updateTaskProperty({ priority: p });
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#eceae3] text-[13px] font-black uppercase tracking-wider text-[#201515] transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] w-[160px] shrink-0 mr-3"><Tag size={13}/> Tags</div>
                <div className="flex-1 flex flex-wrap gap-1 items-center">
                  {task?.tags && task.tags.map(t => (
                    <span key={t} className="bg-[#eceae3] text-[#201515] border border-[#c5c0b1] text-[12px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1">
                      {t}
                      <X 
                        size={9} 
                        className="cursor-pointer hover:text-red-500" 
                        onClick={async () => {
                          const updatedTags = task.tags.filter(tag => tag !== t);
                          await updateTaskProperty({ tags: updatedTags });
                        }}
                      />
                    </span>
                  ))}
                  {isAddingTag ? (
                    <input
                      type="text"
                      value={newTagVal}
                      onChange={(e) => setNewTagVal(e.target.value)}
                      onBlur={async () => {
                        setIsAddingTag(false);
                        if (newTagVal.trim()) {
                          const updatedTags = [...(task?.tags || []), newTagVal.trim()];
                          await updateTaskProperty({ tags: updatedTags });
                        }
                        setNewTagVal('');
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          setIsAddingTag(false);
                          if (newTagVal.trim()) {
                            const updatedTags = [...(task?.tags || []), newTagVal.trim()];
                            await updateTaskProperty({ tags: updatedTags });
                          }
                          setNewTagVal('');
                        }
                      }}
                      placeholder="Tag name..."
                      className="bg-[#eceae3] border border-[#c5c0b1] rounded-[4px] px-1.5 py-1 text-[13px] text-[#201515] font-bold outline-none focus:border-[#00a76b] w-24"
                      autoFocus
                    />
                  ) : (
                    <button 
                      onClick={() => setIsAddingTag(true)}
                      className="text-[13px] text-[#c5c0b1] hover:text-[#00a76b] font-bold transition-colors"
                    >
                      + Add Tag
                    </button>
                  )}
                </div>
              </div>

            </div>

             {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 border-t border-[#c5c0b1] pt-2 mt-2 w-full">
              <button 
                onClick={handleQuickAddFields}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] hover:bg-[#eceae3] hover:text-[#201515] rounded-[4px] transition-colors"
              >
                <PlusCircle size={14} className="text-[#c5c0b1]" /> Add fields / tags
              </button>
              <button 
                onClick={handleQuickAddSubtask}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] hover:bg-[#eceae3] hover:text-[#201515] rounded-[4px] transition-colors"
              >
                <ListTodo size={14} className="text-[#c5c0b1]" /> Add subtask
              </button>
              <button 
                onClick={handleQuickRelateItems}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] hover:bg-[#eceae3] hover:text-[#201515] rounded-[4px] transition-colors"
              >
                <Link2 size={14} className="text-[#c5c0b1]" /> Relate items / dependencies
              </button>
              <button 
                onClick={handleQuickCreateChecklist}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] font-black uppercase tracking-wider text-[#939084] hover:bg-[#eceae3] hover:text-[#201515] rounded-[4px] transition-colors"
              >
                <CheckSquare size={14} className="text-[#c5c0b1]" /> Create checklist
              </button>
            </div>

            {/* Description Section */}
            <div className="mt-4 mb-2 w-full">
              <div className="relative group min-h-[50px] border border-[#c5c0b1] rounded-[6px] p-2 bg-[#eceae3] font-semibold">
                <textarea
                  placeholder="No description provided."
                  value={description}
                  readOnly
                  className="w-full h-full min-h-[40px] bg-transparent text-[#201515] text-sm placeholder:text-[#c5c0b1] outline-none border-none focus:ring-0 p-0 resize-none leading-relaxed font-medium cursor-default"
                />
              </div>
            </div>

            {/* Attachments Section */}
            <div className="mt-6 border-t border-[#c5c0b1] pt-4 w-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#201515]">Attachments</span>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#eceae3] border border-[#c5c0b1] hover:bg-[#00a76b] hover:text-white rounded-[4px] text-[10px] font-black uppercase tracking-wider text-[#201515] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>

              {task?.attachments && task.attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {task.attachments.map((file, idx) => {
                    const isImg = (file.fileName || '').match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || (file.fileType || '').startsWith('image/');
                    const url = getEvidenceUrl(file);
                    
                    return (
                      <div key={file._id || idx} className="group relative border border-[#c5c0b1] rounded-[8px] bg-[#eceae3]/30 overflow-hidden flex flex-col w-20 h-20 shrink-0">
                        {isImg ? (
                          <div className="flex-1 overflow-hidden bg-black/5 flex items-center justify-center cursor-pointer" onClick={() => window.open(url, '_blank')}>
                            <img src={url} alt={file.fileName} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center p-2 cursor-pointer" onClick={() => window.open(url, '_blank')}>
                            <Paperclip size={18} className="text-[#939084] mb-1" />
                            <span className="text-[9px] font-bold text-[#201515] text-center truncate w-full px-0.5">{file.fileName || 'Attachment'}</span>
                          </div>
                        )}
                        
                        {/* Overlay Controls */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(file); }}
                            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-[4px] transition-colors cursor-pointer border-none shadow-sm"
                            title="Delete"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-[#c5c0b1] rounded-[8px] text-[11px] font-bold text-[#939084] uppercase bg-[#eceae3]/10">
                  No attachments uploaded
                </div>
              )}
            </div>

          </div>

          {/* Right Panel - Activity or Brain AI Copilot */}
          <div id="print-right-panel" className={`bg-[#fffdf9] border-l border-[#c5c0b1] flex flex-col shrink-0 transition-all duration-300 ${isMaximized ? 'w-0 overflow-hidden border-l-0 opacity-0' : 'w-[360px]'}`}>
            {showAISidebar ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fffdf9]">
                {/* AI Copilot Header */}
                <div className="h-12 flex items-center justify-between px-5 border-b border-[#00a76b]/20 bg-[#00a76b]/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#00a76b] animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#00a76b]">Brain AI Copilot</span>
                  </div>
                  <button 
                    onClick={() => setShowAISidebar(false)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#939084] hover:text-[#201515] px-2 py-1 rounded-[4px] bg-[#eceae3] hover:bg-[#201515] hover:text-white transition-colors"
                  >
                    View Activity
                  </button>
                </div>

                {/* AI Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-sm">
                  {aiConversation.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role !== 'user' && (
                        <div className="w-7 h-7 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                          <Sparkles size={12} className="text-purple-400" />
                        </div>
                      )}
                      <div className={`rounded-[6px] p-3 max-w-[80%] leading-relaxed text-[12px] ${
                        msg.role === 'user' 
                          ? 'bg-[#00a76b]/10 text-[#201515] border border-[#00a76b]/20 font-bold' 
                          : 'bg-[#eceae3] text-[#201515] border border-[#c5c0b1]'
                      }`}>
                        {msg.text.split('\n').map((line, lIdx) => (
                          <p key={lIdx} className={lIdx > 0 ? "mt-1.5" : ""}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center shrink-0 animate-spin">
                        <Sparkles size={12} className="text-purple-400 animate-pulse" />
                      </div>
                      <div className="bg-zinc-900/60 text-zinc-500 border border-zinc-800/80 rounded-xl p-3 text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                        Brain is thinking...
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Assistant Quick Actions */}
                <div className="px-4 py-2 border-t border-[#c5c0b1] bg-[#fffdf9] space-y-1.5 shrink-0">
                  <div className="text-[9px] uppercase font-black text-[#939084] tracking-widest">Suggested Actions</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      onClick={() => handleAskAIQuickAction('description')}
                      className="px-2.5 py-1 text-[10px] font-black uppercase bg-[#eceae3] hover:bg-[#00a76b] hover:text-white border border-[#c5c0b1] text-[#939084] rounded-[4px] transition-colors flex items-center gap-1"
                    >
                      🪄 Write Description
                    </button>
                    <button 
                      onClick={() => handleAskAIQuickAction('subtasks')}
                      className="px-2.5 py-1 text-[10px] font-black uppercase bg-[#eceae3] hover:bg-[#00a76b] hover:text-white border border-[#c5c0b1] text-[#939084] rounded-[4px] transition-colors flex items-center gap-1"
                    >
                      📋 Suggest Subtasks
                    </button>
                    <button 
                      onClick={() => handleAskAIQuickAction('summary')}
                      className="px-2.5 py-1 text-[10px] font-black uppercase bg-[#eceae3] hover:bg-[#00a76b] hover:text-white border border-[#c5c0b1] text-[#939084] rounded-[4px] transition-colors flex items-center gap-1"
                    >
                      ⚡ Status Summary
                    </button>
                  </div>
                </div>

                {/* AI Chat Input */}
                <form onSubmit={handleCustomAiQuery} className="p-4 bg-[#fffdf9] border-t border-[#c5c0b1] shrink-0">
                  <div className="flex items-center gap-2 bg-[#eceae3] border border-[#c5c0b1] focus-within:border-[#00a76b] rounded-[6px] overflow-hidden px-3 py-2 transition-colors">
                    <input
                      type="text"
                      placeholder="Ask anything about this task..."
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      className="flex-1 bg-transparent text-[12px] text-[#201515] outline-none border-none focus:ring-0 p-0 placeholder:text-[#939084] font-medium"
                    />
                    <button 
                      type="submit"
                      disabled={!aiQuery.trim() || aiLoading}
                      className="p-1 text-[#00a76b] hover:text-[#201515] rounded-[4px] transition-colors disabled:opacity-50"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Activity Header */}
                <div className="h-12 flex items-center justify-between px-5 border-b border-[#c5c0b1] shrink-0">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#201515]">Activity</span>
                  <div className="flex items-center gap-1 relative">
                    <button 
                      onClick={() => { setShowActivitySearch(!showActivitySearch); setActivitySearchQuery(''); }} 
                      className={`p-1.5 rounded-[4px] transition-colors ${showActivitySearch ? 'bg-[#00a76b] text-white' : 'hover:bg-[#eceae3] text-[#939084]'}`}
                    >
                      <Search size={14}/>
                    </button>
                    <button 
                      onClick={() => {
                        const newOrder = activitySortOrder === 'newest' ? 'oldest' : 'newest';
                        setActivitySortOrder(newOrder);
                        toast.success(`Sorted by ${newOrder === 'newest' ? 'Newest' : 'Oldest'} first`);
                      }} 
                      className="p-1.5 hover:bg-[#eceae3] rounded-[4px] text-[#939084] transition-colors"
                      title={`Sort by: ${activitySortOrder === 'newest' ? 'Newest First' : 'Oldest First'}`}
                    >
                      {activitySortOrder === 'newest' ? <ArrowDown size={14}/> : <ArrowUp size={14}/>}
                    </button>
                  </div>
                </div>

                {/* Activity Feed */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-1 custom-scrollbar text-sm">
                  {showActivitySearch && (
                    <div className="mb-4">
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="Search activity..." 
                        value={activitySearchQuery}
                        onChange={(e) => setActivitySearchQuery(e.target.value)}
                        className="w-full text-xs bg-[#f3f4f6] dark:bg-[#111c18] text-[#201515] dark:text-white border-none rounded p-2 outline-none focus:ring-1 focus:ring-[#00a76b]"
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#201515] shrink-0 flex items-center justify-center text-white text-[10px] font-black uppercase">
                      {task?.employeeName?.substring(0, 2) || 'KP'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="font-black text-[12px] text-[#201515] uppercase">{task?.employeeName || 'System'} <span className="text-[#939084] font-bold text-[10px] ml-1 normal-case">({task?.employeeRole || 'hr'})</span></span>
                        <span className="text-[10px] font-bold text-[#939084]">{createdDate}</span>
                      </div>
                      <p className="text-[#939084] text-[11px] font-bold">created this task</p>
                    </div>
                  </div>
                  
                  {(() => {
                    const processedComments = (task?.comments || [])
                      .filter(c => !activitySearchQuery || (c.text || '').toLowerCase().includes(activitySearchQuery.toLowerCase()) || (c.userName || '').toLowerCase().includes(activitySearchQuery.toLowerCase()))
                      .sort((a, b) => {
                        const dateA = new Date(a.createdAt || 0).getTime();
                        const dateB = new Date(b.createdAt || 0).getTime();
                        return activitySortOrder === 'newest' ? dateB - dateA : dateA - dateB;
                      });

                    return processedComments.length === 0 && activitySearchQuery ? (
                      <div className="text-center py-4 text-[11px] text-[#939084] font-bold">No matching activity found</div>
                    ) : processedComments.map((c, idx) => (
                      <div 
                        className="flex gap-3 group relative border border-transparent py-0.5 px-2 -mx-2 rounded-[4px] transition-all duration-200 hover:py-2 hover:bg-[#eceae3] hover:border-[#c5c0b1]" 
                        key={idx}
                      >
                        <div className="w-7 h-7 rounded-full bg-[#eceae3] border border-[#c5c0b1] shrink-0 flex items-center justify-center text-[#201515] text-[10px] font-black uppercase mt-1">
                          {c.userName?.substring(0, 2) || 'U'}
                        </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-[12px] uppercase text-[#201515] whitespace-nowrap">{c.userName || 'Unknown'}</span>
                          
                          {/* Top Right Options - Hidden until hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-zinc-400 ml-auto">
                            <button 
                              onClick={() => toggleBookmark(idx)} 
                              className={`hover:text-zinc-200 hover:bg-zinc-700 transition-colors p-1.5 rounded ${bookmarkedComments[idx] ? 'text-amber-500' : ''}`}
                              title="Bookmark"
                            >
                              <Bookmark size={14} className={bookmarkedComments[idx] ? 'fill-current' : ''} />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingCommentIdx(idx);
                                setEditingCommentText(c.text);
                              }} 
                              className="hover:text-zinc-200 hover:bg-zinc-700 transition-colors p-1.5 rounded"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => deleteComment(idx)} 
                              className="hover:text-red-400 hover:bg-red-500/10 transition-colors p-1.5 rounded"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleReplyClick(c.userName)} 
                              className="hover:text-zinc-200 hover:bg-zinc-700 transition-colors p-1.5 rounded"
                              title="Reply"
                            >
                              <Reply size={14} />
                            </button>
                          </div>
                        </div>
                        
                        {editingCommentIdx === idx ? (
                          <div className="mt-1 space-y-2">
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full bg-zinc-800 text-sm text-zinc-200 p-2 rounded-lg border border-zinc-700 focus:border-zinc-500 outline-none resize-none min-h-[50px]"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditingCommentIdx(null)}
                                className="px-2.5 py-1 text-xs bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEditedComment(idx)}
                                className="px-2.5 py-1 text-xs bg-blue-600 text-white hover:bg-blue-500 rounded transition-colors"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-transparent">
                            <p className="text-[#201515] text-[12px] whitespace-pre-wrap leading-relaxed font-medium">{c.text}</p>
                          </div>
                        )}

                        {/* Reaction Badges */}
                        {c.reactions && Object.keys(c.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {Object.entries(c.reactions).map(([emoji, users]) => {
                              if (!users || users.length === 0) return null;
                              const hasMyReaction = users.includes(currentUser?.fullName || currentUser?.name || 'System Admin');
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(idx, emoji)}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                                    hasMyReaction
                                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-zinc-700/30'
                                  }`}
                                  title={users.join(', ')}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-[10px] font-medium">{users.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Bottom Options - Reactions and Reply */}
                        <div className="hidden group-hover:flex items-center justify-between text-[#939084] pt-1.5 mt-1.5 border-t border-[#c5c0b1]/40">
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => toggleReaction(idx, '👍')} 
                              className={`flex items-center gap-1 p-1.5 rounded-[4px] hover:bg-[#eceae3] transition-colors ${isCommentLikedByMe(c) ? 'text-[#00a76b]' : 'hover:text-[#201515]'}`}
                              title="Like"
                            >
                              <ThumbsUp size={14} className={isCommentLikedByMe(c) ? 'fill-current' : ''} />
                            </button>
                            
                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveReactionPickerIdx(activeReactionPickerIdx === idx ? null : idx);
                                }}
                                className="p-1.5 rounded-[4px] hover:bg-[#eceae3] hover:text-[#201515] transition-colors"
                                title="React"
                              >
                                <Smile size={14} />
                              </button>
                              {activeReactionPickerIdx === idx && (
                                <div 
                                  className="absolute bottom-full left-0 mb-1 bg-white border border-[#c5c0b1] rounded-[6px] p-1.5 flex gap-1 shadow-xl z-20"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {['👍', '❤️', '😂', '😮', '😢', '🎉'].map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        toggleReaction(idx, emoji);
                                        setActiveReactionPickerIdx(null);
                                      }}
                                      className="hover:bg-zinc-750 p-1 rounded transition-colors text-base"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleReplyClick(c.userName)}
                            className="text-[10px] font-black uppercase tracking-wider hover:text-[#201515] transition-colors px-2 py-1 rounded-[4px] hover:bg-[#eceae3]"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))})()}
                  <div ref={messagesEndRef} />
                </div>

                {/* Comment Input */}
                <div className="p-4 bg-[#fffdf9] border-t border-[#c5c0b1] shrink-0">
                  <div className="bg-[#eceae3] border border-[#c5c0b1] rounded-[8px] overflow-hidden focus-within:border-[#00a76b] transition-colors">
                    <textarea
                      placeholder="Write a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full bg-transparent text-sm text-[#201515] placeholder:text-[#939084] p-3 outline-none resize-none min-h-[60px] font-medium"
                    />
                    <div className="flex items-center justify-between px-2 pb-2">
                      <div className="flex items-center gap-1 relative">
                        <button 
                          data-mention-trigger="true"
                          onClick={(e) => { e.stopPropagation(); setShowMentionPicker(!showMentionPicker); setShowCommentEmojiPicker(false); }}
                          className="p-1.5 text-[#939084] hover:text-[#201515] hover:bg-[#fffdf9] rounded-[4px] transition-colors"
                          title="Mention someone"
                        ><Plus size={15}/></button>

                        {showMentionPicker && (
                          <div 
                            data-mention-picker="true"
                            className="absolute left-0 bottom-full mb-1 w-64 max-h-36 overflow-y-auto bg-[#fffdf9] border border-[#c5c0b1] rounded-[6px] shadow-xl z-50 p-1 divide-y divide-[#eceae3] text-left"
                          >
                            <div className="px-2 py-1 text-[8px] font-semibold not-italic uppercase text-[#939084] tracking-wider flex justify-between items-center bg-[#eceae3]/20">
                              <span>Mention Employee</span>
                              <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); setShowMentionPicker(false); }}
                                className="text-[#939084] hover:text-[#201515]"
                              >
                                <X size={10} />
                              </button>
                            </div>
                            {personnelList.map(p => (
                              <button
                                key={p._id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setComment(prev => prev + `@${p.fullName || p.name} `);
                                  setShowMentionPicker(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-[#eceae3] text-[10px] font-semibold not-italic text-[#201515] transition-colors uppercase truncate block border-none bg-transparent cursor-pointer"
                              >
                                {p.fullName || p.name}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        <label className="p-1.5 text-[#939084] hover:text-[#201515] hover:bg-[#fffdf9] rounded-[4px] transition-colors cursor-pointer" title="Attach file">
                          <Paperclip size={15}/>
                          <input type="file" className="hidden" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setComment(prev => prev + (prev.length > 0 ? `\n` : '') + `[Attached file: ${e.target.files[0].name}] `);
                            }
                          }}/>
                        </label>
                        
                        <button 
                          onClick={() => setShowCommentEmojiPicker(!showCommentEmojiPicker)}
                          className="p-1.5 text-[#939084] hover:text-[#201515] hover:bg-[#fffdf9] rounded-[4px] transition-colors"
                          title="Add an emoji"
                        ><Smile size={15}/></button>

                        {showCommentEmojiPicker && (
                          <div className="absolute bottom-full left-0 mb-2 bg-white border border-[#c5c0b1] rounded-[6px] p-2 shadow-xl z-50 flex gap-1 flex-wrap w-48">
                            {['😀','😂','🥰','😎','🤔','🙌','👍','🔥','🎉','❤️','👀','🚀'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  setComment(prev => prev + emoji);
                                  setShowCommentEmojiPicker(false);
                                }}
                                className="w-7 h-7 flex items-center justify-center hover:bg-[#eceae3] rounded transition-colors text-base"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={handleCommentSubmit}
                        disabled={!comment.trim() || isSubmitting}
                        className="p-1.5 bg-[#00a76b] text-white hover:bg-[#201515] rounded-[4px] transition-colors disabled:opacity-50"
                      >
                        <Send size={16} className={isSubmitting ? "animate-pulse" : ""} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global styles for this component's scrollbar */}
        <style dangerouslySetInnerHTML={{__html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #c5c0b1;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #939084;
          }
        `}} />
      </div>
      </div>
    </>,
    document.body
  );
};

export default TaskDetailView;
