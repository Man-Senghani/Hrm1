import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { 
  X, Minus, Sparkles, CheckCircle2, FileText, Bell, Monitor, 
  LayoutDashboard, ChevronDown, User, Calendar, Flag, Tag, 
  MoreHorizontal, Plus, LayoutTemplate, Paperclip 
} from 'lucide-react';

const CreateTaskModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('Task');
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const tabs = [
    { id: 'Task', label: 'Task' },
    { id: 'Doc', label: 'Doc' },
    { id: 'Reminder', label: 'Reminder' },
    { id: 'Whiteboard', label: 'Whiteboard' },
    { id: 'Dashboard', label: 'Dashboard' },
  ];

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans"
    >
      <div className="w-full max-w-3xl bg-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden border border-zinc-800 flex flex-col">
        
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-4 bg-[#1e1e1e] border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00a76b] rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-zinc-400 ml-4">
            <button className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors">
              <Minus size={18} />
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#18181b] flex flex-col gap-4">
          
          {/* Project & Type selectors */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded text-zinc-300 text-[11px] font-medium transition-colors">
              <CheckCircle2 size={12} className="text-zinc-400" />
              Project 1
              <ChevronDown size={12} className="text-zinc-500 ml-0.5" />
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded text-zinc-300 text-[11px] font-medium transition-colors">
              <CheckCircle2 size={12} className="text-zinc-400" />
              Task
              <ChevronDown size={12} className="text-zinc-500 ml-0.5" />
            </button>
          </div>

          {/* Task Title Input */}
          <div>
            <input
              type="text"
              placeholder="Task Name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full bg-transparent text-white text-xl font-semibold placeholder:text-zinc-600 outline-none border-none focus:ring-0 p-0"
              autoFocus
            />
          </div>

          {/* Task Description */}
          <div className="relative group">
            <textarea
              placeholder="Add description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-transparent text-zinc-300 text-xs placeholder:text-zinc-500 outline-none border-none focus:ring-0 p-0 resize-none leading-relaxed"
            />
          </div>

          {/* Task Attributes (Badges) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700 rounded text-zinc-300 text-[11px] font-medium transition-colors border border-transparent hover:border-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
              TO DO
            </button>
            
            <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors border border-dashed border-zinc-700">
              <User size={12} />
              Assignee
            </button>

            <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors border border-dashed border-zinc-700">
              <Calendar size={12} />
              Due date
            </button>

            <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors border border-dashed border-zinc-700">
              <Flag size={12} />
              Priority
            </button>

            <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors border border-dashed border-zinc-700">
              <Tag size={12} />
              Tags
            </button>

            <button className="p-1 hover:bg-zinc-800 rounded text-zinc-400 transition-colors border border-transparent">
              <MoreHorizontal size={14} />
            </button>
          </div>

          {/* Custom Fields */}
          <div className="pt-4 border-t border-zinc-800/60">
            <p className="text-[11px] text-zinc-500 font-medium mb-2">Fields</p>
            <button className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-400 text-[11px] font-medium transition-colors w-max">
              <Plus size={12} />
              Create new field
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 bg-[#1e1e1e] border-t border-zinc-800 shrink-0">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md text-xs font-medium transition-colors">
            <LayoutTemplate size={14} />
            Templates
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 mr-1">
              <button className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors">
                <Paperclip size={16} />
              </button>
              <button className="flex items-center gap-1 p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors relative">
                <Bell size={16} />
                <span className="text-[10px] font-semibold bg-[#00a76b] text-white px-1 rounded-full absolute -top-0.5 -right-0.5">1</span>
              </button>
            </div>

            <div className="flex items-center relative">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.success("Task created successfully!");
                  onClose();
                }}
                className="bg-[#00a76b] hover:bg-[#e64600] text-white px-4 py-1.5 rounded-l-md text-xs font-medium transition-colors shadow-lg shadow-emerald-500/20"
              >
                Create Task
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="bg-[#00a76b] hover:bg-[#e64600] border-l border-white/20 text-white px-1.5 py-1.5 rounded-r-md transition-colors shadow-lg shadow-emerald-500/20"
              >
                <ChevronDown size={14} />
              </button>

              {showDropdown && (
                <div className="absolute bottom-full right-0 mb-1 w-48 bg-white border border-[#eceae3] rounded-[8px] shadow-xl overflow-hidden z-50">
                  <div className="py-1">
                    <button 
                      onClick={() => {
                        setShowDropdown(false);
                        toast.success("Task created! Ready for another.");
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-[#36342e] hover:bg-[#f5f4f0] transition-colors"
                    >
                      Create & Add Another
                    </button>
                    <button 
                      onClick={() => {
                        setShowDropdown(false);
                        toast.success("Task saved as draft");
                        onClose();
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
      </div>
    </div>
  );
};

export default CreateTaskModal;
