import React from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { CheckCircle, Users, Calendar, Clock, Download, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuickActions = () => {
  const navigate = useNavigate();

  const handleExport = async (format) => {
    try {
      const loadingToast = toast.loading(`Generating ${format.toUpperCase()} report...`);
      const response = await axios.get(`/api/leaves/manager/export?format=${format}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        responseType: 'blob', // crucial for file downloads
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `team_leaves.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      toast.dismiss(loadingToast);
      toast.success('Report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  const actions = [
    { label: 'Approve Leave', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', borderColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.45)', bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { label: 'Bulk Approval', icon: Users, color: 'text-purple-600 dark:text-purple-400', borderColor: '#8b5cf6', glowColor: 'rgba(139, 92, 246, 0.45)', bgIcon: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40', onClick: () => window.dispatchEvent(new CustomEvent('trigger-bulk-approval')) },
    { label: 'Team Calendar', icon: Calendar, color: 'text-orange-600 dark:text-orange-400', borderColor: '#f97316', glowColor: 'rgba(249, 115, 22, 0.45)', bgIcon: 'bg-orange-50 dark:bg-orange-950/50 border border-orange-100 dark:border-orange-900/40', onClick: () => window.scrollTo({ top: 500, behavior: 'smooth' }) },
    { label: 'Team Leave Balance', icon: Clock, color: 'text-blue-600 dark:text-blue-400', borderColor: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.45)', bgIcon: 'bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40', onClick: () => window.scrollTo({ top: 500, behavior: 'smooth' }) },
    { label: 'Download Report', icon: Download, color: 'text-emerald-600 dark:text-emerald-400', borderColor: '#059669', glowColor: 'rgba(5, 150, 105, 0.45)', bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', onClick: () => handleExport('pdf') },
    { label: 'Export to Excel', icon: FileSpreadsheet, color: 'text-emerald-600 dark:text-emerald-400', borderColor: '#059669', glowColor: 'rgba(5, 150, 105, 0.45)', bgIcon: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40', onClick: () => handleExport('xlsx') }
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 ml-1">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
    </div>
  );
};

export default QuickActions;
