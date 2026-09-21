import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { CheckCircle, Users, Download, FileSpreadsheet } from 'lucide-react';
import ExportFilterModal from '@shared/components/ExportFilterModal';

const QuickActions = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);

  const getAuthToken = () => sessionStorage.getItem('token') || localStorage.getItem('token') || '';

  const fetchTeamLeaves = async () => {
    try {
      setIsLoadingLeaves(true);
      const token = getAuthToken();
      const response = await axios.get('/api/leaves/manager/pending?status=all&page=1&limit=2000', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data?.data && Array.isArray(response.data.data)) {
        setTeamLeaves(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch team leaves for export:', error);
    } finally {
      setIsLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchTeamLeaves();
  }, []);

  const openExportModal = (format) => {
    setExportFormat(format);
    setIsExportModalOpen(true);
    if (teamLeaves.length === 0) {
      fetchTeamLeaves();
    }
  };

  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    teamLeaves.forEach(item => {
      const name = item.user?.name || item.employeeName;
      if (name && !map.has(name)) {
        map.set(name, { label: name, value: name });
      }
    });
    return Array.from(map.values());
  }, [teamLeaves]);

  const exportColumns = [
    { 
      key: 'employee', 
      label: 'Employee Name', 
      defaultSelected: true, 
      getValue: (item) => item.user?.name || item.employeeName || 'Unknown' 
    },
    { 
      key: 'email', 
      label: 'Email', 
      defaultSelected: false, 
      getValue: (item) => item.user?.email || '-' 
    },
    { 
      key: 'department', 
      label: 'Department', 
      defaultSelected: true, 
      getValue: (item) => item.user?.department || item.department || 'General' 
    },
    { 
      key: 'leaveType', 
      label: 'Leave Type', 
      defaultSelected: true, 
      getValue: (item) => item.leaveType || '-' 
    },
    { 
      key: 'status', 
      label: 'Status', 
      defaultSelected: true, 
      getValue: (item) => {
        const s = item.status || '';
        if (s === 'cancellation_pending') return 'Cancellation Pending';
        return s ? (s.charAt(0).toUpperCase() + s.slice(1)) : '-';
      }
    },
    { 
      key: 'startDate', 
      label: 'Start Date', 
      defaultSelected: true, 
      getValue: (item) => item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '-' 
    },
    { 
      key: 'endDate', 
      label: 'End Date', 
      defaultSelected: true, 
      getValue: (item) => item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '-' 
    },
    { 
      key: 'totalDays', 
      label: 'Duration (Days)', 
      defaultSelected: true, 
      getValue: (item) => item.totalDays ?? 1 
    },
    { 
      key: 'reason', 
      label: 'Reason', 
      defaultSelected: true, 
      getValue: (item) => item.reason || '-' 
    },
    { 
      key: 'createdAt', 
      label: 'Applied Date', 
      defaultSelected: true, 
      getValue: (item) => item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '-' 
    }
  ];

  const exportFilters = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Cancellation Pending', value: 'cancellation_pending' }
      ],
      getItemValue: (item) => item.status
    },
    {
      key: 'leaveType',
      label: 'Leave Type',
      options: [
        { label: 'Casual Leave (CL)', value: 'Casual Leave' },
        { label: 'Sick Leave (SL)', value: 'Sick Leave' }
      ],
      getItemValue: (item) => item.leaveType
    },
    ...(uniqueEmployees.length > 0 ? [{
      key: 'employee',
      label: 'Employee',
      options: uniqueEmployees,
      getItemValue: (item) => item.user?.name || item.employeeName
    }] : [])
  ];

  const actions = [
    { 
      label: 'Approve Leave', 
      icon: CheckCircle, 
      color: 'text-emerald-600 dark:text-emerald-400', 
      borderColor: '#10b981', 
      glowColor: 'rgba(16, 185, 129, 0.45)', 
      bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', 
      onClick: () => {
        window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'pending' }));
        const el = document.getElementById('pending-queue');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        toast.success('Navigated to pending leave approvals');
      } 
    },
    { 
      label: 'Bulk Approval', 
      icon: Users, 
      color: 'text-purple-600 dark:text-purple-400', 
      borderColor: '#8b5cf6', 
      glowColor: 'rgba(139, 92, 246, 0.45)', 
      bgIcon: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40', 
      onClick: () => {
        window.dispatchEvent(new CustomEvent('trigger-filter-leave-table', { detail: 'pending' }));
        const el = document.getElementById('pending-queue');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.dispatchEvent(new CustomEvent('trigger-bulk-approval'));
      } 
    },
    { 
      label: 'Download Report', 
      icon: Download, 
      color: 'text-emerald-600 dark:text-emerald-400', 
      borderColor: '#059669', 
      glowColor: 'rgba(5, 150, 105, 0.45)', 
      bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', 
      onClick: () => openExportModal('pdf') 
    },
    { 
      label: 'Export to Excel', 
      icon: FileSpreadsheet, 
      color: 'text-emerald-600 dark:text-emerald-400', 
      borderColor: '#059669', 
      glowColor: 'rgba(5, 150, 105, 0.45)', 
      bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', 
      onClick: () => openExportModal('xlsx') 
    }
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 ml-1">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <button
              key={i}
              onClick={action.onClick}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                borderColor: isHovered ? action.borderColor : undefined,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              className="bg-white dark:bg-[#1e293b] border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-200 py-2.5 px-3 rounded-2xl h-14 transition-all duration-200 flex items-center justify-start gap-2.5 shadow-xs group cursor-pointer"
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${action.bgIcon}`}>
                <action.icon size={16} strokeWidth={2.5} className={action.color} />
              </div>
              <span className="text-left font-black text-xs tracking-tight leading-none truncate w-full">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Export Filter Modal */}
      <ExportFilterModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Team Leaves Report"
        subtitle="Filter team leaves by date range, status, leave type, or employee and select columns before exporting."
        allData={teamLeaves}
        filteredData={teamLeaves}
        columns={exportColumns}
        customFilters={exportFilters}
        defaultFilename="team_leaves_report"
        initialFormat={exportFormat}
      />
    </div>
  );
};

export default QuickActions;
