import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  Users, Plus, Search, Shield, UserPlus, Trash2,
  ArrowRight, Building2, CheckCircle, AlertTriangle
} from 'lucide-react';

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [managers, setManagers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [newTeam, setNewTeam] = useState({
    teamName: '',
    department: '',
    managerId: ''
  });

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, mgrRes, empRes] = await Promise.all([
        axios.get('/api/teams', { headers }),
        axios.get('/api/personnel/managers', { headers }),
        axios.get('/api/personnel/employees', { headers })
      ]);
      setTeams(teamsRes.data);
      setManagers(mgrRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAll = async () => {
    const pendingRequests = teams.filter(t => t.status === 'pending' || t.status === 'request');
    if (pendingRequests.length === 0) {
      alert('No pending team integration requests detected.');
      return;
    }

    if (window.confirm(`⚠️ AUTHORITY ALERT: You are about to mass-reject ${pendingRequests.length} team integration requests. This action is final. Proceed?`)) {
      setLoading(true);
      try {
        await Promise.all(
          pendingRequests.map(t => axios.put(`/api/teams/status/${t._id}`, { status: 'rejected' }, { headers }))
        );
        alert(`Institutional Veto Complete: ${pendingRequests.length} requests successfully declined.`);
        fetchData();
      } catch (err) {
        console.error('Mass veto failed:', err);
        alert('Institutional Veto disrupted. Check registry connection.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/teams/create', newTeam, { headers });
      setMessage({ type: 'success', text: 'Tactical Unit successfully initialized' });
      setNewTeam({ teamName: '', department: '', managerId: '' });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Initialization Failure' });
    }
  };

  const [activeTeamId, setActiveTeamId] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const handleAddMembers = async () => {
    try {
      await axios.put(`/api/teams/add-members/${activeTeamId}`, { members: selectedMembers }, { headers });
      setMessage({ type: 'success', text: 'Personnel nodes integrated successfully' });
      setSelectedMembers([]);
      setActiveTeamId(null);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Integration Failure' });
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6 opacity-30">
      <div className="w-12 h-12 border-4 border-t-[#F0B90B] border-[#F2F2F2] rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Synchronizing Team Registry...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1E2026] tracking-tight leading-none mb-3 uppercase">
            Team <span className="text-[#F0B90B]">Management</span>
          </h1>
          <p className="text-[#848E9C] font-bold text-[11px] uppercase tracking-[0.2em] flex items-center gap-3">
            <span className="w-12 h-[2px] bg-[#F0B90B]"></span>
            Organizational Clustering & Control Hub
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleRejectAll}
            className="border border-[#F6465D] text-[#F6465D] hover:bg-[#F6465D] hover:text-white px-8 py-4 rounded-full font-black text-[12px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 active:scale-95"
          >
            <Shield size={18} />
            Reject All Pending
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1E2026] text-white px-8 py-4 rounded-full font-black text-[12px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center gap-3 active:scale-95"
          >
            <Plus size={18} />
            Forge New Team
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-[#0ECB81]/10 border border-[#0ECB81]/20 text-[#0ECB81]' : 'bg-[#F6465D]/10 border border-[#F6465D]/20 text-[#F6465D]'}`}>
          <CheckCircle size={18} />
          <span className="text-[12px] font-bold uppercase tracking-widest">{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto opacity-50"><Trash2 size={16} /></button>
        </div>
      )}

      {/* TEAMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {teams.map((team) => (
          <div key={team._id} className="bg-white border border-[#E6E8EA] rounded-[32px] overflow-hidden shadow-sm group hover:shadow-2xl transition-all duration-500 flex flex-col">
            <div className="p-8 bg-[#F5F5F5] border-b border-[#E6E8EA] flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-[#1E2026] uppercase tracking-tighter leading-none mb-2">{team.teamName}</h3>
                <span className="px-3 py-1 bg-white border border-[#E6E8EA] rounded-lg text-[9px] font-black text-[#848E9C] uppercase tracking-widest">{team.department}</span>
              </div>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-[#F0B90B] transition-colors">
                <Users size={24} className="group-hover:text-[#1E2026] text-[#848E9C]" />
              </div>
            </div>

            <div className="p-8 flex-1 space-y-8">
              {/* Manager Card */}
              <div>
                <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-widest mb-4">Commanding Officer</p>
                <div className="flex items-center gap-4 p-4 bg-[#F9FAFC] rounded-2xl border border-[#E6E8EA]">
                  <div className="w-10 h-10 rounded-full bg-[#1E2026] flex items-center justify-center text-[#F0B90B] font-black text-sm">
                    {team.managerId?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-[#1E2026] uppercase">{team.managerId?.name}</p>
                    <p className="text-[10px] font-bold text-[#848E9C]">{team.managerId?.email}</p>
                  </div>
                </div>
              </div>

              {/* Members Preview */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-widest">Team Nodes ({team.members?.length || 0})</p>
                  <button
                    onClick={() => setActiveTeamId(team._id)}
                    className="text-[9px] font-black text-[#F0B90B] uppercase tracking-widest hover:underline"
                  >
                    Integrate Node
                  </button>
                </div>
                <div className="flex -space-x-3 overflow-hidden">
                  {team.members?.slice(0, 5).map((member, i) => (
                    <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-[#F5F5F5] flex items-center justify-center overflow-hidden grayscale hover:grayscale-0 transition-all cursor-help" title={member.name}>
                      <img src={`https://ui-avatars.com/api/?name=${member.name}&background=1E2026&color=F0B90B&bold=true`} alt="user" />
                    </div>
                  ))}
                  {team.members?.length > 5 && (
                    <div className="w-9 h-9 rounded-full border-2 border-white bg-[#1E2026] text-[#F0B90B] flex items-center justify-center text-[10px] font-black">
                      +{team.members.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#F5F5F5]/50 border-t border-[#E6E8EA] flex justify-end">
              <button className="flex items-center gap-2 text-[10px] font-black uppercase text-[#848E9C] hover:text-[#1E2026] transition-all">
                Audit Protocol <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && createPortal(
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-white/[0.01] backdrop-blur-xl animate-in fade-in duration-300 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white/90 backdrop-blur-3xl rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white/20 p-12 relative cursor-default"
          >
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-black hover:rotate-90 transition-all">
              <Trash2 size={24} />
            </button>
            <h2 className="text-3xl font-black text-[#1E2026] uppercase tracking-tighter italic mb-8">Forge New <span className="text-[#F0B90B]">Team</span></h2>
            <form onSubmit={handleCreateTeam} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Team Designation</label>
                <input
                  required
                  placeholder="e.g. ALPHA SQUAD"
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-orange-400/20 focus:border-[#F0B90B] focus:bg-white transition-all outline-none font-bold"
                  value={newTeam.teamName}
                  onChange={(e) => setNewTeam({ ...newTeam, teamName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Department Branch</label>
                <input
                  required
                  placeholder="e.g. CYBER OPS"
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-orange-400/20 focus:border-[#F0B90B] focus:bg-white transition-all outline-none font-bold"
                  value={newTeam.department}
                  onChange={(e) => setNewTeam({ ...newTeam, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Manager</label>
                <select
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-orange-400/20 focus:border-[#F0B90B] focus:bg-white transition-all outline-none font-bold appearance-none"
                  value={newTeam.managerId}
                  onChange={(e) => setNewTeam({ ...newTeam, managerId: e.target.value })}
                >
                  <option value="">Select Commander</option>
                  {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-5 bg-[#1E2026] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-black shadow-xl active:scale-95 transition-all">
                Initialize Protocol
              </button>
            </form>
          </div>
        </div>,
        document.getElementById('modal-root')
      )}

      {/* MEMBER INTEGRATION MODAL */}
      {activeTeamId && createPortal(
        <div
          onClick={() => { setActiveTeamId(null); setSelectedMembers([]); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-white/[0.01] backdrop-blur-xl animate-in zoom-in duration-300 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white/90 backdrop-blur-3xl rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white/20 overflow-hidden flex flex-col max-h-[80vh] cursor-default"
          >
            <div className="p-10 bg-[#1E2026] text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Personnel <span className="text-[#F0B90B]">Integration</span></h2>
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Select nodes to anchor to {teams.find(t => t._id === activeTeamId)?.teamName}</p>
              </div>
              <button onClick={() => { setActiveTeamId(null); setSelectedMembers([]); }} className="text-white/40 hover:text-white"><Trash2 size={24} /></button>
            </div>
            <div className="p-8 flex-1 overflow-y-auto space-y-4">
              {employees.map((emp) => (
                <div
                  key={emp._id}
                  onClick={() => {
                    setSelectedMembers(prev => prev.includes(emp._id) ? prev.filter(id => id !== emp._id) : [...prev, emp._id]);
                  }}
                  className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all cursor-pointer ${selectedMembers.includes(emp._id) ? 'bg-[#F0B90B]/10 border-[#F0B90B]' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${selectedMembers.includes(emp._id) ? 'bg-[#F0B90B] text-[#1E2026]' : 'bg-[#1E2026] text-white'}`}>
                      {emp.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-[#1E2026] uppercase leading-none">{emp.name}</p>
                      <p className="text-[9px] font-bold text-[#848E9C] uppercase tracking-widest mt-1">{emp.email}</p>
                    </div>
                  </div>
                  {selectedMembers.includes(emp._id) && <CheckCircle className="text-[#F0B90B]" size={20} />}
                </div>
              ))}
            </div>
            <div className="p-10 border-t border-[#E6E8EA] bg-slate-50/50 flex justify-between items-center">
              <p className="text-[12px] font-black text-[#1E2026] uppercase">{selectedMembers.length} nodes selected</p>
              <button
                disabled={selectedMembers.length === 0}
                onClick={handleAddMembers}
                className="px-10 py-4 bg-[#F0B90B] text-[#1E2026] rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl shadow-[#F0B90B]/20 transition-all"
              >
                Confirm Integration
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')
      )}

    </div>
  );
};

export default TeamManagement;
