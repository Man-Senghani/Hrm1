import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Calendar as CalendarIcon, Clock, Users, X, MapPin } from 'lucide-react';
import { getImageUrl } from '@shared/services/api';

const EventsManagement = () => {
  const [events, setEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    _id: '',
    title: '',
    description: '',
    eventType: 'Meeting',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    assignedEmployees: []
  });

  const fetchEvents = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const params = {};
      if (search) params.search = search;
      if (eventType) params.eventType = eventType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axios.get('/api/events', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setEvents(res.data.data || []);
    } catch (err) {
      console.error('Fetch events failed:', err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = sessionStorage.getItem('token');
      // For employee selection, we might fetch users with role 'employee' or use /api/employees 
      const res = await axios.get('/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rawEmps = res.data.data || res.data || [];
      const emps = rawEmps.map(emp => {
        if (emp.userId && typeof emp.userId === 'object') {
          return {
            _id: emp.userId._id,
            name: emp.fullName || emp.userId.name || 'Unknown',
            email: emp.email || emp.userId.email,
            role: emp.role || emp.userId.role,
            employeeId: emp.employeeId,
            profile: emp.userId.profile || emp.profileImage
          };
        }
        return {
           _id: emp.userId || emp._id,
           name: emp.fullName || emp.name || 'Unknown',
           email: emp.email,
           role: emp.role,
           employeeId: emp.employeeId,
           profile: emp.profileImage
        };
      });
      setEmployees(emps);
    } catch (err) {
      console.error('Fetch employees failed:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchEmployees();
  }, [search, eventType, startDate, endDate]);

  const handleOpenModal = (event = null) => {
    if (event) {
      setIsEditing(true);
      setFormData({
        _id: event._id,
        title: event.title,
        description: event.description || '',
        eventType: event.eventType,
        date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location || '',
        assignedEmployees: event.assignedEmployees.map(e => e._id)
      });
    } else {
      setIsEditing(false);
      setFormData({
        _id: '',
        title: '',
        description: '',
        eventType: 'Meeting',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        assignedEmployees: []
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployeeToggle = (empId) => {
    setFormData(prev => {
      const isSelected = prev.assignedEmployees.includes(empId);
      if (isSelected) {
        return { ...prev, assignedEmployees: prev.assignedEmployees.filter(id => id !== empId) };
      } else {
        return { ...prev, assignedEmployees: [...prev.assignedEmployees, empId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime || formData.assignedEmployees.length === 0) {
      toast.error('Please fill all required fields and assign at least one employee.');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (isEditing) {
        await axios.put(`/api/events/${formData._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Event updated successfully');
      } else {
        await axios.post('/api/events', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Event created successfully');
      }
      fetchEvents();
      handleCloseModal();
    } catch (err) {
      console.error('Submit event error:', err);
      toast.error(err.response?.data?.message || 'Failed to save event');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const token = sessionStorage.getItem('token');
        await axios.delete(`/api/events/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Event deleted successfully');
        fetchEvents();
      } catch (err) {
        toast.error('Failed to delete event');
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-['Inter',sans-serif]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event & Meeting Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage events for employees</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Create Event
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by title..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="">All Event Types</option>
            <option value="Meeting">Meeting</option>
            <option value="Review">Review</option>
            <option value="Deadline">Deadline</option>
            <option value="Training">Training</option>
            <option value="Other">Other</option>
          </select>
          <input
            type="date"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">
          No events found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div key={event._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                  {event.eventType}
                </span>
                <div className="flex gap-2 text-gray-400">
                  <button onClick={() => handleOpenModal(event)} className="hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(event._id)} className="hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{event.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{event.description || 'No description'}</p>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2"><CalendarIcon size={14} className="text-gray-400" /> {new Date(event.date).toLocaleDateString()}</div>
                <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /> {event.startTime} - {event.endTime}</div>
                {event.location && <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {event.location}</div>}
              </div>

              <div className="border-t pt-3 mt-auto">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Users size={14} /> Assigned ({event.assignedEmployees.length})
                </div>
                <div className="flex -space-x-2 overflow-hidden">
                  {event.assignedEmployees.slice(0, 4).map((emp, idx) => (
                    <div key={emp._id || idx} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200" title={emp.name}>
                      <img src={getImageUrl(emp.profile?.avatar) || `https://ui-avatars.com/api/?name=${emp.name}&background=random`} alt={emp.name} className="h-full w-full rounded-full object-cover" />
                    </div>
                  ))}
                  {event.assignedEmployees.length > 4 && (
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                      +{event.assignedEmployees.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[999999] overflow-hidden flex justify-end">
          {/* Backdrop with Blur */}
          <div
            onClick={handleCloseModal}
            className="fixed inset-0 top-0 left-0 w-screen h-screen bg-black/50 backdrop-blur-md transition-opacity z-[999999]"
          />

          {/* Right Slide-over Drawer (100vh height, right-aligned) */}
          <div className="fixed top-0 right-0 bottom-0 h-screen z-[1000000] w-full max-w-lg bg-white dark:bg-[#161311] shadow-2xl flex flex-col border-l border-gray-200 dark:border-[#28251e]">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 dark:border-[#28251e] flex justify-between items-center bg-white dark:bg-[#161311] shrink-0">
              <h2 className="text-xl font-extrabold text-[#0f172a] dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {isEditing ? 'Update Event' : 'Create New Event'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1f1b17] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Event Title *</label>
                  <input
                    required
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00a76b]"
                    placeholder="Enter event title"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00a76b] h-24 custom-scrollbar"
                    placeholder="Enter description"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Event Type *</label>
                    <select
                      name="eventType"
                      value={formData.eventType}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00a76b]"
                    >
                      <option value="Meeting">Meeting</option>
                      <option value="Review">Review</option>
                      <option value="Deadline">Deadline</option>
                      <option value="Training">Training</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                    <input
                      required
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00a76b]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Start Time *</label>
                    <input
                      required
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00a76b]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">End Time *</label>
                    <input
                      required
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00a76b]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Location / Meeting Link</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00a76b]"
                    placeholder="Conference Room A or Zoom link"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Assign Employees *</label>

                  {/* Selected Chips */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.assignedEmployees.map(empId => {
                      const emp = employees.find(e => e._id === empId);
                      if (!emp) return null;
                      return (
                        <div key={emp._id} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800/40 shadow-xs">
                          <img src={getImageUrl(emp.profile?.avatar) || `https://ui-avatars.com/api/?name=${emp.name}&background=random`} alt={emp.name} className="w-5 h-5 rounded-full" />
                          <span>{emp.name}</span>
                          <button type="button" onClick={() => handleEmployeeToggle(emp._id)} className="text-blue-500 hover:text-blue-800 dark:hover:text-blue-200 ml-1 focus:outline-none">
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                    {formData.assignedEmployees.length === 0 && (
                      <span className="text-xs text-gray-400 italic">No employees selected. Search below to add.</span>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search and select by name, ID, or email..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 dark:bg-[#1f1b17] border border-gray-200 dark:border-[#28251e] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00a76b]"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                    />

                    {/* Dropdown Results */}
                    {employeeSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#161311] border border-gray-200 dark:border-[#28251e] rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                        {(() => {
                          const term = employeeSearch.toLowerCase();
                          const unselectedEmps = employees.filter(emp => !formData.assignedEmployees.includes(emp._id));
                          const filteredEmps = unselectedEmps.filter(emp =>
                            emp.name?.toLowerCase().includes(term) ||
                            emp.employeeId?.toLowerCase().includes(term) ||
                            emp.email?.toLowerCase().includes(term) ||
                            emp.role?.toLowerCase().includes(term)
                          );

                          if (filteredEmps.length === 0) {
                            return <p className="text-xs text-gray-400 text-center py-4">No matching employees found.</p>;
                          }

                          return filteredEmps.map(emp => (
                            <div
                              key={emp._id}
                              onClick={() => {
                                handleEmployeeToggle(emp._id);
                                setEmployeeSearch('');
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-[#1f1b17] cursor-pointer border-b border-gray-100 dark:border-[#28251e] last:border-0 transition-colors"
                            >
                              <img src={getImageUrl(emp.profile?.avatar) || `https://ui-avatars.com/api/?name=${emp.name}&background=random`} alt={emp.name} className="w-8 h-8 rounded-full border border-gray-200 dark:border-[#28251e]" />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{emp.name}</span>
                                <span className="text-[10px] font-semibold text-gray-400">{emp.email} • {emp.employeeId || emp.role}</span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Buttons */}
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-100 dark:border-[#28251e] bg-white dark:bg-[#161311]">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#25201b] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2e2822] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isEditing ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsManagement;
