import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TeamLeaveCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState({ leaves: [], holidays: [] });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('Month');

  const fetchCalendar = async (month, year) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/leaves/manager/calendar?month=${month + 1}&year=${year}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar(currentDate.getMonth(), currentDate.getFullYear());
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const prevMonthDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() - 1);

  const days = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);

    let isHoliday = false;
    let isWeeklyOff = (d.getDay() === 0 || d.getDay() === 6); // Sun or Sat
    let hasApprovedLeave = false;
    let hasPendingLeave = false;
    let hasWfh = false;

    // Check holidays
    if (data.holidays && !isWeeklyOff) {
      isHoliday = data.holidays.some(h => {
        const hDate = new Date(h.date);
        return hDate.getDate() === i && hDate.getMonth() === currentDate.getMonth() && hDate.getFullYear() === currentDate.getFullYear();
      });
    }

    // Check leaves
    if (data.leaves) {
      data.leaves.forEach(l => {
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);

        if (d >= s && d <= e) {
          if (l.status === 'approved') {
            if (l.leaveType === 'emergency') hasWfh = true; // mapped to wfh based on availability
            else hasApprovedLeave = true;
          } else if (l.status === 'pending') {
            hasPendingLeave = true;
          }
        }
      });
    }

    days.push({
      day: i,
      isCurrentMonth: true,
      isHoliday,
      isWeeklyOff,
      hasApprovedLeave,
      hasPendingLeave,
      hasWfh,
      isToday: d.toDateString() === new Date().toDateString()
    });
  }

  // Next month padding
  const totalSlots = Math.ceil(days.length / 7) * 7;
  const paddingNeeded = totalSlots - days.length;
  for (let i = 1; i <= paddingNeeded; i++) {
    days.push({ day: i, isCurrentMonth: false });
  }

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full transition-colors duration-300 hover:!border-indigo-500 dark:hover:!border-indigo-400">

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Team Leave Calendar</h2>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-gray-900 dark:text-white w-28 text-center">{monthName} {currentDate.getFullYear()}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-bold text-gray-500">{d}</div>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-10 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-7 gap-y-1 mb-2 flex-1">
          {days.map((d, i) => (
            <div key={i} className="flex flex-col items-center justify-center h-8">
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold
                ${d.isCurrentMonth ? (d.isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-900 dark:text-white hover:bg-gray-100 cursor-pointer') : 'text-gray-300 dark:text-gray-600'}
              `}>
                {d.day}
              </span>
              <div className="flex gap-0.5 mt-0.5 h-1.5">
                {d.isCurrentMonth && d.hasApprovedLeave && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                {d.isCurrentMonth && d.hasPendingLeave && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>}
                {d.isCurrentMonth && d.hasWfh && <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>}
                {d.isCurrentMonth && d.isHoliday && !d.hasApprovedLeave && !d.hasPendingLeave && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                {d.isCurrentMonth && d.isWeeklyOff && !d.hasApprovedLeave && !d.hasPendingLeave && !d.isHoliday && <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gray-500 mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved Leave</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Pending Leave</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Work From Home</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Holiday</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Weekly Off</div>
      </div>
    </div>
  );
};

export default TeamLeaveCalendar;
