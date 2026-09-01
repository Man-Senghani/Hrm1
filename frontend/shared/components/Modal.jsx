import React, { useEffect } from 'react';
import Button from './Button';
import { X } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  width = 'max-w-lg' 
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => (e.key === 'Escape' && onClose());
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'auto';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fade-in cursor-pointer" onClick={onClose}>
      <div 
        className={`bg-white rounded-2xl shadow-2xl overflow-hidden w-full ${width} animate-scale-up border border-[#F1F3F6]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#F1F3F6] bg-white">
          <h3 className="text-xl font-bold text-[#1F2937]">{title}</h3>
          <button 
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F7F9FC] transition-colors p-1.5 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="px-6 py-6 overflow-y-auto max-h-[75vh]">
          {children}
        </div>

        {footer !== undefined && (
          <div className="px-6 py-4 bg-[#F7F9FC] border-t border-[#F1F3F6] flex justify-end gap-3">
            {footer || (
              <>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button>Confirm</Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
