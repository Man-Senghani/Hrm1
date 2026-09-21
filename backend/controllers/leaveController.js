const Leave = require('../models/Leave');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { isLeaveDatePassed } = require('../utils/leaveUtils');
const LeaveHistory = require('../models/LeaveHistory');
const LeaveBalance = require('../models/LeaveBalance');
const Employee = require('../models/Employee');


const updateLeaveBalanceForUser = async (userId, date) => {
  const m = date.getMonth() + 1;
  const y = date.getFullYear();

  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0, 23, 59, 59);

  const approvedLeaves = await Leave.find({
    user: userId,
    status: 'approved',
    startDate: { $gte: monthStart, $lte: monthEnd }
  });

  const totalUsed = approvedLeaves.reduce((sum, l) => sum + (l.totalDays || 1), 0);

  let balance = await LeaveBalance.findOne({ employeeId: userId, month: m, year: y });
  if (!balance) {
    const prevDate = new Date(y, m - 2, 1);
    const prevM = prevDate.getMonth() + 1;
    const prevY = prevDate.getFullYear();
    const prevBalance = await LeaveBalance.findOne({ employeeId: userId, month: prevM, year: prevY });

    let unusedCasualLeave = 0;
    let prevEarnedLeave = 0;
    let prevSickLeave = 0;
    let prevCompOff = 0;
    let prevOtherLeaves = 0;
    let prevCarryForward = 0;

    if (prevBalance) {
      unusedCasualLeave = prevBalance.casualLeave || 0;
      prevEarnedLeave = prevBalance.earnedLeave || 0;
      prevSickLeave = prevBalance.sickLeave || 0;
      prevCompOff = prevBalance.compOff || 0;
      prevOtherLeaves = prevBalance.otherLeaves || 0;
      prevCarryForward = prevBalance.carryForward || 0;
    }

    const LeavePolicy = require('../models/LeavePolicy');
    const [casualPolicy, earnedPolicy] = await Promise.all([
      LeavePolicy.findOne({ name: /casual/i, status: 'Active' }),
      LeavePolicy.findOne({ name: /earned/i, status: 'Active' })
    ]);

    let annualCasual = 20; // fallback if no policy
    if (casualPolicy && typeof casualPolicy.annualAllowance === 'number') {
      annualCasual = casualPolicy.annualAllowance;
    }

    let monthlyEarnedAccrual = 1.5; // fallback (18 days/year)
    if (earnedPolicy && typeof earnedPolicy.annualAllowance === 'number') {
      monthlyEarnedAccrual = parseFloat((earnedPolicy.annualAllowance / 12).toFixed(2));
    }

    const monthlyCasualAccrual = parseFloat((annualCasual / 12).toFixed(2));

    balance = new LeaveBalance({
      employeeId: userId,
      month: m,
      year: y,
      earnedLeave: prevEarnedLeave + unusedCasualLeave + monthlyEarnedAccrual,
      sickLeave: prevSickLeave,
      casualLeave: monthlyCasualAccrual,
      compOff: prevCompOff,
      otherLeaves: prevOtherLeaves,
      carryForward: prevCarryForward
    });
  }

  balance.usedLeave = totalUsed;
  balance.remainingLeave = (balance.earnedLeave || 0) + (balance.sickLeave || 0) + (balance.casualLeave || 0) + (balance.compOff || 0) + (balance.otherLeaves || 0) + (balance.carryForward || 0) - totalUsed;
  await balance.save();
  return balance;
};

