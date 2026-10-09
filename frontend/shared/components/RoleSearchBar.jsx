import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { menuConfig } from '../config/menuConfig';

const RoleSearchBar = ({ activeRole }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const menuItems = menuConfig[activeRole] || [];

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Filter items by label, keywords, or path
  const filteredItems = menuItems.filter(item => {
    if (!debouncedQuery.trim()) return false;
    const q = debouncedQuery.toLowerCase().trim();
    const labelMatch = item.label.toLowerCase().includes(q);
    const keywordMatch = Array.isArray(item.keywords) && item.keywords.some(k => k.toLowerCase().includes(q));
    const pathMatch = item.path.toLowerCase().includes(q);
    return labelMatch || keywordMatch || pathMatch;
  });

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [debouncedQuery]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (path) => {
    setIsOpen(false);
    setQuery('');
    let cleanPath = path;
    if (cleanPath.startsWith(`/${activeRole}/`) || cleanPath === `/${activeRole}`) {
      if (!location.pathname.startsWith(`/${activeRole}`)) {
        cleanPath = cleanPath.replace(new RegExp(`^/${activeRole}`), '') || '/';
      }
    }
    navigate(cleanPath);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || !debouncedQuery.trim()) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleNavigate(filteredItems[selectedIndex].path);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="hidden sm:block flex-1 max-w-[300px] xl:max-w-[350px] w-full relative" ref={searchRef}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-emerald-400 transition-colors">
        <Search size={18} />
      </div>
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-[#1a2e26] border border-slate-200 dark:border-[#3b6657] hover:border-slate-300 dark:hover:border-[#4d8270] rounded-full text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00a76b]/30 focus:border-[#00a76b] dark:focus:border-[#00c982] focus:bg-white dark:focus:bg-[#20392f] transition-all shadow-xs"
      />

      {isOpen && debouncedQuery.trim().length > 0 && (
        <div className="absolute top-[45px] left-0 w-[300px] sm:w-[350px] bg-white dark:bg-[#11201b] border border-[#eceae3] dark:border-[#28453a] rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden z-[110] max-h-[400px] overflow-y-auto p-4 space-y-2">
          {filteredItems.length > 0 ? (
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00a76b] dark:text-[#00c982] mb-1.5">Suggestions</h4>
              <div className="space-y-1">
                {filteredItems.map((item, index) => (
                  <div
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      selectedIndex === index
                        ? 'bg-[#00a76b]/10 dark:bg-[#00a76b]/25'
                        : 'hover:bg-gray-50 dark:hover:bg-[#192f27]'
                    }`}
                  >
                    <span className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Search size={14} className="text-gray-400 dark:text-emerald-400/80" />
                      {item.label}
                    </span>
                    <ChevronRight size={14} className="text-gray-400 dark:text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-300">No results found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleSearchBar;
