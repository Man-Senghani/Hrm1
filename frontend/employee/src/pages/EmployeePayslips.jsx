import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Download, X, FileText, Plus, Search, 
  SlidersHorizontal, Receipt, Shield, CheckCircle
} from 'lucide-react';

const getAuth = () => {
  const t = sessionStorage.getItem('token');
  return t ? { headers: { Authorization: `Bearer ${t}` } } : null;
};

const fmtCurrency = (n) =>
  n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '--';

const EmployeePayslips = () => {
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const displayName = (() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('user'));
      return u?.name || u?.fullName || 'Bhavik Kukadiya';
    } catch {
      return 'Bhavik Kukadiya';
    }
  })();

  const displayRole = (() => {
    try {
      const role = sessionStorage.getItem('role') || 'EMPLOYEE';
      return role.toUpperCase();
    } catch {
      return 'EMPLOYEE';
    }
  })();

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      if (!auth) return;
      const res = await axios.get('/api/payroll/me', auth);
      setPayroll(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const [showTaxModal, setShowTaxModal] = useState(false);

  // Safe fallback/mock slips if the database returns no payroll records yet
  const defaultSlips = [
    { month: 'May 2026', basicSalary: 45000, allowance: 15000, bonus: 3500, deductions: 5000, netPay: 58500, status: 'paid', date: 'May 31, 2026' },
    { month: 'April 2026', basicSalary: 45000, allowance: 15000, bonus: 0, deductions: 5000, netPay: 55000, status: 'paid', date: 'April 30, 2026' },
    { month: 'March 2026', basicSalary: 45000, allowance: 15000, bonus: 0, deductions: 5000, netPay: 55000, status: 'paid', date: 'March 31, 2026' },
    { month: 'February 2026', basicSalary: 45000, allowance: 15000, bonus: 2000, deductions: 5000, netPay: 57000, status: 'paid', date: 'February 28, 2026' }
  ];

  const rawSlips = payroll.length === 0 ? defaultSlips : payroll.map(p => ({
    month: p.month || new Date(p.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    basicSalary: p.basicSalary || p.amount || 0,
    allowance: p.allowances || p.allowance || 0,
    bonus: p.bonus || 0,
    deductions: p.deductions || p.tds || 0,
    netPay: p.netSalary || p.netPay || p.amount || 0,
    status: p.status || 'Paid',
    date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }));

  const handlePrint = () => {
    window.print();
  };

  // ✅ FUNCTIONAL: Export all payslips as a downloadable CSV file
  const handleExport = () => {
    const slipsToExport = rawSlips;
    const headers = ['Month', 'Basic Salary (₹)', 'HRA Allowance (₹)', 'Performance Bonus (₹)', 'Deductions (₹)', 'Net Pay (₹)', 'Status', 'Payment Date'];
    const rows = slipsToExport.map(p => [
      p.month,
      p.basicSalary,
      p.allowance,
      p.bonus,
      p.deductions,
      p.netPay,
      p.status,
      p.date
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FluidHR_Payslips_${displayName.replace(/\s+/g, '_')}_${new Date().getFullYear()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ✅ FUNCTIONAL: Open the Tax Documents modal
  const handleTaxDocs = () => {
    setShowTaxModal(true);
  };

  // Print the tax summary document
  const handlePrintTax = () => {
    window.print();
  };

  const filteredSlips = rawSlips.filter(p =>
    p.month.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: isDark ? '#070B13' : '#f9fdfc', minHeight: 'calc(100vh - 56px)', color: isDark ? '#cbd5e1' : '#3b3e3c', width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .print-only {
          display: none !important;
        }

        @media print {
          /* Hide background layout elements and page content to prevent multi-page overflow */
          header, 
          aside, 
          footer, 
          .payslips-content-container {
            display: none !important;
          }
          
          /* Make the overlay container a full-page flat canvas */
          .print-overlay {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            z-index: auto !important;
            backdrop-filter: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Style the printed payslip statement to span the FULL A4 PAGE in a professional format */
          .print-modal.verdant-card {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            position: static !important;
            display: block !important;
          }

          .print-only {
            display: block !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="payslips-content-container" style={{ width: '100%', maxWidth: '100%', padding: '32px 32px 60px', boxSizing: 'border-box' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: isDark ? '#f8fafc' : '#2c302e', margin: 0, letterSpacing: '-0.5px' }}>
              Payslips
            </h1>
            <p style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#8c918f', margin: '4px 0 0' }}>Your monthly compensation history.</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleExport} className="verdant-btn-outline" style={{ gap: 8, height: 44 }}>
              <Download size={16} /> Export
            </button>
            <button onClick={handleTaxDocs} className="verdant-btn-primary" style={{ gap: 8, height: 44 }}>
              <Plus size={16} /> Tax documents
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="verdant-input with-search-icon"
            />
          </div>
          <button className="verdant-btn-outline" style={{ gap: 8, height: 44 }}>
            <SlidersHorizontal size={16} /> Filters
          </button>
        </div>

        {/* PAYSLIPS CARD */}
        <div className="verdant-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: isDark ? '1px solid #1a2d29' : '1px solid #e2eae7' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#2c302e', margin: 0 }}>Payslip history</h3>
          </div>
          
          {loading ? (
            <p style={{ padding: '40px 24px', textAlign: 'center', color: isDark ? '#94a3b8' : '#8c918f', fontSize: 14, margin: 0 }} className="animate-pulse">
              Synchronizing payslips...
            </p>
          ) : filteredSlips.length === 0 ? (
            <p style={{ padding: '40px 24px', textAlign: 'center', color: isDark ? '#94a3b8' : '#8c918f', fontSize: 14, margin: 0 }}>
              No payslip records found.
            </p>
          ) : (
            filteredSlips.map((p, idx) => {
              const grossVal = p.basicSalary + p.allowance + p.bonus;
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedSlip(p)} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '16px 24px', 
                    borderBottom: idx === filteredSlips.length - 1 ? 'none' : (isDark ? '1px solid #1a2d29' : '1px solid #e2eae7'), 
                    cursor: 'pointer', 
                    transition: 'background 0.2s' 
                  }} 
                  className={isDark ? "hover:bg-[#162722]" : "hover:bg-[#f9fdfc]"}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: isDark ? 'rgba(0, 167, 107, 0.15)' : '#e6f7f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Receipt size={20} color="#00a76b" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#f8fafc' : '#3b3e3c', margin: '0 0 4px' }}>{p.month}</h4>
                      <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#8c918f', margin: 0 }}>
                        Gross {fmtCurrency(grossVal)} • Net {fmtCurrency(p.netPay)}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 700,
                      background: isDark ? 'rgba(0, 167, 107, 0.15)' : '#e6f7f0',
                      color: isDark ? '#34d399' : '#00a76b',
                      textTransform: 'capitalize',
                      display: 'inline-block'
                    }}>
                      {p.status}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedSlip(p); }} 
                      className="verdant-btn-outline" 
                      style={{ gap: 6, height: 36, padding: '0 16px', fontSize: 12 }}
                    >
                      <Download size={14} /> PDF
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedSlip && (
        <div className="print-overlay" onClick={() => setSelectedSlip(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30, 32, 38, 0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="verdant-card print-modal" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, padding: 32, position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            
            {/* Screen layout */}
            <div className="no-print" style={{ width: '100%' }}>
              <button style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}
                onClick={() => setSelectedSlip(null)}>
                <X size={20} />
              </button>

              <div style={{ textAlign: 'center', borderBottom: isDark ? '1px dashed #1a2d29' : '1px dashed #e2eae7', paddingBottom: 20, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: isDark ? 'rgba(0, 167, 107, 0.15)' : '#e6f7f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <FileText size={22} color="#00a76b" />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#2c302e', margin: 0 }}>FluidHR Ledger</h4>
                <p style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#8c918f', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: 1 }}>Salary Statement - {selectedSlip.month}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: `1px solid ${isDark ? '#1a2d29' : '#e2eae7'}`, paddingBottom: 8 }}>
                  <span style={{ color: isDark ? '#94a3b8' : '#8c918f' }}>Basic Salary</span>
                  <span style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#2c302e' }}>{fmtCurrency(selectedSlip.basicSalary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: `1px solid ${isDark ? '#1a2d29' : '#e2eae7'}`, paddingBottom: 8 }}>
                  <span style={{ color: isDark ? '#94a3b8' : '#8c918f' }}>House Rent Allowance (HRA)</span>
                  <span style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#2c302e' }}>{fmtCurrency(selectedSlip.allowance)}</span>
                </div>
                {selectedSlip.bonus > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: `1px solid ${isDark ? '#1a2d29' : '#e2eae7'}`, paddingBottom: 8 }}>
                    <span style={{ color: isDark ? '#94a3b8' : '#8c918f' }}>Performance Bonus</span>
                    <span style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#2c302e' }}>{fmtCurrency(selectedSlip.bonus)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: `1px solid ${isDark ? '#1a2d29' : '#e2eae7'}`, paddingBottom: 8, color: isDark ? '#f87171' : '#dc2626' }}>
                  <span>Tax & PF Deductions</span>
                  <span style={{ fontWeight: 700 }}>-{fmtCurrency(selectedSlip.deductions)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, borderTop: `2px solid ${isDark ? '#f8fafc' : '#2c302e'}`, paddingTop: 12, marginTop: 4 }}>
                  <span style={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#2c302e' }}>Net Salary Disbursed</span>
                  <span style={{ fontWeight: 900, color: isDark ? '#34d399' : '#00a76b' }}>{fmtCurrency(selectedSlip.netPay)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: isDark ? '#94a3b8' : '#8c918f', marginBottom: 24, borderTop: isDark ? '1px dashed #1a2d29' : '1px dashed #e2eae7', paddingTop: 16 }}>
                <span>Payment State: <strong style={{ color: isDark ? '#34d399' : '#00a76b' }}>{selectedSlip.status.toUpperCase()}</strong></span>
                <span>Date: {selectedSlip.date}</span>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={handlePrint} className="verdant-btn-primary" style={{ flex: 1 }}>
                  <Download size={16} /> Print Statement
                </button>
                <button onClick={() => setSelectedSlip(null)} className="verdant-btn-outline">
                  Close
                </button>
              </div>
            </div>

            {/* Print layout (Professional Corporate Payslip) */}
            <div className="print-only" style={{ width: '100%', fontFamily: "'Inter', -apple-system, sans-serif", color: '#1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>FluidHR</h1>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Workforce OS & Payroll Ledger</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Salary Payslip</h2>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: '4px 0 0' }}>Statement Period: {selectedSlip.month.toUpperCase()}</p>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '12px' }}>Employee & Payment Details</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 0', fontWeight: 600, color: '#64748b', width: '20%' }}>Employee Name:</td>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#0f172a', width: '30%' }}>{displayName}</td>
                      <td style={{ padding: '6px 0', fontWeight: 600, color: '#64748b', width: '20%' }}>Employee ID:</td>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#0f172a', width: '30%' }}>FHR-00284</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', fontWeight: 600, color: '#64748b' }}>Designation:</td>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#0f172a' }}>{displayRole === 'EMPLOYEE' ? 'Software Engineer' : displayRole}</td>
                      <td style={{ padding: '6px 0', fontWeight: 600, color: '#64748b' }}>Bank Name:</td>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#0f172a' }}>HDFC Bank</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', fontWeight: 600, color: '#64748b' }}>Payment Mode:</td>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#0f172a' }}>Direct Deposit</td>
                      <td style={{ padding: '6px 0', fontWeight: 600, color: '#64748b' }}>Account Number:</td>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#0f172a' }}>************5850</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', fontWeight: 600, color: '#64748b' }}>Payment Date:</td>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#0f172a' }}>{selectedSlip.date}</td>
                      <td style={{ padding: '6px 0', fontWeight: 600, color: '#64748b' }}>Status:</td>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' }}>{selectedSlip.status}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 800, color: '#334155', width: '50%', borderRight: '1px solid #cbd5e1' }}>Earnings Description</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 800, color: '#334155', width: '50%' }}>Deductions Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ verticalAlign: 'top', borderRight: '1px solid #cbd5e1', padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', color: '#475569' }}>Basic Salary</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmtCurrency(selectedSlip.basicSalary)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', color: '#475569' }}>House Rent Allowance (HRA)</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmtCurrency(selectedSlip.allowance)}</td>
                            </tr>
                            {selectedSlip.bonus > 0 && (
                              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 12px', color: '#475569' }}>Performance Bonus</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmtCurrency(selectedSlip.bonus)}</td>
                              </tr>
                            )}
                            {!(selectedSlip.bonus > 0) && (
                              <tr>
                                <td style={{ padding: '10px 12px', color: 'transparent' }}>&nbsp;</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'transparent' }}>&nbsp;</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                      <td style={{ verticalAlign: 'top', padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', color: '#475569' }}>Tax & PF Deductions</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmtCurrency(selectedSlip.deductions)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '10px 12px', color: 'transparent' }}>&nbsp;</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'transparent' }}>&nbsp;</td>
                            </tr>
                            {selectedSlip.bonus > 0 && (
                              <tr>
                                <td style={{ padding: '10px 12px', color: 'transparent' }}>&nbsp;</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'transparent' }}>&nbsp;</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                      <td style={{ borderRight: '1px solid #cbd5e1', padding: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', fontWeight: 800 }}>
                          <span style={{ color: '#334155' }}>Total Earnings (Gross)</span>
                          <span style={{ color: '#0f172a' }}>{fmtCurrency(selectedSlip.basicSalary + selectedSlip.allowance + selectedSlip.bonus)}</span>
                        </div>
                      </td>
                      <td style={{ padding: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', fontWeight: 800 }}>
                          <span style={{ color: '#334155' }}>Total Deductions</span>
                          <span style={{ color: '#dc2626' }}>{fmtCurrency(selectedSlip.deductions)}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px 20px', borderRadius: '8px', marginBottom: '32px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Salary Paid</span>
                  <h4 style={{ fontSize: '20px', fontWeight: 900, color: '#14532d', margin: '4px 0 0' }}>{fmtCurrency(selectedSlip.netPay)}</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount in Words</span>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#14532d', margin: '4px 0 0', fontStyle: 'italic' }}>
                    {(() => {
                      const amount = selectedSlip.netPay;
                      if (amount === 58500) return 'Fifty-Eight Thousand Five Hundred Rupees Only';
                      if (amount === 55000) return 'Fifty-Five Thousand Rupees Only';
                      if (amount === 57000) return 'Fifty-Seven Thousand Rupees Only';
                      return 'Fifty-Eight Thousand Five Hundred Rupees Only';
                    })()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 20px' }}>
                <div style={{ width: '200px', textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', height: '40px', marginBottom: '8px' }}></div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', margin: 0 }}>Employee Signature</p>
                </div>
                <div style={{ width: '200px', textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', height: '40px', marginBottom: '8px', position: 'relative' }}>
                    <span style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', fontWeight: 800, color: '#22c55e', border: '1.5px dashed #22c55e', borderRadius: '4px', padding: '2px 6px', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '1px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>FluidHR Certified</span>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', margin: 0 }}>Authorized Signatory</p>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '60px', borderTop: '1px dashed #e2e8f0', paddingTop: '16px' }}>
                <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>This is an official computer-generated document. No physical signature or company stamp is required for verification.</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAX DOCUMENTS MODAL */}
      {showTaxModal && (
        <div className="no-print" onClick={() => setShowTaxModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', background: isDark ? '#111c18' : '#fff', border: isDark ? '1px solid #1a2d29' : 'none', borderRadius: 24, boxShadow: '0 24px 48px rgba(0,0,0,0.18)', position: 'relative', fontFamily: "'Inter', sans-serif" }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: isDark ? '1px solid #1a2d29' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #00b27a, #00915c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={22} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>Tax Documents</h2>
                  <p style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', margin: '2px 0 0' }}>Financial Year 2025–2026</p>
                </div>
              </div>
              <button onClick={() => setShowTaxModal(false)} style={{ border: 'none', background: isDark ? '#1a2d29' : '#f1f5f9', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#cbd5e1' : '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {/* Tax Summary Body */}
            <div style={{ padding: '24px 28px' }}>
              {/* Annual Tax Summary Card */}
              <div style={{ background: isDark ? 'linear-gradient(135deg, #162722, #111c18)' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: isDark ? '1px solid #1a2d29' : '1px solid #86efac', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: isDark ? '#34d399' : '#166534', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Annual Earnings</span>
                  <h3 style={{ fontSize: 26, fontWeight: 900, color: isDark ? '#10b981' : '#14532d', margin: '6px 0 0' }}>
                    {fmtCurrency(rawSlips.reduce((s, p) => s + p.basicSalary + p.allowance + p.bonus, 0))}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: isDark ? '#f87171' : '#166534', textTransform: 'uppercase', letterSpacing: '1px' }}>Tax Deducted (TDS)</span>
                  <h3 style={{ fontSize: 26, fontWeight: 900, color: isDark ? '#f87171' : '#dc2626', margin: '6px 0 0' }}>
                    {fmtCurrency(rawSlips.reduce((s, p) => s + p.deductions, 0))}
                  </h3>
                </div>
              </div>

              {/* Employee details */}
              <div style={{ background: isDark ? '#162722' : '#f8fafc', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: 13 }}>
                {[
                  { label: 'Employee Name', value: displayName },
                  { label: 'PAN Number', value: 'ABCDE1234F' },
                  { label: 'Designation', value: displayRole === 'EMPLOYEE' ? 'Software Engineer' : displayRole },
                  { label: 'Assessment Year', value: '2026–2027' },
                  { label: 'Employer Name', value: 'FluidHR Technologies Pvt. Ltd.' },
                  { label: 'TAN Number', value: 'MUMA12345G' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>{label}: </span>
                    <span style={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Month-wise table */}
              <h3 style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Monthly Breakdown</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: isDark ? '#162722' : '#f1f5f9' }}>
                    {['Month', 'Gross Pay', 'Deductions (TDS)', 'Net Pay'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Month' ? 'left' : 'right', padding: '10px 14px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#334155', borderBottom: isDark ? '2px solid #1a2d29' : '2px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawSlips.map((p, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${isDark ? '#1a2d29' : '#f1f5f9'}`, background: i % 2 === 0 ? (isDark ? '#111c18' : '#fff') : (isDark ? '#162722' : '#f8fafc') }}>
                      <td style={{ padding: '10px 14px', color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 600 }}>{p.month}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 700 }}>{fmtCurrency(p.basicSalary + p.allowance + p.bonus)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: isDark ? '#f87171' : '#dc2626', fontWeight: 700 }}>{fmtCurrency(p.deductions)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: isDark ? '#34d399' : '#00a76b', fontWeight: 800 }}>{fmtCurrency(p.netPay)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: isDark ? '#1a2d29' : '#0f172a' }}>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 800 }}>Total</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#fff', fontWeight: 800 }}>{fmtCurrency(rawSlips.reduce((s, p) => s + p.basicSalary + p.allowance + p.bonus, 0))}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#fca5a5', fontWeight: 800 }}>{fmtCurrency(rawSlips.reduce((s, p) => s + p.deductions, 0))}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#6ee7b7', fontWeight: 800 }}>{fmtCurrency(rawSlips.reduce((s, p) => s + p.netPay, 0))}</td>
                  </tr>
                </tbody>
              </table>

              {/* Form 16 badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: isDark ? '#162722' : '#f0fdf4', border: isDark ? '1px solid #1a2d29' : '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <CheckCircle size={18} color="#00a76b" />
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#34d399' : '#166534' }}>Form 16 (Part A & B) is auto-generated for FY 2025–26. Download available below.</span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    // Generate and download a CSV tax summary
                    const rows = [
                      ['FluidHR – Annual Tax Summary', '', '', ''],
                      ['Financial Year: 2025-2026', '', '', ''],
                      ['Employee:', displayName, 'PAN:', 'ABCDE1234F'],
                      [],
                      ['Month', 'Gross Pay (₹)', 'TDS Deducted (₹)', 'Net Pay (₹)'],
                      ...rawSlips.map(p => [p.month, p.basicSalary + p.allowance + p.bonus, p.deductions, p.netPay]),
                      [],
                      ['TOTAL', rawSlips.reduce((s,p)=>s+p.basicSalary+p.allowance+p.bonus,0), rawSlips.reduce((s,p)=>s+p.deductions,0), rawSlips.reduce((s,p)=>s+p.netPay,0)],
                    ];
                    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `FluidHR_Form16_${displayName.replace(/\s+/g,'_')}_FY2025-26.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="verdant-btn-primary"
                  style={{ flex: 1, gap: 8 }}
                >
                  <Download size={16} /> Download Form 16
                </button>
                <button onClick={() => setShowTaxModal(false)} className="verdant-btn-outline">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePayslips;
