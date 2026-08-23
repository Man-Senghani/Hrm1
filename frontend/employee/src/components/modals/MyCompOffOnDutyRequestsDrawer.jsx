import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const MyCompOffOnDutyRequestsDrawer = ({ isOpen, onClose, compOffs, onDutys, getStatusColor }) => {
  const [activeTab, setActiveTab] = useState('comp-off');

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm pl-8 pr-6 py-6 bg-white dark:bg-[#1e293b] shadow-2xl flex flex-col justify-between border-l border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800 mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Comp-Off & On-Duty Requests</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">

          <div className="flex gap-4 border-b border-gray-100 dark:border-gray-800 mb-4 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab('comp-off')}
              className={`pb-2 text-xs font-bold uppercase tracking-wider cursor-pointer ${activeTab === 'comp-off' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Comp-Off
            </button>
            <button
              onClick={() => setActiveTab('on-duty')}
              className={`pb-2 text-xs font-bold uppercase tracking-wider cursor-pointer ${activeTab === 'on-duty' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              On-Duty
            </button>
          </div>

          <div className="overflow-y-auto pr-1 flex-1 space-y-3 pb-2">
            {activeTab === 'comp-off' ? (
              compOffs.length === 0 ? (
                <div className="py-8 text-center text-gray-500 font-bold text-xs bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  No Comp-Off requests
                </div>
              ) : (
                compOffs.map((req, idx) => (
                  <div key={idx} className="border border-gray-150 dark:border-gray-800 rounded-xl p-3.5 flex flex-col gap-2 bg-gray-50 dark:bg-[#0f172a]/50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">
                        {new Date(req.dateWorked).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(req.status)} capitalize`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-gray-600 dark:text-gray-400 break-words">{req.reason}</p>
                  </div>
                ))
              )
            ) : (
              onDutys.length === 0 ? (
                <div className="py-8 text-center text-gray-500 font-bold text-xs bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  No On-Duty requests
                </div>
              ) : (
                onDutys.map((req, idx) => (
                  <div key={idx} className="border border-gray-150 dark:border-gray-800 rounded-xl p-3.5 flex flex-col gap-2 bg-gray-50 dark:bg-[#0f172a]/50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">
                        {new Date(req.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {req.startDate !== req.endDate && ` - ${new Date(req.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(req.status)} capitalize`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-semibold leading-none">
                      {req.isFullDay ? 'Full Day' : `${req.fromTime} - ${req.toTime}`}
                    </p>
                    <p className="text-[10.5px] text-gray-600 dark:text-gray-400 break-words">{req.reason}</p>
                  </div>
                ))
              )
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-xs transition-colors w-full">Close</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MyCompOffOnDutyRequestsDrawer;
