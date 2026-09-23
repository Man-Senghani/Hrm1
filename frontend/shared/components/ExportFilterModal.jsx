import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Download, 
  X, 
  Check, 
  ChevronDown,
  SlidersHorizontal, 
  FileSpreadsheet, 
  FileText, 
  FileDown, 
  CheckSquare, 
  Square, 
  Filter,
  Users,
  Calendar
} from 'lucide-react';

const getLocalYYYYMMDD = (d) => {
  if (!d) return '';
  if (typeof d === 'string') return d.split('T')[0];
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const getItemDateString = (item) => {
  if (!item) return '';
  const raw = item.date || item.reportDate || item.checkInTime || item.createdAt;
  if (!raw) return '';
  if (typeof raw === 'string') {
    return raw.split('T')[0];
  }
  if (raw instanceof Date) {
    return getLocalYYYYMMDD(raw);
  }
  return '';
};

/**
 * Stylish custom dropdown select for export filters with smooth animations,
 * colored status indicators, and checkmarks.
 */
const StylishFilterSelect = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allOption = { label: 'All', value: 'all' };
  const fullOptions = [allOption, ...options];
  const current = fullOptions.find(o => String(o.value).toLowerCase() === String(value).toLowerCase()) || allOption;

  const getDotColor = (val, lbl) => {
    const v = String(val || lbl || '').toLowerCase();
    if (v === 'all') return 'bg-slate-400 dark:bg-slate-500 ring-2 ring-slate-400/20';
    if (v.includes('active') || v.includes('complete') || v.includes('success')) return 'bg-emerald-500 ring-2 ring-emerald-400/20';
    if (v.includes('in progress')) return 'bg-blue-500 ring-2 ring-blue-400/20';
    if (v.includes('pending') || v.includes('warning')) return 'bg-amber-500 ring-2 ring-amber-400/20';
    if (v.includes('inactive') || v.includes('hold') || v.includes('fail') || v.includes('closed')) return 'bg-rose-500 ring-2 ring-rose-400/20';
    if (v.includes('admin')) return 'bg-purple-500 ring-2 ring-purple-400/20';
    if (v.includes('manager')) return 'bg-indigo-500 ring-2 ring-indigo-400/20';
    if (v.includes('hr')) return 'bg-teal-500 ring-2 ring-teal-400/20';
    if (v.includes('employee')) return 'bg-sky-500 ring-2 ring-sky-400/20';
    return 'bg-[#00a76b] ring-2 ring-emerald-400/20';
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer select-none ${
          isOpen
            ? 'border-[#00a76b] ring-2 ring-[#00a76b]/20 bg-white dark:bg-[#12241f] shadow-sm'
            : 'border-gray-200 dark:border-[#1e3b32] bg-white dark:bg-[#0f1c18] hover:border-gray-300 dark:hover:border-[#284c40]'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getDotColor(current.value, current.label)}`} />
          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {current.label}
          </span>
        </div>
        <ChevronDown
          size={15}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#00a76b]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 p-1.5 bg-white dark:bg-[#11221d] border border-gray-200 dark:border-[#1e3b32] rounded-2xl shadow-2xl max-h-56 overflow-y-auto animate-fade-in space-y-0.5">
          {fullOptions.map((opt) => {
            const isSelected = String(opt.value).toLowerCase() === String(value).toLowerCase();
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-[#00a76b] dark:text-emerald-400 font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-[#162f27]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColor(opt.value, opt.label)}`} />
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && (
                  <Check size={14} className="text-[#00a76b] dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Universal Export Filter Modal
 * Allows users to choose data scope, in-modal filters, which columns/fields to include,
 * and the output format (CSV, Excel/XLSX, PDF) before downloading.
 */
const ExportFilterModal = ({
  isOpen,
  onClose,
  title = 'Export Data',
  subtitle = 'Customize data scope and select columns to include in your export file.',
  allData = [],
  filteredData = [],
  columns = [], // Array of { key, label, defaultSelected: true, getValue: (item) => string }
  customFilters = [], // Array of { key, label, options: [{ label, value }] }
  defaultFilename = 'export_data',
  initialFormat = 'csv',
  onExport = null // Optional custom export callback (selectedCols, records, format, filename)
}) => {
  // Determine if there is an active view filter
  const hasFilterDifference = filteredData && filteredData.length !== allData.length;
  
  // Date Range state
  const todayStr = useMemo(() => getLocalYYYYMMDD(new Date()), []);
  const [startDate, setStartDate] = useState(() => `${todayStr.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(todayStr);

  const hasDateProperty = useMemo(() => {
    if (!allData || allData.length === 0) return false;
    return allData.some(item => !!getItemDateString(item));
  }, [allData]);

  const dateRangeRecords = useMemo(() => {
    if (!hasDateProperty || !startDate || !endDate) return [];
    const s = startDate <= endDate ? startDate : endDate;
    const e = startDate <= endDate ? endDate : startDate;
    return allData.filter(item => {
      const d = getItemDateString(item);
      return d && d >= s && d <= e;
    });
  }, [allData, hasDateProperty, startDate, endDate]);

  // State
  const [dataScope, setDataScope] = useState(hasFilterDifference ? 'filtered' : 'all');
  const [selectedFormat, setSelectedFormat] = useState(initialFormat || 'csv'); // 'csv' | 'xlsx' | 'pdf'
  const [selectedColumnKeys, setSelectedColumnKeys] = useState(() => 
    columns.filter(c => c.defaultSelected !== false).map(c => c.key)
  );
  
  // Custom filter values state inside modal
  const [activeCustomFilters, setActiveCustomFilters] = useState(() => {
    const initial = {};
    customFilters.forEach(f => {
      initial[f.key] = 'all';
    });
    return initial;
  });

  const wasOpenRef = useRef(false);

  // Re-sync only when modal opens (transitions from false to true)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      // Only initialize state when the modal transitions from closed to open
      if (!wasOpenRef.current) {
        setSelectedColumnKeys(columns.filter(c => c.defaultSelected !== false).map(c => c.key));
        setDataScope(hasFilterDifference ? 'filtered' : 'all');
        setSelectedFormat(initialFormat || 'csv');
        setStartDate(`${todayStr.slice(0, 7)}-01`);
        setEndDate(todayStr);
        const resetFilters = {};
        customFilters.forEach(f => {
          resetFilters[f.key] = 'all';
        });
        setActiveCustomFilters(resetFilters);
        wasOpenRef.current = true;
      }

      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      wasOpenRef.current = false;
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // Compute records to export based on scope and in-modal filters
  const recordsToExport = useMemo(() => {
    let baseList = allData;
    if (dataScope === 'filtered' && filteredData) {
      baseList = filteredData;
    } else if (dataScope === 'dateRange') {
      baseList = dateRangeRecords;
    }

    if (!baseList || !Array.isArray(baseList)) return [];

    return baseList.filter(item => {
      for (const filter of customFilters) {
        const filterVal = activeCustomFilters[filter.key];
        if (filterVal && filterVal !== 'all') {
          const itemVal = filter.getItemValue ? filter.getItemValue(item) : item[filter.key];
          if (String(itemVal).toLowerCase() !== String(filterVal).toLowerCase()) {
            return false;
          }
        }
      }
      return true;
    });
  }, [dataScope, allData, filteredData, dateRangeRecords, customFilters, activeCustomFilters]);

  // Toggle single column
  const toggleColumn = (key) => {
    setSelectedColumnKeys(prev => 
      prev.includes(key) 
        ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) // keep at least 1
        : [...prev, key]
    );
  };

  // Select all / Deselect all
  const selectAllColumns = () => {
    setSelectedColumnKeys(columns.map(c => c.key));
  };

  const deselectAllColumns = () => {
    // Keep first column as minimal
    if (columns.length > 0) {
      setSelectedColumnKeys([columns[0].key]);
    }
  };

  // PDF Export Document Generator
  const exportToPDF = (activeCols, records, filename, reportTitle) => {
    const orientation = activeCols.length > 5 ? 'landscape' : 'portrait';
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const escapeHtml = (val) => {
      if (val === null || val === undefined) return '-';
      return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const headersHtml = activeCols
      .map(col => `<th style="padding: 9px 10px; font-weight: 700; text-align: left; font-size: 10.5px; color: #ffffff; background-color: #00a76b; border: 1px solid #00915c; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">${escapeHtml(col.label)}</th>`)
      .join('');

    const rowsHtml = records
      .map((item, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const cells = activeCols
          .map(col => {
            const raw = col.getValue ? col.getValue(item) : (item[col.key] ?? '');
            const valStr = raw === null || raw === undefined || raw === '' ? '-' : String(raw);
            const isStatus = String(col.label || col.key).toLowerCase().includes('status');
            let content = escapeHtml(valStr);
            if (isStatus && valStr !== '-') {
              const lower = valStr.toLowerCase();
              let badgeColor = '#00a76b';
              let badgeBg = '#ecfdf5';
              let badgeBorder = '#a7f3d0';
              if (lower.includes('absent') || lower.includes('fail') || lower.includes('inactive')) {
                badgeColor = '#ef4444';
                badgeBg = '#fef2f2';
                badgeBorder = '#fecaca';
              } else if (lower.includes('half') || lower.includes('pending') || lower.includes('late')) {
                badgeColor = '#f59e0b';
                badgeBg = '#fffbeb';
                badgeBorder = '#fde68a';
              } else if (lower.includes('leave')) {
                badgeColor = '#3b82f6';
                badgeBg = '#eff6ff';
                badgeBorder = '#bfdbfe';
              }
              content = `<span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; color: ${badgeColor}; background-color: ${badgeBg}; border: 1px solid ${badgeBorder};">${escapeHtml(valStr)}</span>`;
            }
            return `<td style="padding: 8px 10px; font-size: 11px; color: #1f2937; border: 1px solid #e2e8f0; background-color: ${bg}; vertical-align: middle;">${content}</td>`;
          })
          .join('');
        return `<tr style="page-break-inside: avoid;">${cells}</tr>`;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(filename)}</title>
  <style>
    @page {
      size: ${orientation};
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      -webkit-font-smoothing: antialiased;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2px solid #00a76b;
      margin-bottom: 14px;
    }
    .brand {
      font-size: 22px;
      font-weight: 800;
      color: #00a76b;
      letter-spacing: -0.5px;
    }
    .brand span {
      color: #0f172a;
      font-weight: 700;
    }
    .title {
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      margin-top: 3px;
    }
    .meta {
      text-align: right;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
    .meta-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      font-weight: 700;
      font-size: 11px;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
      margin-top: 6px;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Fluid<span>HR</span></div>
      <div class="title">${escapeHtml(reportTitle || 'Data Export Report')}</div>
    </div>
    <div class="meta">
      <div class="meta-badge">${records.length} Records • ${activeCols.length} Columns</div>
      <div>Generated: ${timestamp}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>${headersHtml}</tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>FluidHR System • Confidential Export Document</div>
    <div>Total: ${records.length} records</div>
  </div>
</body>
</html>`;

    // Render in hidden iframe and trigger native print-to-PDF
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('title', 'FluidHR Export PDF');
    document.body.appendChild(iframe);

    try {
      const frameDoc = iframe.contentWindow.document;
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (printErr) {
          console.error('Iframe print error, falling back to window.open:', printErr);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }
        } finally {
          setTimeout(() => {
            try {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            } catch (e) {}
          }, 2000);
        }
      }, 300);
    } catch (e) {
      console.error('PDF export error:', e);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch (err) {}
    }
  };

  // Perform export
  const handleTriggerExport = () => {
    if (recordsToExport.length === 0) {
      alert('No records to export with current filter selection.');
      return;
    }
    if (selectedColumnKeys.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }

    const activeCols = columns.filter(c => selectedColumnKeys.includes(c.key));
    const timestamp = new Date().toISOString().split('T')[0];
    const dateScopeSuffix = dataScope === 'dateRange' && startDate && endDate ? `_${startDate}_to_${endDate}` : '';
    const filename = `${defaultFilename}${dateScopeSuffix}_${timestamp}`;

    if (onExport) {
      onExport(activeCols, recordsToExport, selectedFormat, filename);
      onClose();
      return;
    }

    // Export according to chosen format
    if (selectedFormat === 'pdf') {
      exportToPDF(activeCols, recordsToExport, filename, title);
    } else {
      // CSV and Excel (using UTF-8 BOM CSV which Excel seamlessly opens without encoding issues)
      const headers = activeCols.map(c => c.label);
      const rows = recordsToExport.map(item => {
        return activeCols.map(col => {
          const raw = col.getValue ? col.getValue(item) : (item[col.key] ?? '');
          const str = String(raw ?? '').replace(/"/g, '""');
          return `"${str}"`;
        });
      });

      // UTF-8 BOM \uFEFF ensures Excel recognizes accents, special chars and column delimitations
      const csvContent = '\uFEFF' + [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const ext = selectedFormat === 'xlsx' ? 'csv' : 'csv'; // Clean standard CSV extension supported by Excel
      link.setAttribute('download', `${filename}.${ext}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in font-sans"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0f1c18] border-l border-gray-200 dark:border-[#1e3b32] w-full max-w-[420px] h-full shadow-2xl overflow-hidden flex flex-col justify-between animate-in slide-in-from-right duration-300 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#1a332b] flex items-center justify-between gap-3 bg-gray-50/70 dark:bg-[#12241f] shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-[#00a76b] flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Download size={18} className="stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {title}
              </h2>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 transition-all cursor-pointer shrink-0 border border-gray-200 dark:border-white/10 shadow-xs"
            aria-label="Close"
            title="Close"
          >
            <X size={16} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* 1. Scope Selection (Filtered / All / Custom Date Range) */}
          {(hasFilterDifference || hasDateProperty) && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Filter size={13} />
                <span>Data Scope</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {hasFilterDifference && (
                  <button
                    type="button"
                    onClick={() => setDataScope('filtered')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      dataScope === 'filtered'
                        ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-[#00a76b]'
                        : 'border-gray-200 dark:border-[#1a332b] bg-white dark:bg-[#11221d] hover:bg-gray-50 dark:hover:bg-[#162f27]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      dataScope === 'filtered' ? 'border-[#00a76b] bg-[#00a76b]' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {dataScope === 'filtered' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      Current Filtered View
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDataScope('all')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    dataScope === 'all'
                      ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-[#00a76b]'
                      : 'border-gray-200 dark:border-[#1a332b] bg-white dark:bg-[#11221d] hover:bg-gray-50 dark:hover:bg-[#162f27]'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    dataScope === 'all' ? 'border-[#00a76b] bg-[#00a76b]' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {dataScope === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    All Records
                  </div>
                </button>

                {hasDateProperty && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setDataScope('dateRange')}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        dataScope === 'dateRange'
                          ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-[#00a76b]'
                          : 'border-gray-200 dark:border-[#1a332b] bg-white dark:bg-[#11221d] hover:bg-gray-50 dark:hover:bg-[#162f27]'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        dataScope === 'dateRange' ? 'border-[#00a76b] bg-[#00a76b]' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {dataScope === 'dateRange' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Calendar size={13} className="text-[#00a76b]" />
                          <span>Select Date Range</span>
                        </div>
                      </div>
                    </button>

                    {dataScope === 'dateRange' && (
                      <div className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 block mb-1">
                              From Date
                            </label>
                            <input
                              type="date"
                              value={startDate}
                              max={endDate || todayStr}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#1e3b32] bg-white dark:bg-[#0f1c18] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a76b] cursor-pointer shadow-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 block mb-1">
                              To Date
                            </label>
                            <input
                              type="date"
                              value={endDate}
                              min={startDate}
                              max={todayStr}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#1e3b32] bg-white dark:bg-[#0f1c18] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00a76b] cursor-pointer shadow-xs"
                            />
                          </div>
                        </div>

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[9.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Presets:
                          </span>
                          {[
                            { label: 'Today', getDates: () => ({ s: todayStr, e: todayStr }) },
                            { label: 'Last 7 Days', getDates: () => {
                              const d = new Date(); d.setDate(d.getDate() - 6);
                              return { s: getLocalYYYYMMDD(d), e: todayStr };
                            }},
                            { label: 'This Month', getDates: () => ({ s: `${todayStr.slice(0, 7)}-01`, e: todayStr }) },
                            { label: 'Last 30 Days', getDates: () => {
                              const d = new Date(); d.setDate(d.getDate() - 29);
                              return { s: getLocalYYYYMMDD(d), e: todayStr };
                            }}
                          ].map(preset => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                const { s, e } = preset.getDates();
                                setStartDate(s);
                                setEndDate(e);
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-[#12241f] border border-gray-200 dark:border-[#1e3b32] hover:border-[#00a76b] text-gray-600 dark:text-gray-300 hover:text-[#00a76b] dark:hover:text-emerald-400 transition-all cursor-pointer shadow-2xs"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. In-Modal Filters (Role, Status, etc. if configured) */}
          {customFilters.length > 0 && (
            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-[#1a332b] bg-gray-50/50 dark:bg-[#12241f]/50 space-y-2.5 relative z-30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                Quick Filter Options
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {customFilters.map(filter => (
                  <StylishFilterSelect
                    key={filter.key}
                    label={filter.label}
                    value={activeCustomFilters[filter.key] || 'all'}
                    options={filter.options}
                    onChange={(val) => setActiveCustomFilters(prev => ({ ...prev, [filter.key]: val }))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. Columns to Include */}
          <div>
            <div className="flex items-center justify-between mb-2.5 gap-2 flex-nowrap">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 shrink-0">
                <SlidersHorizontal size={13} />
                <span>Fields</span>
              </label>
              <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllColumns}
                  className="font-bold text-[#00a76b] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <button
                  type="button"
                  onClick={deselectAllColumns}
                  className="font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {columns.map(col => {
                const isSelected = selectedColumnKeys.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumn(col.key)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-[#1a332b] bg-white dark:bg-[#11221d] text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                      isSelected 
                        ? 'bg-[#00a76b] text-white' 
                        : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1c18]'
                    }`}>
                      {isSelected && <Check size={12} className="stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium truncate select-none">
                      {col.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Format Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">
              Output Format
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all cursor-pointer gap-1.5 ${
                  selectedFormat === 'csv'
                    ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/30 text-[#00a76b] font-bold ring-1 ring-[#00a76b]'
                    : 'border-gray-200 dark:border-[#1a332b] bg-white dark:bg-[#11221d] text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
              >
                <FileText size={18} />
                <span className="text-xs">CSV (.csv)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('xlsx')}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all cursor-pointer gap-1.5 ${
                  selectedFormat === 'xlsx'
                    ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/30 text-[#00a76b] font-bold ring-1 ring-[#00a76b]'
                    : 'border-gray-200 dark:border-[#1a332b] bg-white dark:bg-[#11221d] text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
              >
                <FileSpreadsheet size={18} />
                <span className="text-xs">Excel (XLSX)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all cursor-pointer gap-1.5 ${
                  selectedFormat === 'pdf'
                    ? 'border-[#00a76b] bg-emerald-50/60 dark:bg-emerald-950/30 text-[#00a76b] font-bold ring-1 ring-[#00a76b]'
                    : 'border-gray-200 dark:border-[#1a332b] bg-white dark:bg-[#11221d] text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
              >
                <FileDown size={18} />
                <span className="text-xs">PDF (.pdf)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-[#1a332b] bg-gray-50/70 dark:bg-[#12241f] shrink-0">
          <div className="w-full">
            <button
              type="button"
              onClick={handleTriggerExport}
              disabled={recordsToExport.length === 0 || selectedColumnKeys.length === 0}
              className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                recordsToExport.length === 0 || selectedColumnKeys.length === 0
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
                  : 'bg-[#00a76b] hover:bg-[#00915c] active:scale-95'
              }`}
            >
              <Download size={14} />
              <span>Export {selectedFormat.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default ExportFilterModal;
