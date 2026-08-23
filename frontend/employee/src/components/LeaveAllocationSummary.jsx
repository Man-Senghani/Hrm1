import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const LeaveAllocationSummary = ({ refreshTrigger }) => {
  const [allocationData, setAllocationData] = useState([]);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('this_month');
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/hr-dashboard/leave-allocations?filter=${filter}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success) {
          setAllocationData(res.data.data);
          setTotalDays(res.data.totalDays);
        }
      } catch (err) {
        console.error('Failed to fetch allocations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, filter, refreshTrigger]);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full transition-all duration-200 hover:border-indigo-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Allocation Summary</h2>
        <div className="relative">
          <button
            onClick={() => setSelectOpen(!selectOpen)}
            className="flex items-center gap-1.5 text-xs font-bold bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 outline-none cursor-pointer transition-all"
          >
            {filter === 'this_month' && 'This Month'}
            {filter === 'last_month' && 'Last Month'}
            {filter === 'last_2_months' && 'Last 2 Months'}
            {filter === 'this_year' && 'This Year'}
            <ChevronDown size={14} className={`transition-transform duration-200 ${selectOpen ? 'rotate-180' : ''}`} />
          </button>

          {selectOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSelectOpen(false)} />
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#1e293b] border border-gray-155 dark:border-gray-800 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                {[
                  { value: 'this_month', label: 'This Month' },
                  { value: 'last_month', label: 'Last Month' },
                  { value: 'last_2_months', label: 'Last 2 Months' },
                  { value: 'this_year', label: 'This Year' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilter(opt.value); setSelectOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${filter === opt.value ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 flex-1 w-full">
        {/* Recharts Pie Donut Chart */}
        <div className="w-36 h-36 flex-shrink-0 flex items-center justify-center relative">
          {allocationData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart width={144} height={144}>
                <Pie
                  data={allocationData}
                  cx={68}
                  cy={68}
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {allocationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      style={{ outline: 'none' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-36 h-36 rounded-full border-4 border-dashed border-gray-250 flex items-center justify-center">
              <span className="text-xs text-gray-400">No Data</span>
            </div>
          )}

          {/* Center text hole */}
          <div className="absolute w-24 h-24 bg-white dark:bg-[#1e293b] rounded-full flex flex-col items-center justify-center pointer-events-none shadow-sm border border-gray-50 dark:border-gray-800/50">
            <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums tracking-tight">
              {hoveredSegment ? hoveredSegment.value.toLocaleString() : totalDays.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 text-center max-w-[80px] truncate">
              {hoveredSegment ? hoveredSegment.name : 'Total Days'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-1 w-full px-2">
          {loading ? (
            <p className="text-xs text-gray-400 text-center">Loading chart...</p>
          ) : (
            allocationData.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-2 text-xs font-semibold cursor-pointer p-0.5 px-2 rounded transition-all duration-150 ${hoveredSegment?.name === item.name ? 'bg-gray-150 dark:bg-gray-800 scale-[1.02]' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                onMouseEnter={() => setHoveredSegment(item)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-700 dark:text-gray-300 text-left truncate text-[11px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-gray-900 dark:text-white font-bold text-[11px]">{item.value.toLocaleString()}</span>
                  <span className="text-gray-400 text-[10px]">
                    ({totalDays > 0 ? Math.round((item.value / totalDays) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveAllocationSummary;
