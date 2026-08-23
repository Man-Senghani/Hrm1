import React from 'react';

const allHolidays2026 = [
  { name: 'Makar Sankranti', dateStr: '2026-01-14', type: 'Festival' },
  { name: 'Republic Day', dateStr: '2026-01-26', type: 'National' },
  { name: 'Maha Shivaratri', dateStr: '2026-02-14', type: 'Festival' },
  { name: 'Holi', dateStr: '2026-03-03', type: 'Festival' },
  { name: 'Ram Navami', dateStr: '2026-03-27', type: 'Festival' },
  { name: 'Independence Day', dateStr: '2026-08-15', type: 'National' },
  { name: 'Raksha Bandhan', dateStr: '2026-08-28', type: 'Festival' },
  { name: 'Janmashtami', dateStr: '2026-09-04', type: 'Festival' },
  { name: 'Ganesh Chaturthi', dateStr: '2026-09-14', type: 'Festival' },
  { name: 'Gandhi Jayanti', dateStr: '2026-10-02', type: 'National' },
  { name: 'Dussehra', dateStr: '2026-10-19', type: 'Festival' },
  { name: 'Diwali', dateStr: '2026-11-08', type: 'Festival' },
  { name: 'Christmas', dateStr: '2026-12-25', type: 'Festival' }
];

const Holidays = () => {
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);

  const holidays = allHolidays2026.map(h => {
    const parts = h.dateStr.split('-');
    const hDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const diffTime = hDate - todayDate;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { 
      ...h,
      date: hDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).replace(/[,.]/g, ''),
      fullDate: hDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      daysLeft,
      isPast: daysLeft < 0
    };
  });

  return (
    <div className="space-y-4 pb-10 font-['Inter',sans-serif] animate-slide-up" style={{ color: 'var(--zap-charcoal)' }}>
      <div>
        <h1 className="text-2xl font-bold text-[#201515] dark:text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          Holidays 2026
        </h1>
        <p className="text-xs text-[#939084] mt-0.5">View all national and regional holidays for the year.</p>
      </div>

      <div className="bg-[#fffefb] dark:bg-[#0f0d0a] border border-[#c5c0b1] dark:border-[#38352e] rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <table className="w-full text-left border-collapse min-w-[550px]">
          <thead>
            <tr className="bg-[#f8f7f4] dark:bg-[#1a1713] border-b border-[#eceae3] dark:border-[#38352e]">
              <th className="py-2.5 px-4 font-semibold text-xs text-[#64748b] dark:text-[#939084] uppercase tracking-wider">Date</th>
              <th className="py-2.5 px-4 font-semibold text-xs text-[#64748b] dark:text-[#939084] uppercase tracking-wider">Holiday</th>
              <th className="py-2.5 px-4 font-semibold text-xs text-[#64748b] dark:text-[#939084] uppercase tracking-wider">Type</th>
              <th className="py-2.5 px-4 font-semibold text-xs text-[#64748b] dark:text-[#939084] uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h, i) => (
              <tr key={i} className={`border-b border-[#eceae3] dark:border-[#38352e] last:border-0 hover:bg-[#faf9f6] dark:hover:bg-[#15120e] transition-colors ${h.isPast ? 'opacity-60 grayscale' : ''}`}>
                <td className="py-2 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`rounded-lg text-center min-w-[44px] py-1 px-1.5 border ${h.isPast ? 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50'}`}>
                      <p className="text-sm font-bold leading-none">{h.date.split(' ')[0]}</p>
                      <p className="text-[9px] font-bold uppercase mt-0.5">{h.date.split(' ')[1]}</p>
                    </div>
                    <span className="text-xs font-medium text-[#939084]">{h.fullDate.split(',')[0]}</span>
                  </div>
                </td>
                <td className="py-2 px-4 font-semibold text-xs text-[#201515] dark:text-white">
                  {h.name}
                </td>
                <td className="py-2 px-4">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${h.type === 'National' ? 'bg-[#eff6ff] text-[#3b82f6]' : 'bg-[#fff7ed] text-[#f97316]'}`}>
                    {h.type}
                  </span>
                </td>
                <td className="py-2 px-4 text-right">
                  {h.isPast ? (
                    <span className="text-[11px] font-medium bg-[#f1f5f9] dark:bg-[#1e293b] px-2.5 py-0.5 rounded-full text-[#64748b] dark:text-[#94a3b8]">Passed</span>
                  ) : h.daysLeft === 0 ? (
                    <span className="text-[11px] font-bold bg-[#fef2f2] text-[#ef4444] px-2.5 py-0.5 rounded-full animate-pulse">Today!</span>
                  ) : (
                    <span className="text-[11px] font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 px-2.5 py-0.5 rounded-full">In {h.daysLeft} days</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Holidays;
