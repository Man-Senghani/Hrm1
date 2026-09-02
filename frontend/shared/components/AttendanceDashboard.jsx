import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Search, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AttendanceDashboard = ({ userRole }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchName, setSearchName] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Status of the current logged in user
  const [myTodayRecord, setMyTodayRecord] = useState(null);

  const fetchAttendance = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const { data } = await axios.get('/api/attendance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(data);
      
      // If we are an employee (or any role, actually), we should see our own today's record for the button state
      const today = new Date().toISOString().split('T')[0];
      const meStr = sessionStorage.getItem('user');
      if (meStr) {
        const me = JSON.parse(meStr);
        const mine = data.find(r => r.date === today && (r.user?._id === me.id || r.user === me.id));
        setMyTodayRecord(mine || null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line
  }, []);

  const handleCheckIn = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      
      // Start Time Tracker session simultaneously
      await axios.post('/api/time/start', {}, authHeader).catch(() => null);
      
      await axios.post('/api/attendance/checkin', {}, authHeader);
      toast.success('Checked in successfully!');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      
      // Stop Time Tracker session simultaneously
      await axios.post('/api/time/stop', {}, authHeader).catch(() => null);
      
      await axios.post('/api/attendance/checkout', {}, authHeader);
      toast.success('Checked out successfully!');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check out');
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesDate = !filterDate || r.date === filterDate;
    const matchesName = !searchName || (r.user?.name || '').toLowerCase().includes(searchName.toLowerCase());
    return matchesDate && matchesName;
  });

  const currentlyCheckedIn = records.filter(r => r.date === new Date().toISOString().split('T')[0] && r.checkInTime && !r.checkOutTime).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#1E2026] uppercase tracking-tighter">
            Attendance <span className="text-[#F0B90B]">Registry</span>
          </h1>
          <p className="text-[#848E9C] text-sm font-bold uppercase tracking-widest mt-1">Live Tracking & Monitoring</p>
        </div>
      </div>

      {userRole === 'employee' ? (
        <div className="bg-[#1E2026] rounded-3xl p-10 border border-[#E6E8EA] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center">
           <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
           <Clock size={48} className="text-[#F0B90B] mb-6 relative z-10" />
           <h2 className="text-2xl font-black text-white uppercase tracking-widest relative z-10 mb-2">Daily Check-In</h2>
           <p className="text-[#848E9C] text-[12px] font-bold uppercase tracking-widest mb-8 relative z-10">Record your presence for {new Date().toLocaleDateString()}</p>
           
           <div className="flex gap-6 relative z-10">
             <button 
               onClick={handleCheckIn}
               disabled={!!myTodayRecord}
               className={`px-12 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${myTodayRecord ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-[#F0B90B] text-[#1E2026] hover:bg-[#F0B90B]/90 hover:scale-105 active:scale-95'}`}
             >
               {myTodayRecord ? 'Checked In' : 'Check In Now'}
             </button>
             <button 
               onClick={handleCheckOut}
               disabled={!myTodayRecord || myTodayRecord.checkOutTime}
               className={`px-12 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${(!myTodayRecord || myTodayRecord.checkOutTime) ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-transparent border-2 border-[#F6465D] text-[#F6465D] hover:bg-[#F6465D] hover:text-white hover:scale-105 active:scale-95'}`}
             >
               {myTodayRecord?.checkOutTime ? 'Checked Out' : 'Check Out'}
             </button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-2xl border border-[#E6E8EA] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#848E9C]">Active Now</p>
                <p className="text-2xl font-black text-[#1E2026]">{currentlyCheckedIn}</p>
              </div>
           </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-[#E6E8EA] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E6E8EA] flex flex-col md:flex-row gap-4 justify-between items-center bg-[#F5F5F5]">
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C]" />
            <input 
              type="text" 
              placeholder="Search by personnel name..." 
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl text-sm font-bold border-2 border-transparent focus:border-[#F0B90B] transition-all"
            />
          </div>
          <div className="relative w-full md:w-64">
             <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C]" />
             <input 
               type="date" 
               value={filterDate}
               onChange={(e) => setFilterDate(e.target.value)}
               className="w-full pl-12 pr-4 py-3 bg-white rounded-xl text-sm font-bold border-2 border-transparent focus:border-[#F0B90B] transition-all cursor-pointer"
             />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#848E9C]">Personnel Node</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#848E9C]">Role</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#848E9C]">Check In</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#848E9C]">Check Out</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#848E9C]">Total Hours</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#848E9C]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E8EA] bg-white">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm font-bold text-[#848E9C] uppercase tracking-widest animate-pulse">
                    Scanning Registry...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm font-bold text-[#848E9C] uppercase tracking-widest">
                    No Attendance Records Found
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r._id} className="hover:bg-[#F5F5F5] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-[#1E2026] tracking-tight">{r.user?.name || 'Unknown'}</p>
                      <p className="text-[10px] font-bold text-[#848E9C]">{r.user?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#848E9C]">
                      {r.user?.role || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-[12px] font-bold text-[#1E2026]">
                      {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </td>
                    <td className="px-6 py-4 text-[12px] font-bold text-[#1E2026]">
                      {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </td>
                    <td className="px-6 py-4 text-[12px] font-black text-[#F0B90B]">
                      {r.totalHours ? `${r.totalHours} hrs` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        r.status === 'Present' ? 'bg-green-100 text-green-700' :
                        r.status === 'Half Day' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'Leave' ? 'bg-purple-100 text-purple-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
