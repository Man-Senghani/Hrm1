import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, MapPin, User, X, CheckCircle, Info } from 'lucide-react';
import { getImageUrl } from '@shared/services/api';

const MyEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchAssignedEvents = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('/api/events/assigned', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch assigned events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedEvents();
  }, []);

  const handleEventClick = async (event) => {
    setSelectedEvent(event);
    const token = sessionStorage.getItem('token');
    const userString = sessionStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const userId = user?._id || user?.id;

    if (userId && !event.readBy.includes(userId)) {
      try {
        await axios.patch(`/api/events/${event._id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Update local state to reflect read
        setEvents(prev => prev.map(e => e._id === event._id ? { ...e, readBy: [...e.readBy, userId] } : e));
      } catch (err) {
        console.error('Failed to mark event as read', err);
      }
    }
  };

  const closeModal = () => setSelectedEvent(null);

  // Helper to check if event is read by current user
  const isRead = (event) => {
    const userString = sessionStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const userId = user?._id || user?.id;
    return userId && event.readBy.includes(userId);
  };

  if (loading) {
    return <div className="p-8 text-center text-[#939084] animate-pulse">Loading Events...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto font-['Inter',sans-serif]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#201515] dark:text-white">My Events</h1>
        <p className="text-sm text-[#939084] mt-1">View all events and meetings assigned to you.</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-[#fffefb] dark:bg-[#0f0d0a] border border-[#c5c0b1] dark:border-[#38352e] rounded-[20px] p-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <Calendar className="text-blue-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-[#201515] dark:text-white mb-2">No Events Found</h3>
          <p className="text-[#939084] text-sm max-w-sm">You have no assigned events or meetings at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div 
              key={event._id} 
              onClick={() => handleEventClick(event)}
              className="bg-[#fffefb] dark:bg-[#0f0d0a] border border-[#c5c0b1] dark:border-[#38352e] rounded-[20px] p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
            >
              {!isRead(event) && (
                <div className="absolute top-5 right-5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#0f0d0a]"></div>
              )}
              
              <div className="flex gap-4 items-start mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-center min-w-[60px] p-2 border border-blue-100 dark:border-blue-900/30">
                  <p className="text-xl font-bold leading-none">{new Date(event.date).getDate()}</p>
                  <p className="text-[10px] font-bold uppercase mt-1">
                    {new Date(event.date).toLocaleString('default', { month: 'short' })}
                  </p>
                </div>
                <div className="flex-1 pr-6">
                  <h3 className="font-bold text-[#201515] dark:text-white line-clamp-1">{event.title}</h3>
                  <span className="inline-block px-2 py-0.5 mt-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                    {event.eventType}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-[#939084] mt-4">
                <div className="flex items-center gap-2">
                  <Clock size={14} /> 
                  <span>{event.startTime} - {event.endTime}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} /> 
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
                {event.createdBy && (
                  <div className="flex items-center gap-2">
                    <User size={14} /> 
                    <span>Created by {event.createdBy.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#fffefb] dark:bg-[#1a1815] rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden border border-[#c5c0b1] dark:border-[#38352e]">
            <div className="flex justify-between items-start p-6 pb-4 border-b border-[#eceae3] dark:border-[#38352e]">
              <div>
                <span className="inline-block px-3 py-1 mb-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold tracking-wide">
                  {selectedEvent.eventType.toUpperCase()}
                </span>
                <h2 className="text-2xl font-bold text-[#201515] dark:text-white leading-tight pr-4">
                  {selectedEvent.title}
                </h2>
              </div>
              <button 
                onClick={closeModal} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-full p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Info size={14} /> Details
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {selectedEvent.description || 'No additional details provided.'}
                </p>
              </div>

              {/* Time & Location Grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" />
                    {new Date(selectedEvent.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Time</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock size={14} className="text-green-500" />
                    {selectedEvent.startTime} - {selectedEvent.endTime}
                  </p>
                </div>
                {selectedEvent.location && (
                  <div className="col-span-2 mt-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Location / Link</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin size={14} className="text-red-500" />
                      {selectedEvent.location.startsWith('http') ? (
                        <a href={selectedEvent.location} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selectedEvent.location}</a>
                      ) : (
                        selectedEvent.location
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Organizer */}
              {selectedEvent.createdBy && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Organizer</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                        <img 
                          src={getImageUrl(selectedEvent.createdBy.profile?.avatar) || `https://ui-avatars.com/api/?name=${selectedEvent.createdBy.name}&background=random`} 
                          alt={selectedEvent.createdBy.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedEvent.createdBy.name}</p>
                        <p className="text-xs text-gray-500">{selectedEvent.createdBy.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
                    <CheckCircle size={14} /> Assigned to you
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEvents;
