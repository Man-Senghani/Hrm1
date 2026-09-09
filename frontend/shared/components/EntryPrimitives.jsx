import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export const EntryButton = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyles = "zap-btn w-full transition-all active:scale-[0.98] tracking-tight";
  const variants = {
    primary: "zap-btn-orange",
    secondary: "zap-btn-dark",
    outline: "zap-btn-light",
    ghost: "bg-transparent text-[#00a76b] hover:bg-[#fffdf9] p-2"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const EntryInput = ({ label, icon, type = 'text', error, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      {label && <label className="zap-caption-upper text-[#201515] ml-1">{label}</label>}
      <div className="relative group">
        {icon && (
          <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
            error ? 'text-[#d9381e]' : 'text-[#939084] group-focus-within:text-[#00a76b]'
          }`}>
            {icon}
          </span>
        )}
        <input
          type={inputType}
          className={`w-full h-[56px] bg-[#fffefb] rounded-[4px] px-4 text-[16px] font-medium text-[#201515] placeholder-[#939084] focus:outline-none transition-all ${
            icon ? 'pl-12' : ''
          } ${isPassword ? 'pr-12' : ''} ${
            error
              ? 'border-2 border-[#d9381e] ring-2 ring-[#d9381e]/15'
              : 'border border-[#c5c0b1] focus:border-[#00a76b]'
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#939084] hover:text-[#00a76b] transition-colors bg-transparent border-none cursor-pointer outline-none flex items-center justify-center"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 ml-1 text-[#d9381e] animate-fade-in">
          <AlertCircle size={13} className="shrink-0" />
          <span className="text-[12px] font-semibold">{error}</span>
        </div>
      )}
    </div>
  );
};

export const EntrySelect = ({ label, icon, options = [], ...props }) => (
  <div className="flex flex-col gap-3 w-full text-left">
    {label && <label className="zap-caption-upper text-[#201515] ml-1">{label}</label>}
    <div className="relative group">
      {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939084] group-focus-within:text-[#00a76b] transition-colors">{icon}</span>}
      <select
        className={`w-full h-[56px] bg-[#fffefb] border border-[#c5c0b1] rounded-[4px] px-4 text-[16px] font-bold text-[#201515] focus:outline-none focus:border-[#00a76b] transition-all appearance-none cursor-pointer ${icon ? 'pl-12' : ''}`}
        {...props}
      >
        <option value="" disabled>Select access level</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#939084]">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  </div>
);

export const RoleCard = ({ title, desc, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`zap-card group flex flex-col items-start justify-between min-h-[220px] transition-all text-left border-2 ${active ? 'border-[#00a76b] bg-[#fffdf9]' : 'border-[#c5c0b1] hover:border-[#201515]'}`}
  >
    <div className={`w-14 h-14 rounded-[8px] flex items-center justify-center transition-all duration-300 ${active ? 'bg-[#00a76b] text-[#fffefb]' : 'bg-[#eceae3] text-[#201515] group-hover:bg-[#201515] group-hover:text-[#fffefb]'}`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div className="w-full">
      <h3 className="text-[20px] font-bold text-[#201515] mb-2">{title}</h3>
      <p className="text-[14px] text-[#36342e] leading-relaxed font-medium">
        {desc}
      </p>
    </div>
  </button>
);
