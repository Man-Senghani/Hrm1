import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const EmployeeAvailabilityChart = ({ trigger }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/leaves/manager/availability', {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load availability');
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [trigger]);

  const legend = [
    { label: 'Available', color: 'bg-emerald-600', hex: '#059669', key: 'available' },
    { label: 'On Leave', color: 'bg-blue-600', hex: '#2563eb', key: 'onLeave' },
    { label: 'Work From Home', color: 'bg-purple-600', hex: '#9333ea', key: 'workFromHome' },
    { label: 'Half Day', color: 'bg-orange-500', hex: '#f97316', key: 'halfDay' },
    { label: 'Absent', color: 'bg-red-500', hex: '#ef4444', key: 'absent' }
  ];

  const activeData = (data && data.totalEmployees > 0) ? data : {
    totalEmployees: 0,
    available: 0,
    onLeave: 0,
    workFromHome: 0,
    halfDay: 0,
    absent: 0
  };
  const total = activeData.totalEmployees;

  // Prepare data for recharts
  const chartData = legend.map(item => ({
    name: item.label,
    value: activeData ? activeData[item.key] : 0,
    color: item.hex
  })).filter(item => item.value > 0);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col transition-colors duration-300 hover:!border-teal-500 dark:hover:!border-teal-400">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employee Availability</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading chart...</div>
      ) : (
        <div className="flex flex-col items-center justify-start gap-3 flex-1 w-full">
          {/* Donut Chart using Recharts */}
          <div className="relative w-52 h-52 flex-shrink-0 flex items-center justify-center">
            <PieChart width={208} height={208}>
              <Pie
                data={chartData}
                cx={100}
                cy={100}
                innerRadius={68}
                outerRadius={96}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                onMouseEnter={(_, index) => setHoveredItem(legend[index])}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {chartData.map((entry, index) => {
                  const isHovered = hoveredItem?.key === legend[index]?.key;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={isHovered ? '#ffffff' : 'none'}
                      strokeWidth={isHovered ? 2 : 0}
                      style={{
                        filter: isHovered ? `drop-shadow(0px 0px 8px ${entry.color}a0) brightness(1.25)` : 'none',
                        transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                        transformOrigin: 'center center',
                        transition: 'all 0.2s ease-in-out',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </Pie>
            </PieChart>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-gray-900 dark:text-white">
                {hoveredItem ? activeData[hoveredItem.key] : total}
              </span>
              <span className="text-[10px] text-gray-500 font-bold text-center leading-tight mt-1 uppercase tracking-widest">
                {hoveredItem ? hoveredItem.label : 'Total'}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-1.5 w-full max-w-[280px] mx-auto mt-auto pb-1">
            {legend.map(item => {
              const val = activeData ? activeData[item.key] : 0;
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return (
                <div
                  key={item.key}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`flex items-center justify-between gap-3 font-semibold cursor-pointer py-1.5 px-3 rounded-lg transition-all duration-150 ${hoveredItem?.key === item.key ? 'bg-gray-100 dark:bg-gray-800 scale-[1.02]' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${item.color}`}></div>
                    <span className="text-gray-700 dark:text-gray-300 text-left text-base">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-900 dark:text-white font-bold text-base">{val}</span>
                    <span className="text-gray-400 text-sm w-12 text-right">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAvailabilityChart;