const getAppBaseUrl = (req) => {
  const envUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  if (req) {
    const origin = req.get('origin') || req.get('referer');
    if (origin) {
      try {
        const parsed = new URL(origin);
        return parsed.origin;
      } catch (e) {}
    }
    const host = req.get('host');
    if (host) {
      const protocol = req.protocol || 'http';
      return `${protocol}://${host}`;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://hrm1-1-zli1.onrender.com';
  }

  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
};

const syncApprovedLeaveEffects = async (userId, startDate, endDate, leaveType, io) => {
  try {
    const formatLocalDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = formatLocalDate(new Date());

    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);
    const istStart = new Date(`${todayStr}T00:00:00.000+05:30`);
    const istEnd = new Date(`${todayStr}T23:59:59.999+05:30`);
    const minStart = new Date(Math.min(todayStart.getTime(), istStart.getTime()));
    const maxEnd = new Date(Math.max(todayEnd.getTime(), istEnd.getTime()));

    const leaveStart = new Date(startDate);
    const leaveEnd = new Date(endDate);

    const coversToday = leaveStart <= maxEnd && leaveEnd >= minStart;
    if (!coversToday) return;

    // 1. If today has an active/running TimeTrack session, stop/complete it immediately
    const TimeTrack = require('../models/TimeTrack');
    const now = new Date();
    const session = await TimeTrack.findOne({
      employeeId: userId,
      date: todayStr,
      status: { $in: ['active', 'paused', 'idle'] }
    });

    if (session) {
      if (session.status === 'active' && session.segmentStart) {
        const elapsed = Math.floor((now - new Date(session.segmentStart)) / 1000);
        session.activeTime += Math.max(0, elapsed);
        session.segmentStart = null;
      }
      session.status = 'completed';
      session.isRunning = false;
      session.completedAt = now;
      await session.save();
    }

    // 2. Mark or create today's attendance record with status 'Leave'
    const Attendance = require('../models/Attendance');
    let att = await Attendance.findOne({ user: userId, date: todayStr });
    if (att) {
      att.status = 'Leave';
      if (!att.checkOutTime) {
        att.checkOutTime = now;
        const hours = now.getHours();
        const minutes = now.getMinutes();
        att.clockOut = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      await att.save();
    } else {
      await Attendance.create({
        user: userId,
        date: todayStr,
        status: 'Leave',
        checkInTime: now,
        checkOutTime: now,
        clockIn: '--',
        clockOut: '--',
        totalHours: 0
      });
    }

    // 3. Emit real-time socket events so desktop tracker and web app immediately react
    if (io) {
      const leaveTypeName = leaveType ? (leaveType.charAt(0).toUpperCase() + leaveType.slice(1)) : 'Approved';
      io.to(`user_${userId.toString()}`).emit('timer_stopped', {
        reason: 'leave_approved',
        isOnLeave: true,
        status: 'ON_LEAVE',
        leaveType,
        leaveTypeName,
        message: `You are on approved ${leaveTypeName} Leave today.`
      });
      io.to(`user_${userId.toString()}`).emit('timer_status', {
        hasActiveSession: false,
        status: 'ON_LEAVE',
        isRunning: false,
        isOnLeave: true,
        leaveType,
        leaveTypeName,
        message: `You are on approved ${leaveTypeName} Leave today.`
      });
    }
  } catch (err) {
    console.error('Error in syncApprovedLeaveEffects:', err);
  }
};

const wrapEmailInTemplate = (contentHtml, titleText, targetUrl) => {
  const ctaUrl = targetUrl || getAppBaseUrl();
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${titleText}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f6f8fb;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          background-color: #f6f8fb;
          padding: 40px 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2eae7;
        }
        .header {
          background-color: #08100e;
          padding: 30px;
          text-align: center;
          border-bottom: 3px solid #00a76b;
        }
        .logo {
          color: #ffffff;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
          text-transform: uppercase;
        }
        .logo span {
          color: #00a76b;
        }
        .content {
          padding: 40px 30px;
          color: #334155;
          line-height: 1.6;
          font-size: 15px;
        }
        .content p {
          margin-top: 0;
          margin-bottom: 16px;
        }
        .content ul {
          background-color: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 20px 20px 20px 35px;
          margin: 24px 0;
          list-style-type: square;
        }
        .content li {
          margin-bottom: 10px;
          color: #475569;
        }
        .content li:last-child {
          margin-bottom: 0;
        }
        .cta-container {
          text-align: center;
          margin: 32px 0 16px;
        }
        .cta-button {
          display: inline-block;
          background-color: #00a76b;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 30px;
          font-weight: 700;
          border-radius: 8px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px 30px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
        }
        .footer a {
          color: #00a76b;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1 class="logo">Fluid<span>HR</span></h1>
          </div>
          <div class="content">
            ${contentHtml}
            <div class="cta-container">
              <a href="${ctaUrl}" class="cta-button">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>Sent by FluidHR Workforce OS. All access logged.</p>
            <p>Visit our website at <a href="${ctaUrl}">${ctaUrl}</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const createInAppAndEmailNotification = async (req, { userId, title, message, type, subject, emailHtml }) => {
  try {
    const Notification = require('../models/Notification');
    const User = require('../models/User');
    const sendEmail = require('../utils/sendEmail');

    const notif = await Notification.create({
      userId,
      senderId: req.user.id,
      senderName: req.user.name || 'System',
      senderRole: req.user.role || 'system',
      message: `${title}: ${message}`,
      type: type || 'leave_status'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(userId)}`).emit('new_notification', {
        _id: notif._id,
        message: notif.message,
        type: notif.type,
        read: false,
        senderId: req.user.id,
        senderName: req.user.name || 'System',
        senderRole: req.user.role || 'system',
        createdAt: notif.createdAt
      });
    }

    const targetUser = await User.findById(userId);
    if (targetUser && targetUser.email) {
      const baseUrl = getAppBaseUrl(req);
      let targetDashboardUrl = baseUrl;
      if (targetUser.role === 'admin') targetDashboardUrl += '/admin';
      else if (targetUser.role === 'hr') targetDashboardUrl += '/hr';
      else if (targetUser.role === 'manager') targetDashboardUrl += '/manager';
      else if (targetUser.role === 'employee') targetDashboardUrl += '/employee';

      const finalHtml = wrapEmailInTemplate(emailHtml || `<p>${message}</p>`, subject || title, targetDashboardUrl);
      await sendEmail({
        email: targetUser.email,
        subject: subject || title,
        message: message,
        html: finalHtml
      }).catch(err => {
        console.error(`[EMAIL ERROR] Failed to send email to ${targetUser.email}:`, err.message);
      });
    }
  } catch (err) {
    console.error('[NOTIFICATION ERROR] Failed to create or dispatch notification:', err.message);
  }
};

const getReportingManagerUserId = async (userDoc) => {
  if (!userDoc) return null;
  try {
    const Employee = require('../models/Employee');
    const User = require('../models/User');

    let rawManagerId = userDoc.reportingManager;
    if (!rawManagerId) {
      const empDoc = await Employee.findOne({ userId: userDoc._id || userDoc.id });
      if (empDoc) {
        rawManagerId = empDoc.reportingManager || empDoc.managerId;
      }
    }

    if (!rawManagerId) return null;

    let targetUser = await User.findById(rawManagerId);
    if (targetUser) return targetUser._id;

    const managerEmpDoc = await Employee.findById(rawManagerId);
    if (managerEmpDoc && managerEmpDoc.userId) {
      targetUser = await User.findById(managerEmpDoc.userId);
      if (targetUser) return targetUser._id;
    }
  } catch (err) {
    console.error('Error resolving reporting manager user ID:', err);
  }
  return null;
};

const checkUserLeaveBalance = async (userId, leaveTypeInput, daysRequested, excludeLeaveId = null) => {
  const lType = (leaveTypeInput || '').toLowerCase().trim();

  let quotas = {
    casual: 12,
    sick: 10,
    earned: 20,
    emergency: 5,
    compOff: 3,
    optionalHoliday: 1,
    otherLeaves: 1,
    maternity: 180,
    paternity: 15
  };

  try {
    const LeavePolicy = require('../models/LeavePolicy');
    const activePolicies = await LeavePolicy.find({ status: { $regex: /^active$/i } });
    activePolicies.forEach(p => {
      const type = (p.type || p.name || '').toLowerCase();
      if (type.includes('sick')) quotas.sick = p.annualAllowance || quotas.sick;
      else if (type.includes('casual')) quotas.casual = p.annualAllowance || quotas.casual;
      else if (type.includes('earned') || type.includes('annual')) quotas.earned = p.annualAllowance || quotas.earned;
      else if (type.includes('emergency')) quotas.emergency = p.annualAllowance || quotas.emergency;
      else if (type.includes('maternity')) quotas.maternity = p.annualAllowance || quotas.maternity;
      else if (type.includes('paternity')) quotas.paternity = p.annualAllowance || quotas.paternity;
      else if (type.includes('comp')) quotas.compOff = p.annualAllowance || quotas.compOff;
      else if (type.includes('optional')) quotas.optionalHoliday = p.annualAllowance || quotas.optionalHoliday;
    });
  } catch (_) {}

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let catKey = 'casual';
  let categoryName = 'Casual Leave';

  if (lType.includes('sick') || lType === 'sl') { catKey = 'sick'; categoryName = 'Sick Leave'; }
  else if (lType.includes('earned') || lType.includes('annual') || lType === 'el') { catKey = 'earned'; categoryName = 'Earned Leave'; }
  else if (lType.includes('emergency') || lType === 'eml') { catKey = 'emergency'; categoryName = 'Emergency Leave'; }
  else if (lType.includes('maternity') || lType === 'ml') { catKey = 'maternity'; categoryName = 'Maternity Leave'; }
  else if (lType.includes('paternity') || lType === 'pl') { catKey = 'paternity'; categoryName = 'Paternity Leave'; }
  else if (lType.includes('comp') || lType === 'co') { catKey = 'compOff'; categoryName = 'Compensatory Off'; }
  else if (lType.includes('optional') || lType === 'oh') { catKey = 'optionalHoliday'; categoryName = 'Optional Holiday'; }
  else if (lType.includes('casual') || lType === 'cl') { catKey = 'casual'; categoryName = 'Casual Leave'; }

  let hasBalanceDoc = false;
  let directBalanceVal = 0;

  try {
    const balance = await LeaveBalance.findOne({ employeeId: userId, month, year });
    if (balance) {
      hasBalanceDoc = true;
      if (catKey === 'casual' && balance.casualLeave !== undefined) directBalanceVal = balance.casualLeave;
      else if (catKey === 'sick' && balance.sickLeave !== undefined) directBalanceVal = balance.sickLeave;
      else if (catKey === 'earned' && balance.earnedLeave !== undefined) directBalanceVal = balance.earnedLeave;
      else if (catKey === 'emergency' && balance.emergencyLeave !== undefined) directBalanceVal = balance.emergencyLeave;
      else if (catKey === 'maternity' && balance.maternityLeave !== undefined) directBalanceVal = balance.maternityLeave;
      else if (catKey === 'paternity' && balance.paternityLeave !== undefined) directBalanceVal = balance.paternityLeave;
      else if (catKey === 'compOff' && balance.compOff !== undefined) directBalanceVal = balance.compOff;
      else if (catKey === 'optionalHoliday' && balance.otherLeaves !== undefined) directBalanceVal = balance.otherLeaves;
    }
  } catch (_) {}

  const policyQuota = quotas[catKey] || 0;

  // Calculate actual approved + pending used days for this category in the current year
  const currentYearStart = new Date(year, 0, 1);
  const currentYearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const query = {
    user: userId,
    status: { $in: ['approved', 'pending'] },
    startDate: { $gte: currentYearStart, $lte: currentYearEnd }
  };
  if (excludeLeaveId) query._id = { $ne: excludeLeaveId };
  const existingLeaves = await Leave.find(query);
  const usedDays = existingLeaves.filter(l => {
    const lt = (l.leaveType || '').toLowerCase();
    if (catKey === 'sick') return lt.includes('sick') || lt === 'sl';
    if (catKey === 'earned') return lt.includes('earned') || lt.includes('annual') || lt === 'el';
    if (catKey === 'emergency') return lt.includes('emergency') || lt === 'eml';
    if (catKey === 'maternity') return lt.includes('maternity') || lt === 'ml';
    if (catKey === 'paternity') return lt.includes('paternity') || lt === 'pl';
    if (catKey === 'compOff') return lt.includes('comp') || lt === 'co';
    if (catKey === 'optionalHoliday') return lt.includes('optional') || lt === 'oh';
    return lt.includes('casual') || lt === 'cl';
  }).reduce((sum, l) => sum + (l.totalDays || 1), 0);

  // Determine effective allowance quota (for casual leave, use 1.5/month accrual + 50% carry forward from last year)
  let effectiveQuota = policyQuota;
  if (catKey === 'casual') {
    let casualCarryForward = 0;
    try {
      const prevYear = year - 1;
      const prevYearStart = new Date(prevYear, 0, 1);
      const prevYearEnd = new Date(prevYear, 11, 31, 23, 59, 59, 999);
      const prevLeaves = await Leave.find({
        user: userId,
        status: 'approved',
        startDate: { $gte: prevYearStart, $lte: prevYearEnd }
      });
      const prevUsedCasual = prevLeaves.filter(l => {
        const lt = (l.leaveType || '').toLowerCase();
        return lt.includes('casual') || lt === 'cl';
      }).reduce((sum, l) => sum + (l.totalDays || 1), 0);
      const annualAllowance = policyQuota > 0 ? policyQuota : 18;
      const prevUnused = Math.max(0, annualAllowance - prevUsedCasual);
      casualCarryForward = Number((prevUnused * 0.5).toFixed(1));
    } catch (_) {}

    // For 2026, accrual starts from September (month 9); from 2027 onwards, it starts from January (month 1)
    const startMonth = year === 2026 ? 9 : 1;
    const accrualMonths = month < startMonth ? 0 : (month - startMonth + 1);
    const accruedCasual = Number((accrualMonths * 1.5).toFixed(1));
    effectiveQuota = Number((accruedCasual + casualCarryForward).toFixed(1));
    if (hasBalanceDoc && directBalanceVal > 0) {
      effectiveQuota = Math.max(directBalanceVal, effectiveQuota);
    }
  } else if (hasBalanceDoc && directBalanceVal > 0) {
    effectiveQuota = Math.max(directBalanceVal, policyQuota);
  }

  const remainingBalance = Math.max(0, effectiveQuota - usedDays);
  const isSufficient = remainingBalance >= daysRequested;

  return {
    catKey,
    categoryName,
    totalQuota: effectiveQuota,
    usedDays,
    remainingBalance,
    isSufficient
  };
};

// @desc    Apply for leave
// @route   POST /api/leaves/apply
// @access  Private/Employee
exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, totalDays: inputTotalDays } = req.body;

    const calcDays = (sDate, eDate) => {
      if (!sDate || !eDate) return 1;
      const start = new Date(sDate);
      const end = new Date(eDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return isNaN(diffDays) ? 1 : Math.max(1, diffDays);
    };

    const totalDays = inputTotalDays || calcDays(startDate, endDate);

    if (req.user && req.user.role === 'admin') {
      return res.status(400).json({ message: 'Admin users cannot submit leave requests.' });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Start date cannot be later than end date.' });
    }

    if (isLeaveDatePassed(startDate, endDate)) {
      return res.status(400).json({ message: 'Cannot apply for leave for dates that have already passed.' });
    }

    // 🛡️ OVERLAP CHECK: Ensure user does not already have an active leave for the selected dates
    const reqStart = new Date(startDate);
    reqStart.setHours(0, 0, 0, 0);

    const reqEnd = new Date(endDate || startDate);
    reqEnd.setHours(23, 59, 59, 999);

    const activeStatuses = ['pending', 'manager_approved', 'hr_approved', 'approved', 'cancellation_pending'];
    const existingLeaves = await Leave.find({
      user: req.user.id,
      status: { $in: activeStatuses }
    });

    const hasOverlap = existingLeaves.some(l => {
      const lStart = new Date(l.startDate);
      lStart.setHours(0, 0, 0, 0);
      const lEnd = new Date(l.endDate || l.startDate);
      lEnd.setHours(23, 59, 59, 999);

      return lStart <= reqEnd && lEnd >= reqStart;
    });

    if (hasOverlap) {
      return res.status(400).json({
        message: 'You have already applied for leave on the selected date(s). Overlapping leave requests are not allowed.'
      });
    }

    const employee = await User.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'User not found' });

    // Validate remaining leave balance for requested category
    const check = await checkUserLeaveBalance(req.user.id, leaveType, totalDays || 1);
    if (!check.isSufficient) {
      return res.status(400).json({
        message: `Not enough ${check.categoryName} balance! Available: ${check.remainingBalance} day(s), Requested: ${totalDays || 1} day(s).`
      });
    }

    const managerUserId = await getReportingManagerUserId(employee);

    const leave = await Leave.create({
      user: req.user.id,
      managerId: managerUserId,
      leaveType: leaveType.toLowerCase(),
      startDate,
      endDate,
      reason,
      totalDays: totalDays || 1,
      status: 'pending'
    });

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'employee',
      action: 'Created',
      oldStatus: null,
      newStatus: 'pending',
      reason: reason || ''
    });

    await AuditLog.create({
      userId: employee._id,
      userName: employee.name || 'Unknown User',
      userRole: employee.role || 'employee',
      action: 'Apply Leave',
      module: 'Leave',
      description: `${employee.name || 'User'} applied for ${totalDays || 1} day(s) of ${leaveType} leave.`,
      status: 'Success'
    });

    const senderRoleLabel = employee.role === 'manager' ? 'Manager' : employee.role === 'hr' ? 'HR' : 'Employee';
    const notificationMessage = `${senderRoleLabel} ${employee.name} has submitted a leave request.`;
    const notificationSubject = `${senderRoleLabel} Leave Request Submitted`;

    // 1. If a Manager or HR is requesting leave, notify all Admins and HRs
    if (employee.role === 'manager' || employee.role === 'hr') {
      const adminUsers = await User.find({ role: 'admin' }).select('_id');
      for (const admin of adminUsers) {
        await createInAppAndEmailNotification(req, {
          userId: admin._id,
          title: 'New Leave Request',
          message: notificationMessage,
          type: 'leave_created',
          subject: notificationSubject,
          emailHtml: `<p>Hello,</p>
                      <p>A new leave request has been submitted by ${senderRoleLabel} ${employee.name}.</p>
                      <ul>
                        <li><strong>Leave Type:</strong> ${leaveType}</li>
                        <li><strong>From:</strong> ${new Date(startDate).toLocaleDateString('en-GB')}</li>
                        <li><strong>To:</strong> ${new Date(endDate).toLocaleDateString('en-GB')}</li>
                        <li><strong>Total Days:</strong> ${totalDays || 1}</li>
                        <li><strong>Reason:</strong> ${reason}</li>
                      </ul>`
        });
      }
    } else {
      // 2. If an Employee is requesting leave, notify their Reporting Manager
      if (managerUserId) {
        await createInAppAndEmailNotification(req, {
          userId: managerUserId,
          title: 'New Leave Request',
          message: notificationMessage,
          type: 'leave_created',
          subject: notificationSubject,
          emailHtml: `<p>Hello,</p>
                      <p>A new leave request has been submitted by ${senderRoleLabel} ${employee.name}.</p>
                      <ul>
                        <li><strong>Leave Type:</strong> ${leaveType}</li>
                        <li><strong>From:</strong> ${new Date(startDate).toLocaleDateString('en-GB')}</li>
                        <li><strong>To:</strong> ${new Date(endDate).toLocaleDateString('en-GB')}</li>
                        <li><strong>Total Days:</strong> ${totalDays || 1}</li>
                        <li><strong>Reason:</strong> ${reason}</li>
                      </ul>`
        });
      }
    }

    // 3. Notify the HR Team (only if the applicant is NOT an HR user)
    if (employee.role !== 'hr') {
      const hrUsers = await User.find({ role: 'hr' }).select('_id');
      for (const hr of hrUsers) {
        if (hr._id.toString() !== req.user.id) {
          await createInAppAndEmailNotification(req, {
            userId: hr._id,
            title: 'New Leave Request',
            message: notificationMessage,
            type: 'leave_created',
            subject: notificationSubject,
            emailHtml: `<p>Hello,</p>
                        <p>A new leave request has been submitted by ${senderRoleLabel} ${employee.name}.</p>
                        <ul>
                          <li><strong>Leave Type:</strong> ${leaveType}</li>
                          <li><strong>From:</strong> ${new Date(startDate).toLocaleDateString('en-GB')}</li>
                          <li><strong>To:</strong> ${new Date(endDate).toLocaleDateString('en-GB')}</li>
                          <li><strong>Total Days:</strong> ${totalDays || 1}</li>
                          <li><strong>Reason:</strong> ${reason}</li>
                        </ul>`
          });
        }
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.status(201).json(leave);
  } catch (error) {
    console.error('Apply Leave Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get manager's leaves (all statuses for dashboard)
// @route   GET /api/leaves/manager
// @access  Private/Manager
exports.getManagerLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: { $ne: req.user.id } })
      .populate('user', 'name email profile role employeeId profileImage')
      .lean();
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Manager Approve (FINAL)
// @route   PUT /api/leaves/manager-approve/:id
// @access  Private/Manager
exports.managerApprove = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    if (leave.user && leave.user.toString() === req.user.id.toString()) {
      return res.status(403).json({ message: 'You cannot approve your own leave request. An HR or Admin must approve it.' });
    }

    if (leave.managerId && leave.managerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to approve this leave' });
    }

    if (leave.status === 'approved') {
      return res.status(400).json({ message: 'Leave request is already approved' });
    }

    // Validate employee remaining leave balance for this category
    const check = await checkUserLeaveBalance(leave.user, leave.leaveType, leave.totalDays || 1, leave._id);
    if (!check.isSufficient) {
      return res.status(400).json({
        message: `Not enough ${check.categoryName} balance! Employee has ${check.remainingBalance} day(s) available, requested ${leave.totalDays || 1} day(s).`
      });
    }

    const oldStatus = leave.status;
    leave.status = 'approved';
    await leave.save();

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'manager',
      action: 'Approved',
      oldStatus,
      newStatus: 'approved'
    });

    await updateLeaveBalanceForUser(leave.user, new Date(leave.startDate));
    await syncApprovedLeaveEffects(leave.user, leave.startDate, leave.endDate, leave.leaveType, req.app?.get ? req.app.get('io') : null);

    const approvingUser = await User.findById(req.user.id);
    const leaveUser = await User.findById(leave.user);
    if (approvingUser && leaveUser) {
      await AuditLog.create({
        userId: approvingUser._id,
        userName: approvingUser.name || 'Manager',
        userRole: approvingUser.role || 'manager',
        action: 'Approve Leave',
        module: 'Leave',
        description: `${approvingUser.name || 'Manager'} approved ${leave.totalDays || 1} day(s) leave for ${leaveUser.name || 'User'}.`,
        status: 'Success'
      });
    }

    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    await createInAppAndEmailNotification(req, {
      userId: leave.user,
      title: 'Leave Approved',
      message: `Your leave request from ${formattedStart} to ${formattedEnd} has been approved.`,
      type: 'leave_approved',
      subject: 'Your Leave Request Has Been Approved',
      emailHtml: `<p>Hello ${leaveUser?.name || 'Employee'},</p>
                  <p>Your leave request has been approved.</p>
                  <ul>
                    <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                    <li><strong>From:</strong> ${formattedStart}</li>
                    <li><strong>To:</strong> ${formattedEnd}</li>
                    <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    <li><strong>Approved By:</strong> ${approvingUser?.name || 'Manager'}</li>
                  </ul>
                  <p>You can view your leave details from your HRM dashboard.</p>`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get HR's leaves (Only Employee & Manager leaves)
// @route   GET /api/leaves/hr
// @access  Private/HR
exports.getHRLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: { $ne: req.user.id } })
      .populate('user', 'name email profile role employeeId profileImage')
      .populate('managerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    HR Direct Approve (Alternative)
// @route   PUT /api/leaves/hr-approve/:id
// @access  Private/HR
exports.hrApprove = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    if (leave.status === 'approved' && leave.status !== 'cancellation_pending') {
      return res.status(400).json({ message: 'Leave request is already approved' });
    }

    const oldStatus = leave.status;
    if (oldStatus === 'cancellation_pending') {
      leave.status = 'cancelled';
    } else {
      // Validate employee remaining leave balance for this category
      const check = await checkUserLeaveBalance(leave.user, leave.leaveType, leave.totalDays || 1, leave._id);
      if (!check.isSufficient) {
        return res.status(400).json({
          message: `Not enough ${check.categoryName} balance! Employee has ${check.remainingBalance} day(s) available, requested ${leave.totalDays || 1} day(s).`
        });
      }
      leave.status = 'approved';
    }
    leave.hrId = req.user.id;
    await leave.save();

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'hr',
      action: oldStatus === 'cancellation_pending' ? 'Cancellation Approved' : 'Approved',
      oldStatus,
      newStatus: leave.status
    });

    await updateLeaveBalanceForUser(leave.user, new Date(leave.startDate));
    if (leave.status === 'approved') {
      await syncApprovedLeaveEffects(leave.user, leave.startDate, leave.endDate, leave.leaveType, req.app?.get ? req.app.get('io') : null);
    }

    const approvingUser = await User.findById(req.user.id);
    const leaveUser = await User.findById(leave.user);
    if (approvingUser && leaveUser) {
      await AuditLog.create({
        userId: approvingUser._id,
        userName: approvingUser.name || 'HR',
        userRole: approvingUser.role || 'hr',
        action: oldStatus === 'cancellation_pending' ? 'Approve Leave Cancellation' : 'Approve Leave',
        module: 'Leave',
        description: oldStatus === 'cancellation_pending'
          ? `${approvingUser.name || 'HR'} approved cancellation of ${leave.totalDays || 1} day(s) leave for ${leaveUser.name || 'User'}.`
          : `${approvingUser.name || 'HR'} approved ${leave.totalDays || 1} day(s) leave for ${leaveUser.name || 'User'}.`,
        status: 'Success'
      });
    }

    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    await createInAppAndEmailNotification(req, {
      userId: leave.user,
      title: oldStatus === 'cancellation_pending' ? 'Leave Cancellation Approved' : 'Leave Approved',
      message: oldStatus === 'cancellation_pending'
        ? `Your request to cancel leave from ${formattedStart} to ${formattedEnd} has been approved.`
        : `Your leave request from ${formattedStart} to ${formattedEnd} has been approved.`,
      type: oldStatus === 'cancellation_pending' ? 'leave_cancelled' : 'leave_approved',
      subject: oldStatus === 'cancellation_pending' ? 'Your Leave Cancellation Request Has Been Approved' : 'Your Leave Request Has Been Approved',
      emailHtml: `<p>Hello ${leaveUser?.name || 'Employee'},</p>
                  <p>${oldStatus === 'cancellation_pending' ? 'Your leave cancellation request has been approved.' : 'Your leave request has been approved.'}</p>
                  <ul>
                    <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                    <li><strong>From:</strong> ${formattedStart}</li>
                    <li><strong>To:</strong> ${formattedEnd}</li>
                    <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    <li><strong>Approved By:</strong> ${approvingUser?.name || 'HR'}</li>
                  </ul>
                  <p>You can view your leave details from your HRM dashboard.</p>`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject Leave
// @route   PUT /api/leaves/reject/:id
// @access  Private/Manager/HR
exports.rejectLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    const isHrOrAdmin = ['admin', 'hr'].includes((req.user.role || '').toLowerCase());
    if (leave.user && leave.user.toString() === req.user.id.toString() && !isHrOrAdmin) {
      return res.status(403).json({ message: 'You cannot reject your own leave request. You can cancel it from My Leaves.' });
    }

    if (leave.status === 'rejected' && leave.status !== 'cancellation_pending') {
      return res.status(400).json({ message: 'Leave request is already rejected' });
    }

    const oldStatus = leave.status;
    if (oldStatus === 'cancellation_pending') {
      leave.status = 'approved';
    } else {
      leave.status = 'rejected';
    }

    const reason = req.body.reason || req.body.rejectionReason || '';
    leave.rejectionReason = reason;
    await leave.save();

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'approver',
      action: oldStatus === 'cancellation_pending' ? 'Cancellation Rejected' : 'Rejected',
      oldStatus,
      newStatus: leave.status,
      reason
    });

    await updateLeaveBalanceForUser(leave.user, new Date(leave.startDate));

    const actorUser = await User.findById(req.user.id);
    const leaveUser = await User.findById(leave.user);
    if (actorUser && leaveUser) {
      await AuditLog.create({
        userId: actorUser._id,
        userName: actorUser.name || 'User',
        userRole: actorUser.role || 'approver',
        action: 'Reject Leave',
        module: 'Leave',
        description: `${actorUser.name || 'User'} rejected ${leave.totalDays || 1} day(s) leave for ${leaveUser.name || 'User'}. Reason: ${reason}`,
        status: 'Success'
      });
    }

    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    await createInAppAndEmailNotification(req, {
      userId: leave.user,
      title: oldStatus === 'cancellation_pending' ? 'Leave Cancellation Rejected' : 'Leave Rejected',
      message: oldStatus === 'cancellation_pending'
        ? `Your request to cancel leave from ${formattedStart} to ${formattedEnd} has been rejected.`
        : `Your leave request from ${formattedStart} to ${formattedEnd} has been rejected.`,
      type: 'leave_rejected',
      subject: oldStatus === 'cancellation_pending' ? 'Your Leave Cancellation Request Has Been Rejected' : 'Your Leave Request Has Been Rejected',
      emailHtml: `<p>Hello ${leaveUser?.name || 'Employee'},</p>
                  <p>${oldStatus === 'cancellation_pending' ? 'Your leave cancellation request has been rejected. Your leave remains approved.' : 'Your leave request has been rejected.'}</p>
                  <ul>
                    <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                    <li><strong>From:</strong> ${formattedStart}</li>
                    <li><strong>To:</strong> ${formattedEnd}</li>
                    <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    <li><strong>Rejected By:</strong> ${actorUser?.name || 'Approver'}</li>
                    <li><strong>Reason:</strong> ${reason}</li>
                  </ul>
                  <p>Please contact HR if you need further clarification.</p>`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel Leave
// @route   PUT /api/leaves/cancel/:id
// @access  Private/Employee
exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    // Verify ownership
    if (leave.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot cancel an already processed request' });
    }

    leave.status = 'cancelled';
    await leave.save();

    // Notify manager and HR
    const employee = await User.findById(req.user.id);
    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    const message = `${employee.name} has cancelled their pending leave request from ${formattedStart} to ${formattedEnd}.`;

    const managerUserId = await getReportingManagerUserId(employee);
    if (managerUserId) {
      await createInAppAndEmailNotification(req, {
        userId: managerUserId,
        title: 'Leave Request Cancelled',
        message,
        type: 'leave_cancelled',
        subject: 'Leave Request Cancelled by Employee',
        emailHtml: `<p>Hello,</p>
                    <p>${employee.name} has cancelled their pending leave request.</p>
                    <ul>
                      <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                      <li><strong>From:</strong> ${formattedStart}</li>
                      <li><strong>To:</strong> ${formattedEnd}</li>
                      <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    </ul>`
      });
    }

    const hrUsers = await User.find({ role: 'hr' }).select('_id');
    for (const hr of hrUsers) {
      await createInAppAndEmailNotification(req, {
        userId: hr._id,
        title: 'Leave Request Cancelled',
        message,
        type: 'leave_cancelled',
        subject: 'Leave Request Cancelled by Employee',
        emailHtml: `<p>Hello,</p>
                    <p>${employee.name} has cancelled their pending leave request.</p>
                    <ul>
                      <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                      <li><strong>From:</strong> ${formattedStart}</li>
                      <li><strong>To:</strong> ${formattedEnd}</li>
                      <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    </ul>`
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update / Edit an existing leave request
// @route   PUT /api/leaves/update/:id
// @access  Private
exports.updateLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    const isOwner = leave.user && (leave.user._id || leave.user).toString() === req.user.id.toString();
    const isManagerOrHR = ['manager', 'hr', 'admin'].includes(req.user.role);

    if (!isOwner && !isManagerOrHR) {
      return res.status(403).json({ message: 'Not authorized to edit this leave request' });
    }

    const { leaveType, startDate, endDate, reason, totalDays } = req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Start date cannot be later than end date.' });
    }

    if (startDate || endDate) {
      const targetStart = new Date(startDate || leave.startDate);
      targetStart.setHours(0, 0, 0, 0);

      const targetEnd = new Date(endDate || leave.endDate || targetStart);
      targetEnd.setHours(23, 59, 59, 999);

      const activeStatuses = ['pending', 'manager_approved', 'hr_approved', 'approved', 'cancellation_pending'];
      const existingLeaves = await Leave.find({
        _id: { $ne: leave._id },
        user: leave.user,
        status: { $in: activeStatuses }
      });

      const hasOverlap = existingLeaves.some(l => {
        const lStart = new Date(l.startDate);
        lStart.setHours(0, 0, 0, 0);
        const lEnd = new Date(l.endDate || l.startDate);
        lEnd.setHours(23, 59, 59, 999);

        return lStart <= targetEnd && lEnd >= targetStart;
      });

      if (hasOverlap) {
        return res.status(400).json({
          message: 'You have already applied for leave on the selected date(s). Overlapping leave requests are not allowed.'
        });
      }
    }

    if (leaveType) leave.leaveType = leaveType;
    if (startDate) leave.startDate = startDate;
    if (endDate) leave.endDate = endDate;
    if (reason !== undefined) leave.reason = reason;
    if (totalDays !== undefined) leave.totalDays = totalDays;

    await leave.save();

    try {
      const LeaveHistory = require('../models/LeaveHistory');
      await LeaveHistory.create({
        leaveId: leave._id,
        actorId: req.user.id,
        actorRole: req.user.role || 'user',
        action: 'Updated Description',
        oldStatus: leave.status,
        newStatus: leave.status,
        reason: reason || leave.reason || ''
      });
    } catch (hErr) {
      console.warn('Could not record LeaveHistory for edit:', hErr.message);
    }

    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my leaves
// @route   GET /api/leaves/my
// @access  Private/Employee
exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: req.user.id }).lean();
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my leave quotas dynamically
// @route   GET /api/leaves/my-quotas
// @access  Private/Employee
exports.getMyLeaveQuotas = async (req, res) => {
  try {
    const LeaveBalance = require('../models/LeaveBalance');
    const LeavePolicy = require('../models/LeavePolicy');
    const Leave = require('../models/Leave');
    const Employee = require('../models/Employee');

    let quotas = {
      sick: 0,
      earned: 0,
      casual: 0,
      emergency: 0,
      compOff: 0,
      optionalHoliday: 0,
      otherLeaves: 0,
      casualAccrued: 0,
      casualCarryForward: 0,
      casualAnnualCeiling: 18
    };

    let annualCasualPolicy = 18;

    try {
      const activePolicies = await LeavePolicy.find({ status: { $regex: /^active$/i } });
      activePolicies.forEach(p => {
        const type = (p.type || p.name || '').toLowerCase();
        if (type.includes('sick') && p.annualAllowance > 0) quotas.sick = p.annualAllowance;
        else if (type.includes('casual') && p.annualAllowance > 0) {
          annualCasualPolicy = p.annualAllowance;
          quotas.casualAnnualCeiling = p.annualAllowance;
        }
        else if ((type.includes('earned') || type.includes('annual')) && p.annualAllowance > 0) quotas.earned = p.annualAllowance;
        else if (type.includes('emergency') && p.annualAllowance > 0) quotas.emergency = p.annualAllowance;
        else if (type.includes('comp') && p.annualAllowance > 0) quotas.compOff = p.annualAllowance;
        else if (type.includes('optional') && p.annualAllowance > 0) quotas.optionalHoliday = p.annualAllowance;
      });
    } catch (err) { }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Incremental accrual: in 2026 starts from September (month 9); from 2027 onwards starts from January (month 1)
    const startMonth = year === 2026 ? 9 : 1;
    const accrualMonths = month < startMonth ? 0 : (month - startMonth + 1);
    const accruedCasual = Number((accrualMonths * 1.5).toFixed(1));
    let casualCarryForward = 0;

    try {
      const userId = req.user?._id || req.user?.id;
      if (userId) {
        let userObjId = userId;
        const empDoc = await Employee.findById(userId);
        if (empDoc && empDoc.userId) {
          userObjId = empDoc.userId;
        }

        // Calculate carry forward: 50% of unused casual leaves from previous year
        const prevYear = year - 1;
        const prevYearStart = new Date(prevYear, 0, 1);
        const prevYearEnd = new Date(prevYear, 11, 31, 23, 59, 59, 999);

        const joinDate = empDoc?.joinDate ? new Date(empDoc.joinDate) : null;
        if (!joinDate || joinDate <= prevYearEnd) {
          const prevApprovedCasualLeaves = await Leave.find({
            user: { $in: [userId, userObjId] },
            status: 'approved',
            startDate: { $gte: prevYearStart, $lte: prevYearEnd }
          });
          const prevUsedCasual = prevApprovedCasualLeaves.filter(l => {
            const lt = (l.leaveType || '').toLowerCase();
            return lt.includes('casual') || lt === 'cl';
          }).reduce((sum, l) => sum + (l.totalDays || 1), 0);

          const prevUnused = Math.max(0, annualCasualPolicy - prevUsedCasual);
          casualCarryForward = Number((prevUnused * 0.5).toFixed(1));
        }

        let userBalance = await LeaveBalance.findOne({ employeeId: userObjId, month, year });
        if (!userBalance) {
          userBalance = await LeaveBalance.findOne({ employeeId: userObjId }).sort({ year: -1, month: -1 });
        }

        if (userBalance) {
          if (userBalance.sickLeave !== undefined && userBalance.sickLeave > 0) quotas.sick = userBalance.sickLeave;
          if (userBalance.earnedLeave !== undefined && userBalance.earnedLeave > 0) quotas.earned = userBalance.earnedLeave;
          if (userBalance.emergencyLeave !== undefined && userBalance.emergencyLeave > 0) quotas.emergency = userBalance.emergencyLeave;
          if (userBalance.compOff !== undefined && userBalance.compOff > 0) quotas.compOff = userBalance.compOff;
          if (userBalance.otherLeaves !== undefined && userBalance.otherLeaves > 0) quotas.optionalHoliday = userBalance.otherLeaves;
        }
      }
    } catch (err) { }

    quotas.casualAccrued = accruedCasual;
    quotas.casualCarryForward = casualCarryForward;
    quotas.casual = Number((accruedCasual + casualCarryForward).toFixed(1));

    Object.keys(quotas).forEach(k => {
      quotas[k] = Number(Number(quotas[k] || 0).toFixed(1));
    });

    res.json(quotas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all leaves (Admin / HR)
// @route   GET /api/leaves
// @access  Private/Admin/HR
exports.getAllLeaves = async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role === 'hr') {
      const hrUsers = await User.find({ role: 'hr' }).select('_id');
      const hrIds = hrUsers.map(h => h._id);
      query = { user: { $nin: hrIds } };
    }

    const leaves = await Leave.find(query)
      .populate('user', 'name email profile role employeeId profileImage')
      .populate('managerId', 'name email')
      .lean();
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const Holiday = require('../models/Holiday');

const getSubordinateUserIds = async (user) => {
  const userRole = (user.role || '').toLowerCase();
  const empDoc = await Employee.findOne({ $or: [{ _id: user.id }, { userId: user.id }] });
  const empRole = (empDoc?.role || '').toLowerCase();

  // Admin and HR can view all company personnel
  if (['admin', 'hr'].includes(userRole) || ['admin', 'hr'].includes(empRole)) {
    const allUsers = await User.find({}).select('_id');
    return allUsers.map(u => u._id);
  }

  // Manager: Strictly see direct subordinates (or company employees), NEVER Admin or HR!
  const queryConditions = [{ reportingManager: user.id }, { managerId: user.id }];
  if (empDoc) {
    queryConditions.push({ reportingManager: empDoc._id });
    queryConditions.push({ managerId: empDoc._id });
  }

  // Find direct subordinates who are employees (excluding Admin, HR, and self)
  const subordinates = await User.find({
    $or: queryConditions,
    role: { $nin: ['admin', 'hr'] },
    _id: { $ne: user.id }
  }).select('_id');
  
  let subIds = subordinates.map(s => s._id);

  // If no direct subordinates are specifically assigned yet to this manager, show employees only (never Admin, HR, or self)
  if (subIds.length === 0) {
    const employees = await User.find({
      role: { $nin: ['admin', 'hr'] },
      _id: { $ne: user.id }
    }).select('_id');
    return employees.map(u => u._id);
  }

  return subIds;
};

exports.getManagerStats = async (req, res) => {
  try {
    const subIds = await getSubordinateUserIds(req.user);

    const pending = await Leave.countDocuments({ user: { $in: subIds }, status: { $in: ['pending', 'cancellation_pending'] } });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const onLeaveToday = await Leave.countDocuments({
      user: { $in: subIds },
      status: { $in: ['approved', 'pending', 'cancellation_pending'] },
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    });

    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = await Leave.countDocuments({
      user: { $in: subIds },
      status: { $in: ['approved', 'pending', 'cancellation_pending'] },
      startDate: { $gt: endOfToday, $lte: next7Days }
    });

    const totalEmployees = subIds.length;
    let availableCount = totalEmployees - onLeaveToday;
    if (availableCount < 0) availableCount = 0;
    const availabilityPercent = totalEmployees > 0 ? Math.round((availableCount / totalEmployees) * 100) : 0;

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthRequests = await Leave.countDocuments({
      user: { $in: subIds },
      createdAt: { $gte: currentMonthStart }
    });
    const lastMonthRequests = await Leave.countDocuments({
      user: { $in: subIds },
      createdAt: { $gte: lastMonthStart, $lt: currentMonthStart }
    });

    let growth = 0;
    if (lastMonthRequests > 0) {
      growth = Math.round(((thisMonthRequests - lastMonthRequests) / lastMonthRequests) * 100);
    } else if (thisMonthRequests > 0) {
      growth = 100;
    }

    res.json({
      pending,
      onLeaveToday,
      upcoming,
      availabilityPercent,
      availableCount,
      totalEmployees,
      thisMonthRequests,
      growth
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employees on leave today
// @route   GET /api/leaves/on-leave-today
// @access  Private (Manager / HR / Admin)
exports.getEmployeesOnLeaveToday = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const queryUserIds = await getSubordinateUserIds(req.user);

    const leaves = await Leave.find({
      user: { $in: queryUserIds },
      status: { $in: ['approved', 'pending', 'cancellation_pending'] },
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    }).populate('user', 'name role department email designation');

    const formattedLeaves = leaves.map(l => {
      const startDateStr = new Date(l.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const endDateStr = new Date(l.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return {
        id: l._id,
        name: l.user ? l.user.name : 'Employee',
        role: l.user ? (l.user.designation || l.user.department || l.user.role || 'Team Member') : 'Team Member',
        email: l.user ? l.user.email : '',
        leaveType: l.leaveType || 'Leave',
        startDate: startDateStr,
        endDate: endDateStr,
        totalDays: l.totalDays || 1,
        reason: l.reason || 'No reason provided'
      };
    });

    res.json(formattedLeaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get upcoming leaves for next 7 days
// @route   GET /api/leaves/upcoming-leaves
// @access  Private (Manager / HR / Admin)
exports.getUpcomingLeavesList = async (req, res) => {
  try {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const queryUserIds = await getSubordinateUserIds(req.user);

    const leaves = await Leave.find({
      user: { $in: queryUserIds },
      status: { $in: ['approved', 'pending', 'cancellation_pending'] },
      startDate: { $gt: endOfToday, $lte: next7Days }
    }).populate('user', 'name role department email designation').sort({ startDate: 1 });

    const formattedLeaves = leaves.map(l => {
      const startDateStr = new Date(l.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const endDateStr = new Date(l.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return {
        id: l._id,
        name: l.user ? l.user.name : 'Employee',
        role: l.user ? (l.user.designation || l.user.department || l.user.role || 'Team Member') : 'Team Member',
        email: l.user ? l.user.email : '',
        leaveType: l.leaveType || 'Leave',
        startDate: startDateStr,
        endDate: endDateStr,
        totalDays: l.totalDays || 1,
        reason: l.reason || 'No reason provided'
      };
    });

    res.json(formattedLeaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeamLeaves = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { status, startDate, endDate } = req.query;

    const subIds = await getSubordinateUserIds(req.user);

    const query = { user: { $in: subIds } };

    if (status === 'pending') {
      query.status = { $in: ['pending', 'cancellation_pending'] };
    } else if (status === 'on_leave_today') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      query.status = { $in: ['approved', 'pending', 'cancellation_pending'] };
      query.startDate = { $lte: endOfToday };
      query.endDate = { $gte: startOfToday };
    } else if (status === 'upcoming') {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      query.status = { $in: ['approved', 'pending', 'cancellation_pending'] };
      query.startDate = { $gt: endOfToday, $lte: next7Days };
    } else if (status === 'this_month') {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query.$or = [
        { createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } },
        { startDate: { $gte: currentMonthStart, $lte: currentMonthEnd } },
        { endDate: { $gte: currentMonthStart, $lte: currentMonthEnd } }
      ];
    } else if (status === 'all') {
      // No status filter -> show all requests
    } else if (status) {
      query.status = status;
    } else if (!status) {
      query.status = { $in: ['pending', 'cancellation_pending'] };
    }

    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        query.startDate = query.startDate && typeof query.startDate === 'object' ? { ...query.startDate, $gte: start } : { $gte: start };
      }
    }

    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (!isNaN(end.getTime())) {
        query.endDate = query.endDate && typeof query.endDate === 'object' ? { ...query.endDate, $lte: end } : { $lte: end };
      }
    }

    // Calculate status counts
    const baseQuery = { user: { $in: subIds } };
    const allTeamLeaves = await Leave.find(baseQuery);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const counts = {
      all: allTeamLeaves.length,
      pending: allTeamLeaves.filter(l => l.status === 'pending' || l.status === 'cancellation_pending').length,
      on_leave_today: allTeamLeaves.filter(l => (l.status === 'approved' || l.status === 'pending' || l.status === 'cancellation_pending') && new Date(l.startDate) <= endOfToday && new Date(l.endDate) >= startOfToday).length,
      upcoming: allTeamLeaves.filter(l => (l.status === 'approved' || l.status === 'pending' || l.status === 'cancellation_pending') && new Date(l.startDate) > endOfToday && new Date(l.startDate) <= next7Days).length,
      this_month: allTeamLeaves.filter(l => new Date(l.createdAt) >= currentMonthStart).length,
      approved: allTeamLeaves.filter(l => l.status === 'approved').length,
      cancellation_pending: allTeamLeaves.filter(l => l.status === 'cancellation_pending').length,
      rejected: allTeamLeaves.filter(l => l.status === 'rejected').length,
      cancelled: allTeamLeaves.filter(l => l.status === 'cancelled').length,
    };

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('user', 'name email profileImage department designation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: leaves,
      counts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAvailabilityStats = async (req, res) => {
  try {
    const subIds = await getSubordinateUserIds(req.user);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const leavesToday = await Leave.find({
      user: { $in: subIds },
      status: 'approved',
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    });

    let onLeave = 0;
    let workFromHome = 0;
    let halfDay = 0;
    let absent = 0;

    leavesToday.forEach(l => {
      if (l.leaveType === 'casual') halfDay++;
      else if (l.leaveType === 'sick') absent++;
      else if (l.leaveType === 'emergency') workFromHome++;
      else onLeave++;
    });

    const totalEmployees = subIds.length;
    const totalUnavailable = onLeave + workFromHome + halfDay + absent;
    let available = totalEmployees - totalUnavailable;
    if (available < 0) available = 0;

    res.json({
      available,
      onLeave,
      workFromHome,
      halfDay,
      absent,
      totalEmployees
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getManagerCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = month ? parseInt(month) - 1 : now.getMonth();
    const y = year ? parseInt(year) : now.getFullYear();

    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59);

    const subIds = await getSubordinateUserIds(req.user);

    const leaves = await Leave.find({
      user: { $in: subIds },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).populate('user', 'name profileImage');

    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });

    res.json({ leaves, holidays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaveMonthlyTrend = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const subIds = await getSubordinateUserIds(req.user);

    const leaves = await Leave.aggregate([
      {
        $match: {
          user: { $in: subIds },
          status: 'approved',
          startDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $month: "$startDate" },
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const found = leaves.find(l => l._id === i + 1);
      return {
        month: i + 1,
        count: found ? found.count : 0
      };
    });

    res.json(monthlyTrend);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) - 1 : now.getMonth();
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const subIds = await getSubordinateUserIds(req.user);

    const leaves = await Leave.find({
      user: { $in: subIds },
      status: 'approved',
      startDate: { $gte: startDate, $lte: endDate }
    }).populate('user', 'department');

    const deptMap = {};
    leaves.forEach(l => {
      const dept = l.user?.department || 'Unassigned';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const departmentAnalytics = Object.keys(deptMap).map(d => ({
      department: d,
      count: deptMap[d]
    }));

    res.json(departmentAnalytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.bulkApproveLeaves = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const leaves = await Leave.find({ _id: { $in: ids } });

    for (const leave of leaves) {
      if (leave.user && leave.user.toString() === req.user.id.toString()) {
        continue; // skip self
      }
      if (leave.managerId && leave.managerId.toString() !== req.user.id) {
        continue; // skip if not authorized
      }
      leave.status = 'approved';
      await leave.save();
      await syncApprovedLeaveEffects(leave.user, leave.startDate, leave.endDate, leave.leaveType, req.app?.get ? req.app.get('io') : null);
    }

    res.json({ success: true, message: `${leaves.length} leaves approved` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportTeamLeaves = async (req, res) => {
  try {
    const { format, status, leaveType, startDate, endDate, employeeId } = req.query; // pdf or xlsx

    const formatDateSafe = (d) => {
      if (!d) return 'N/A';
      try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return 'N/A';
        return dateObj.toISOString().split('T')[0];
      } catch (e) {
        return 'N/A';
      }
    };

    const subIds = await getSubordinateUserIds(req.user);

    const query = { user: { $in: subIds } };

    if (employeeId && employeeId !== 'all') {
      query.user = employeeId;
    }

    if (status && status !== 'all') {
      if (status === 'pending') {
        query.status = { $in: ['pending', 'cancellation_pending'] };
      } else {
        query.status = status;
      }
    }

    if (leaveType && leaveType !== 'all') {
      query.leaveType = leaveType;
    }

    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        query.startDate = { $gte: s };
      }
    }

    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (!isNaN(e.getTime())) {
        query.endDate = query.endDate ? { ...query.endDate, $lte: e } : { $lte: e };
      }
    }

    const leaves = await Leave.find(query)
      .populate('user', 'name email department')
      .sort({ startDate: -1 });

    if (format === 'xlsx' || format === 'excel') {
      const exceljs = require('exceljs');
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Leaves');

      worksheet.columns = [
        { header: 'Employee', key: 'employee', width: 20 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Start Date', key: 'start', width: 15 },
        { header: 'End Date', key: 'end', width: 15 },
        { header: 'Duration', key: 'duration', width: 10 },
        { header: 'Reason', key: 'reason', width: 30 }
      ];

      leaves.forEach(l => {
        worksheet.addRow({
          employee: l.user ? l.user.name : 'Unknown',
          type: l.leaveType,
          status: l.status,
          start: formatDateSafe(l.startDate),
          end: formatDateSafe(l.endDate),
          duration: l.totalDays,
          reason: l.reason
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=team_leaves.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    } else if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=team_leaves.pdf');

      doc.pipe(res);
      doc.fontSize(20).text('Team Leaves Report', { align: 'center' });
      doc.moveDown();

      leaves.forEach(l => {
        const empName = l.user ? l.user.name : 'Unknown';
        doc.fontSize(12).text(`${empName} - ${l.leaveType} (${l.status})`);
        doc.fontSize(10).text(`Dates: ${formatDateSafe(l.startDate)} to ${formatDateSafe(l.endDate)}`);
        doc.text(`Reason: ${l.reason || 'None'}`);
        doc.moveDown();
      });

      doc.end();
    } else {
      let csv = 'Employee Name,Email,Leave Type,Start Date,End Date,Total Days,Status,Reason\n';
      leaves.forEach(l => {
        const name = `"${l.user?.name || ''}"`;
        const email = `"${l.user?.email || ''}"`;
        const type = `"${l.leaveType || ''}"`;
        const start = `"${l.startDate ? new Date(l.startDate).toISOString().split('T')[0] : ''}"`;
        const end = `"${l.endDate ? new Date(l.endDate).toISOString().split('T')[0] : ''}"`;
        const days = l.totalDays || 1;
        const status = `"${l.status || ''}"`;
        const reason = `"${(l.reason || '').replace(/"/g, '""')}"`;
        csv += `${name},${email},${type},${start},${end},${days},${status},${reason}\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="team_leaves.csv"');
      return res.send(csv);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Allocate Leave (Admin/HR)
// @route   POST /api/leaves/allocate
// @access  Private/HR/Admin
exports.allocateLeave = async (req, res) => {
  try {
    const { userId, leaveType, days, action, reason } = req.body;
    const numDays = parseFloat(days);

    const LeaveAllocationHistory = require('../models/LeaveAllocationHistory');

    let targetUserIds = [];
    const Employee = require('../models/Employee');

    if (userId === 'all') {
      const allUsers = await User.find({ role: { $in: ['employee', 'manager', 'hr', 'admin'] } });
      targetUserIds = allUsers.map(u => u._id);
    } else if (userId === 'managers') {
      const managers = await User.find({ role: 'manager' });
      targetUserIds = managers.map(u => u._id);
    } else if (userId === 'employees') {
      const employees = await User.find({ role: 'employee' });
      targetUserIds = employees.map(u => u._id);
    } else if (userId === 'hr') {
      const hrs = await User.find({ role: 'hr' });
      targetUserIds = hrs.map(u => u._id);
    } else {
      const empDoc = await Employee.findById(userId);
      if (empDoc && empDoc.userId) {
        targetUserIds = [empDoc.userId];
      } else {
        targetUserIds = [userId];
      }
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ message: 'No target employees/managers found for allocation' });
    }

    let balanceField = 'otherLeaves';
    if (leaveType === 'casual') balanceField = 'casualLeave';
    else if (leaveType === 'sick') balanceField = 'sickLeave';
    else if (leaveType === 'earned') balanceField = 'earnedLeave';
    else if (leaveType === 'emergency') balanceField = 'emergencyLeave';
    else if (leaveType === 'compOff') balanceField = 'compOff';
    else if (leaveType === 'other' || leaveType === 'optional') balanceField = 'otherLeaves';

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const defaultBase = {
      casualLeave: 0,
      sickLeave: 0,
      earnedLeave: 0,
      emergencyLeave: 0,
      compOff: 0,
      otherLeaves: 0
    };

    const promises = targetUserIds.map(async (targetId) => {
      let balance = await LeaveBalance.findOne({ employeeId: targetId, month, year });

      if (!balance) {
        balance = new LeaveBalance({
          employeeId: targetId,
          month,
          year,
          ...defaultBase
        });
      }

      const currentVal = balance[balanceField];
      const oldDays = (currentVal !== undefined && currentVal > 0) ? currentVal : (defaultBase[balanceField] || 0);
      let newDays = oldDays;

      if (action === 'add') {
        newDays = oldDays + numDays;
      } else if (action === 'deduct') {
        newDays = oldDays - numDays;
        if (newDays < 0) {
          if (targetUserIds.length > 1) {
            newDays = 0;
          } else {
            throw new Error('Cannot deduct more leaves than the current balance');
          }
        }
      } else if (action === 'set') {
        newDays = numDays;
      }

      balance[balanceField] = newDays;
      balance.remainingLeave = (balance.earnedLeave || 0) + (balance.sickLeave || 0) + (balance.casualLeave || 0) + (balance.emergencyLeave || 0) + (balance.compOff || 0) + (balance.otherLeaves || 0) + (balance.carryForward || 0) - (balance.usedLeave || 0);

      await balance.save();

      await LeaveAllocationHistory.create({
        employeeId: targetId,
        leaveType,
        oldAllocatedDays: oldDays,
        newAllocatedDays: newDays,
        changedBy: req.user.id,
        reason: reason || 'HR Allocation Adjustment'
      });
    });

    try {
      await Promise.all(promises);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    res.json({ message: 'Leave allocated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.hrOverride = async (req, res) => {
  try {
    const { targetStatus, reason } = req.body;
    if (!['approved', 'rejected'].includes(targetStatus)) {
      return res.status(400).json({ message: 'Invalid target status. Must be approved or rejected.' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    if (leave.status === targetStatus) {
      return res.status(400).json({ message: `Leave is already in ${targetStatus} status.` });
    }

    const oldStatus = leave.status;
    leave.status = targetStatus;
    if (targetStatus === 'rejected') {
      leave.rejectionReason = reason || 'HR Override';
    }
    await leave.save();

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'hr',
      action: 'Override',
      oldStatus,
      newStatus: targetStatus,
      reason: reason || 'HR Override'
    });

    await updateLeaveBalanceForUser(leave.user, new Date(leave.startDate));
    if (targetStatus === 'approved') {
      await syncApprovedLeaveEffects(leave.user, leave.startDate, leave.endDate, leave.leaveType, req.app?.get ? req.app.get('io') : null);
    }

    const actorUser = await User.findById(req.user.id);
    const leaveUser = await User.findById(leave.user);
    if (actorUser && leaveUser) {
      await AuditLog.create({
        userId: actorUser._id,
        userName: actorUser.name || 'HR',
        userRole: actorUser.role || 'hr',
        action: 'Override Leave',
        module: 'Leave',
        description: `${actorUser.name || 'HR'} overrode leave status for ${leaveUser.name || 'User'} from ${oldStatus} to ${targetStatus}. Reason: ${reason}`,
        status: 'Success'
      });
    }

    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    await createInAppAndEmailNotification(req, {
      userId: leave.user,
      title: 'Leave Status Overridden',
      message: `Your leave request from ${formattedStart} to ${formattedEnd} has been changed to ${targetStatus} by HR.`,
      type: 'leave_overridden',
      subject: `Your Leave Request Has Been ${targetStatus === 'approved' ? 'Approved' : 'Rejected'} (Override)`,
      emailHtml: `<p>Hello ${leaveUser?.name || 'Employee'},</p>
                  <p>Your leave request has been overrode to <strong>${targetStatus}</strong> by HR.</p>
                  <ul>
                    <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                    <li><strong>From:</strong> ${formattedStart}</li>
                    <li><strong>To:</strong> ${formattedEnd}</li>
                    <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                    <li><strong>Overridden By:</strong> ${actorUser?.name || 'HR'}</li>
                    <li><strong>Reason:</strong> ${reason || 'HR Override'}</li>
                  </ul>
                  <p>You can view your updated leave balance on the dashboard.</p>`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaveHistory = async (req, res) => {
  try {
    const LeaveHistory = require('../models/LeaveHistory');
    const history = await LeaveHistory.find({ leaveId: req.params.id })
      .populate('actorId', 'name role')
      .sort({ createdAt: 1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request Leave Cancellation
// @route   POST /api/leaves/request-cancellation/:id
// @access  Private/Employee
exports.requestLeaveCancellation = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    if (leave.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to request cancellation' });
    }

    if (leave.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved leaves can request cancellation' });
    }

    const oldStatus = leave.status;
    leave.status = 'cancellation_pending';
    leave.cancellationReason = req.body.cancellationReason;
    await leave.save();

    const LeaveHistory = require('../models/LeaveHistory');
    await LeaveHistory.create({
      leaveId: leave._id,
      actorId: req.user.id,
      actorRole: req.user.role || 'employee',
      action: 'Cancellation Requested',
      oldStatus,
      newStatus: 'cancellation_pending',
      reason: req.body.cancellationReason || ''
    });

    // Notify manager and HR
    const employee = await User.findById(req.user.id);
    const formattedStart = new Date(leave.startDate).toLocaleDateString('en-GB');
    const formattedEnd = new Date(leave.endDate).toLocaleDateString('en-GB');
    const message = `${employee.name} has requested cancellation for their approved leave from ${formattedStart} to ${formattedEnd}.`;

    const managerUserId = await getReportingManagerUserId(employee);
    if (managerUserId) {
      await createInAppAndEmailNotification(req, {
        userId: managerUserId,
        title: 'Leave Cancellation Requested',
        message,
        type: 'leave_cancellation_requested',
        subject: 'Leave Cancellation Requested by Employee',
        emailHtml: `<p>Hello,</p>
                    <p>${employee.name} has requested to cancel their approved leave request.</p>
                    <ul>
                      <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                      <li><strong>From:</strong> ${formattedStart}</li>
                      <li><strong>To:</strong> ${formattedEnd}</li>
                      <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                      <li><strong>Cancellation Reason:</strong> ${req.body.cancellationReason || 'Not specified'}</li>
                    </ul>`
      });
    }

    const hrUsers = await User.find({ role: 'hr' }).select('_id');
    for (const hr of hrUsers) {
      await createInAppAndEmailNotification(req, {
        userId: hr._id,
        title: 'Leave Cancellation Requested',
        message,
        type: 'leave_cancellation_requested',
        subject: 'Leave Cancellation Requested by Employee',
        emailHtml: `<p>Hello,</p>
                    <p>${employee.name} has requested to cancel their approved leave request.</p>
                    <ul>
                      <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
                      <li><strong>From:</strong> ${formattedStart}</li>
                      <li><strong>To:</strong> ${formattedEnd}</li>
                      <li><strong>Total Days:</strong> ${leave.totalDays}</li>
                      <li><strong>Cancellation Reason:</strong> ${req.body.cancellationReason || 'Not specified'}</li>
                    </ul>`
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👨‍💼 MANAGER TEAM LEAVES CONTROLLER ENDPOINTS
// ==========================================

// @desc    Get team pending/filtered leave requests for Manager Dashboard
// @route   GET /api/leaves/manager/pending
// @access  Private/Manager/HR/Admin
exports.getTeamLeaves = async (req, res) => {
  try {
    const subIds = await getSubordinateUserIds(req.user);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, startDate, endDate } = req.query;

    let query = { user: { $in: subIds } };
    if (status && status !== 'all' && status !== 'this_month') {
      query.status = status;
    } else if (status === 'this_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      query.createdAt = { $gte: firstDay, $lte: lastDay };
    }

    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('user', 'name email role employeeId profileImage department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const allSubLeaves = await Leave.find({ user: { $in: subIds } }).lean();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const counts = {
      all: allSubLeaves.length,
      this_month: allSubLeaves.filter(l => new Date(l.createdAt) >= firstDay && new Date(l.createdAt) <= lastDay).length,
      approved: allSubLeaves.filter(l => l.status === 'approved').length,
      cancellation_pending: allSubLeaves.filter(l => l.status === 'cancellation_pending').length,
      rejected: allSubLeaves.filter(l => l.status === 'rejected').length,
      cancelled: allSubLeaves.filter(l => l.status === 'cancelled').length
    };

    res.json({
      success: true,
      data: leaves,
      counts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get team availability statistics
// @route   GET /api/leaves/manager/availability
// @access  Private/Manager/HR/Admin
exports.getAvailabilityStats = async (req, res) => {
  try {
    const subIds = await getSubordinateUserIds(req.user);
    const totalEmployees = subIds.length;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const activeLeavesToday = await Leave.find({
      user: { $in: subIds },
      status: 'approved',
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    }).lean();

    const onLeaveCount = activeLeavesToday.length;
    const available = Math.max(0, totalEmployees - onLeaveCount);

    res.json({
      totalEmployees,
      available,
      onLeave: onLeaveCount,
      workFromHome: 0,
      halfDay: 0,
      absent: 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get manager team calendar events
// @route   GET /api/leaves/manager/calendar
// @access  Private/Manager/HR/Admin
exports.getManagerCalendar = async (req, res) => {
  try {
    const subIds = await getSubordinateUserIds(req.user);
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [leaves, holidays] = await Promise.all([
      Leave.find({
        user: { $in: subIds },
        status: { $in: ['approved', 'pending'] },
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }).populate('user', 'name email role').lean(),
      Holiday.find({
        date: { $gte: startDate, $lte: endDate }
      }).lean()
    ]);

    res.json({ leaves, holidays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get team members' leave balances
// @route   GET /api/leaves/manager/balances
// @access  Private/Manager/HR/Admin
exports.getTeamLeaveBalances = async (req, res) => {
  try {
    const subIds = await getSubordinateUserIds(req.user);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const isManager = req.user?.role !== 'admin' && req.user?.role !== 'hr';
    const filterQuery = { _id: { $in: subIds } };
    if (isManager) {
      filterQuery.role = { $nin: ['admin', 'hr'] };
    }

    const total = await User.countDocuments(filterQuery);
    const employees = await User.find(filterQuery)
      .select('name email role employeeId profileImage department')
      .skip(skip)
      .limit(limit)
      .lean();
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const balances = await Promise.all(employees.map(async (emp) => {
      let b = await LeaveBalance.findOne({ employeeId: emp._id, month, year }).lean();

      let calculatedCasual = 0;
      if (year === 2026) {
        calculatedCasual = month >= 9 ? Number(((month - 8) * 1.5).toFixed(1)) : 0;
      } else if (year > 2026) {
        calculatedCasual = Number((month * 1.5).toFixed(1));
      } else {
        calculatedCasual = 0;
      }

      const clAlloc = calculatedCasual || b?.casualLeave || 1.5;
      const slAlloc = 12;

      return {
        _id: emp._id,
        user: emp,
        employeeId: emp,
        cl: b?.usedLeave?.casual ?? 0,
        sl: b?.usedLeave?.sick ?? 0,
        totalCL: clAlloc,
        totalSL: slAlloc,
        totalLeave: clAlloc + slAlloc,
        earnedLeave: b?.earnedLeave ?? 0,
        sickLeave: b?.sickLeave ?? 0,
        casualLeave: clAlloc,
        compOff: b?.compOff ?? 0,
        otherLeaves: b?.otherLeaves ?? 0,
        usedLeave: {
          total: (b?.usedLeave?.casual || 0) + (b?.usedLeave?.sick || 0) + (typeof b?.usedLeave === 'number' ? b.usedLeave : 0),
          casual: b?.usedLeave?.casual || 0,
          sick: b?.usedLeave?.sick || 0
        }
      };
    }));

    res.json({
      success: true,
      data: balances,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get monthly leave trends for manager dashboard
// @route   GET /api/leaves/manager/monthly-trend
// @access  Private/Manager/HR/Admin
exports.getLeaveMonthlyTrend = async (req, res) => {
  try {
    const subIds = await getSubordinateUserIds(req.user);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const trend = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const mStart = new Date(y, mIdx, 1);
      const mEnd = new Date(y, mIdx + 1, 0, 23, 59, 59);

      const [approved, pending] = await Promise.all([
        Leave.countDocuments({ user: { $in: subIds }, status: 'approved', createdAt: { $gte: mStart, $lte: mEnd } }),
        Leave.countDocuments({ user: { $in: subIds }, status: 'pending', createdAt: { $gte: mStart, $lte: mEnd } })
      ]);

      trend.push({
        month: months[mIdx],
        approved,
        pending
      });
    }

    res.json(trend);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get department leave analytics for manager dashboard
// @route   GET /api/leaves/manager/department-analytics
// @access  Private/Manager/HR/Admin
exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const subIds = await getSubordinateUserIds(req.user);
    const leaves = await Leave.find({ user: { $in: subIds }, status: 'approved' })
      .populate('user', 'department')
      .lean();

    const deptMap = {};
    leaves.forEach(l => {
      const dept = l.user?.department || 'General';
      deptMap[dept] = (deptMap[dept] || 0) + (l.totalDays || 1);
    });

    const data = Object.keys(deptMap).map(d => ({
      department: d,
      count: deptMap[d],
      leaves: deptMap[d]
    }));

    if (data.length === 0) {
      data.push({ department: 'General', count: 0, leaves: 0 });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk approve pending leaves
// @route   PUT /api/leaves/manager/bulk-approve
// @access  Private/Manager/HR/Admin
exports.bulkApproveLeaves = async (req, res) => {
  try {
    const targetIds = leaveIds || req.body.ids;
    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      return res.status(400).json({ message: 'No leave IDs provided.' });
    }

    const isHrOrAdmin = ['admin', 'hr'].includes((req.user.role || '').toLowerCase());
    const filterQuery = {
      _id: { $in: targetIds },
      status: { $in: ['pending', 'cancellation_pending'] }
    };
    if (!isHrOrAdmin) {
      filterQuery.user = { $ne: req.user.id };
    }

    const leavesToApprove = await Leave.find(filterQuery);
    const updated = await Leave.updateMany(
      filterQuery,
      { $set: { status: 'approved' } }
    );

    for (const l of leavesToApprove) {
      await syncApprovedLeaveEffects(l.user, l.startDate, l.endDate, l.leaveType, req.app?.get ? req.app.get('io') : null);
    }

    res.json({ success: true, message: `${updated.modifiedCount} leave(s) approved successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
