const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// Helper to compute local date and minutes from midnight in Asia/Kolkata (IST), independent of server timezone (UTC on Render/AWS)
const getTimeDetails = (date = new Date(), timeZone = 'Asia/Kolkata') => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const getPart = type => parts.find(p => p.type === type)?.value;

  const yyyy = getPart('year');
  const mm = getPart('month');
  const dd = getPart('day');
  const hours = parseInt(getPart('hour') || '0', 10);
  const minutes = parseInt(getPart('minute') || '0', 10);

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeInMinutes = hours * 60 + minutes;

  return { dateStr, hours, minutes, timeInMinutes };
};

// @desc    Clock In / Check In
// @route   POST /api/attendance/checkin
exports.checkIn = async (req, res) => {
  try {
    const checkInTime = new Date();
    const { dateStr: today, timeInMinutes, hours, minutes } = getTimeDetails(checkInTime);

    // Check if already checked in today
    const existing = await Attendance.findOne({ user: req.user.id, date: today });
    if (existing) {
      return res.status(400).json({ message: 'Already checked in for today.' });
    }

    let status = 'Present';
    if (timeInMinutes >= 14 * 60 + 30) { // 2:30 PM
      status = 'Half Day';
    } else if (timeInMinutes >= 10 * 60 + 30) { // 10:30 AM
      status = 'Late';
    }

    const clockInStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const attendance = await Attendance.create({
      user: req.user.id,
      date: today,
      checkInTime,
      clockIn: clockInStr,
      status
    });

    // Sync with TimeTrack model (if the user checked in from Attendance dashboard, start time tracker)
    try {
      const TimeTrack = require('../models/TimeTrack');
      const employee = await Employee.findOne({ user: req.user.id });

      const existingSession = await TimeTrack.findOne({ employeeId: req.user.id, date: today });
      if (!existingSession) {
        const newSession = await TimeTrack.create({
          employeeId: req.user.id,
          employeeRole: employee ? employee.role : 'employee',
          date: today,
          status: 'active',
          isRunning: true,
          startTime: checkInTime,
          segmentStart: checkInTime,
          sessions: [{ start: checkInTime }]
        });

        // Notify via socket
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${req.user.id}`).emit('timer_started', {
            hasActiveSession: true,
            status: 'active',
            isRunning: true,
            activeTime: 0
          });
        }
      }
    } catch (ttErr) {
      console.error('Error syncing TimeTrack on checkin:', ttErr);
    }

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clock Out / Check Out
// @route   POST /api/attendance/checkout
exports.checkOut = async (req, res) => {
  try {
    const checkOutTime = new Date();
    const { dateStr: today, hours, minutes } = getTimeDetails(checkOutTime);
    let attendance = await Attendance.findOne({ user: req.user.id, date: today });
    if (!attendance) {
      attendance = await Attendance.findOne({ user: req.user.id, checkOutTime: null }).sort({ checkInTime: -1 });
    }

    if (!attendance) {
      return res.status(404).json({ message: 'No check-in record found for today.' });
    }
    if (attendance.checkOutTime) {
      return res.status(400).json({ message: 'Already checked out for today.' });
    }

    const clockOutStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    attendance.checkOutTime = checkOutTime;
    attendance.clockOut = clockOutStr;

    // Calculate total hours
    const diffMs = checkOutTime - new Date(attendance.checkInTime);
    attendance.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    await attendance.save();

    // Sync with TimeTrack model (if the user checked out from Attendance dashboard, gracefully stop any running time tracker)
    try {
      const TimeTrack = require('../models/TimeTrack');
      const session = await TimeTrack.findOne({
        employeeId: req.user.id, status: { $in: ['active', 'paused', 'idle'] }
      }).sort({ createdAt: -1 });

      if (session) {
        if (session.status === 'active' && session.segmentStart) {
          const elapsed = (checkOutTime - new Date(session.segmentStart)) / 1000;
          session.activeTime += Math.max(0, Math.floor(elapsed));
        }
        session.segmentStart = null;
        session.endTime = checkOutTime;
        session.status = 'completed';
        session.isRunning = false;

        const lastIdx = session.sessions.length - 1;
        if (lastIdx >= 0 && !session.sessions[lastIdx].pause && !session.sessions[lastIdx].end) {
          session.sessions[lastIdx].end = checkOutTime;
        }
        await session.save();

        // Notify via socket
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${req.user.id}`).emit('timer_stopped', {
            hasActiveSession: false,
            status: 'completed',
            isRunning: false,
            activeTime: Math.floor(session.activeTime || 0)
          });
        }

        // Use session activeTime if it exists
        if (session.activeTime) {
          attendance.totalHours = parseFloat((session.activeTime / 3600).toFixed(4));
        }
      }
    } catch (ttErr) {
      console.error('Error syncing TimeTrack on checkout:', ttErr);
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Override/Reopen Checkout (HR / Manager / Admin)
// @route   POST /api/attendance/override-checkout/:userId
exports.overrideCheckout = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ user: targetUserId, date: today });
    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found for today to override.' });
    }

    // Clear checkout time
    attendance.checkOutTime = null;
    await attendance.save();

    // Reopen TimeTrack session
    try {
      const TimeTrack = require('../models/TimeTrack');
      let session = await TimeTrack.findOne({ employeeId: targetUserId, date: today }).sort({ createdAt: -1 });

      const now = new Date();
      if (session) {
        session.status = 'active';
        session.isRunning = true;
        session.endTime = null;
        session.segmentStart = now;
        session.lastHeartbeat = now;
        session.sessions.push({ start: now });
        await session.save();

        const io = req.app.get('io');
        if (io) {
          io.to(`user_${targetUserId}`).emit('timer_resumed', {
            hasActiveSession: true,
            status: 'active',
            isRunning: true,
            activeTime: Math.floor(session.activeTime || 0),
            idleTime: Math.floor(session.idleTime || 0),
            segmentStart: now
          });
        }
      }
    } catch (ttErr) {
      console.error('[OVERRIDE CHECKOUT TIME TRACK SYNC ERROR]', ttErr);
    }

    res.json({ message: 'Checkout overridden successfully. Session reopened.', attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const buildEmployeeAttendanceHistory = async (userId) => {
  const User = require('../models/User');
  const Employee = require('../models/Employee');
  const Leave = require('../models/Leave');

  const user = await User.findById(userId).select('name role email joinDate createdAt');
  if (!user) return [];

  const employee = await Employee.findOne({ userId });

  const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const todayStr = formatLocalDate(now);

  let joinDate = null;
  if (employee && employee.joinDate) joinDate = new Date(employee.joinDate);
  else if (user.joinDate) joinDate = new Date(user.joinDate);
  else if (user.createdAt) joinDate = new Date(user.createdAt);

  const defaultStart = new Date(now.getFullYear(), 0, 1);
  const startDate = joinDate && joinDate > defaultStart ? joinDate : defaultStart;
  startDate.setHours(0, 0, 0, 0);

  const startStr = formatLocalDate(startDate);

  const attendanceRecords = await Attendance.find({
    user: userId,
    date: { $gte: startStr, $lte: todayStr }
  }).lean();

  const TimeTrack = require('../models/TimeTrack');
  const timeTrackRecords = await TimeTrack.find({
    employeeId: userId,
    date: { $gte: startStr, $lte: todayStr }
  }).lean();

  const approvedLeaves = await Leave.find({
    user: userId,
    status: 'approved',
    $or: [
      { startDate: { $gte: startDate, $lte: now } },
      { endDate: { $gte: startDate, $lte: now } },
      { startDate: { $lte: startDate }, endDate: { $gte: now } }
    ]
  }).lean();

  const fullLogs = [];

  for (
    let d = new Date(startDate);
    d <= now;
    d.setDate(d.getDate() + 1)
  ) {
    const dStr = formatLocalDate(d);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    const existingAtt = attendanceRecords.find(r => r.date === dStr);

    if (existingAtt) {
      let clockInStr = existingAtt.clockIn || '--';
      if (existingAtt.checkInTime) {
        const { hours, minutes } = getTimeDetails(new Date(existingAtt.checkInTime));
        clockInStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      let clockOutStr = existingAtt.clockOut || '--';
      if (existingAtt.checkOutTime) {
        const { hours, minutes } = getTimeDetails(new Date(existingAtt.checkOutTime));
        clockOutStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }

      const tt = timeTrackRecords.find(t => t.date === dStr);
      let hoursVal = existingAtt.totalHours;
      let activeSecs = null;
      let effectiveCheckOutTime = existingAtt.checkOutTime;

      if (tt) {
        if (tt.endTime && (!effectiveCheckOutTime || new Date(tt.endTime) > new Date(effectiveCheckOutTime))) {
          effectiveCheckOutTime = tt.endTime;
          const { hours, minutes } = getTimeDetails(new Date(tt.endTime));
          clockOutStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        if (typeof tt.activeTime === 'number' && tt.activeTime > 0) {
          activeSecs = tt.activeTime;
          hoursVal = parseFloat((tt.activeTime / 3600).toFixed(4));
        }
      }

      fullLogs.push({
        _id: existingAtt._id,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        date: dStr,
        status: existingAtt.status || 'Present',
        checkInTime: existingAtt.checkInTime,
        checkOutTime: effectiveCheckOutTime,
        clockIn: clockInStr,
        clockOut: clockOutStr,
        totalHours: hoursVal,
        totalActiveTime: activeSecs,
        activeTime: activeSecs
      });
    } else {
      const dStart = new Date(d);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);

      const matchingLeave = approvedLeaves.find(l => {
        const lStart = new Date(l.startDate);
        const lEnd = new Date(l.endDate);
        return (lStart <= dEnd && lEnd >= dStart);
      });

      if (matchingLeave) {
        fullLogs.push({
          _id: `leave_${matchingLeave._id}_${dStr}`,
          user: { _id: user._id, name: user.name, email: user.email, role: user.role },
          date: dStr,
          status: 'Leave',
          leaveType: matchingLeave.leaveType || matchingLeave.type || 'Leave',
          reason: matchingLeave.reason || 'Approved Leave',
          clockIn: '--',
          clockOut: '--',
          totalHours: '--'
        });
      } else if (!isWeekend && dStr <= todayStr) {
        fullLogs.push({
          _id: `absent_${userId}_${dStr}`,
          user: { _id: user._id, name: user.name, email: user.email, role: user.role },
          date: dStr,
          status: 'Absent',
          clockIn: '--',
          clockOut: '--',
          totalHours: '--'
        });
      }
    }
  }

  fullLogs.sort((a, b) => b.date.localeCompare(a.date));
  return fullLogs;
};

// @desc    Get Attendance based on Role Hierarchy
const getManagerSubordinateUserIds = async (managerUserId) => {
  const User = require('../models/User');
  const Employee = require('../models/Employee');

  const directUsers = await User.find({
    role: { $nin: ['admin', 'hr', 'superadmin'] },
    $or: [
      { reportingManager: managerUserId },
      { managerId: managerUserId }
    ]
  }).select('_id').lean();
  const directIds = directUsers.map(u => u._id.toString());

  const empDocs = await Employee.find({
    $or: [
      { managerId: managerUserId },
      { reportingManager: managerUserId }
    ]
  }).select('userId').lean();
  const empIds = empDocs.filter(e => e.userId).map(e => e.userId.toString());

  let combined = Array.from(new Set([...directIds, ...empIds]));
  if (combined.length === 0) {
    // Fallback: If no explicit manager assignment exists in DB yet, query employees assigned to null/unassigned
    const unassigned = await User.find({
      role: { $in: ['employee', 'staff'] },
      reportingManager: { $in: [managerUserId, null, undefined] }
    }).select('_id').lean();
    combined = unassigned.map(u => u._id.toString());
  }

  // Include manager's own user ID so manager check-in/out data appears in Attendance History
  const mgrStr = managerUserId ? managerUserId.toString() : '';
  if (mgrStr && !combined.includes(mgrStr)) {
    combined.push(mgrStr);
  }

  return combined;
};

// @desc    Get Attendance based on Role Hierarchy
// @route   GET /api/attendance
exports.getAttendance = async (req, res) => {
  try {
    const role = req.user.role.toLowerCase();
    const userId = req.user.id;
    const scope = req.query.scope;

    if (scope === 'personal' || role === 'employee') {
      const fullHistory = await buildEmployeeAttendanceHistory(userId);
      return res.json(fullHistory);
    }

    let query = {};

    if (role === 'admin') {
      query = {};
    } else if (role === 'hr') {
      const User = require('../models/User');
      const nonAdminUsers = await User.find({ role: { $nin: ['admin', 'superadmin'] } }).select('_id');
      const hrUserIds = nonAdminUsers.map(u => u._id.toString());
      query = { user: { $in: hrUserIds } };
    } else if (role === 'manager') {
      const empIds = await getManagerSubordinateUserIds(userId);
      query = { user: { $in: empIds } };
    }

    const records = await Attendance.find(query)
      .populate('user', 'name role email')
      .lean();

    const Leave = require('../models/Leave');
    let leaveQuery = { status: 'approved' };
    if (role === 'manager') {
      const empIds = await getManagerSubordinateUserIds(userId);
      leaveQuery.user = { $in: empIds };
    } else if (role === 'hr') {
      const User = require('../models/User');
      const users = await User.find({ role: { $nin: ['admin', 'superadmin'] } }).select('_id');
      const hrUserIds = users.map(u => u._id.toString());
      leaveQuery.user = { $in: hrUserIds };
    }

    const approvedLeaves = await Leave.find(leaveQuery)
      .populate('user', 'name role email')
      .lean();

    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const leaveRecords = [];
    approvedLeaves.forEach(leave => {
      if (!leave.user) return;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = formatLocalDate(d);
        const leaveUserId = leave.user?._id ? leave.user._id.toString() : leave.user?.toString();

        const hasInAttendance = records.some(r => {
          const rUserId = r.user?._id ? r.user._id.toString() : r.user?.toString();
          return rUserId === leaveUserId && r.date === dateStr;
        });

        const hasInLeaveRecords = leaveRecords.some(r => {
          const rUserId = r.user?._id ? r.user._id.toString() : r.user?.toString();
          return rUserId === leaveUserId && r.date === dateStr;
        });

        if (!hasInAttendance && !hasInLeaveRecords) {
          leaveRecords.push({
            _id: `leave_${leave._id}_${dateStr}`,
            user: leave.user,
            date: dateStr,
            status: 'Leave',
            clockIn: '--',
            clockOut: '--',
            totalHours: '--',
            reason: leave.reason || 'Approved Leave'
          });
        }
      }
    });

    // Generate Absent records for users who did not check in or take leave on past working days
    const User = require('../models/User');
    let targetUsers = [];
    if (role === 'admin' || role === 'hr') {
      targetUsers = await User.find({ role: { $nin: ['admin', 'superadmin'] } }).select('_id name email role joinDate createdAt').lean();
    } else if (role === 'manager') {
      const empIds = await getManagerSubordinateUserIds(userId);
      targetUsers = await User.find({ _id: { $in: empIds } }).select('_id name email role joinDate createdAt').lean();
    }

    const todayObj = new Date();
    const absentLookbackDays = 60;
    const absentRecords = [];

    targetUsers.forEach(u => {
      const uId = u._id.toString();
      let uJoinDate = u.joinDate || u.createdAt ? new Date(u.joinDate || u.createdAt) : null;

      for (let i = 0; i <= absentLookbackDays; i++) {
        const d = new Date(todayObj);
        d.setDate(todayObj.getDate() - i);
        const dStr = formatLocalDate(d);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        if (isWeekend) continue;
        if (uJoinDate && d < new Date(new Date(uJoinDate).setHours(0, 0, 0, 0))) continue;

        const hasAtt = records.some(r => {
          const rId = r.user?._id ? r.user._id.toString() : (typeof r.user === 'string' ? r.user : '');
          return rId === uId && r.date === dStr;
        });

        const hasLeave = leaveRecords.some(r => {
          const rId = r.user?._id ? r.user._id.toString() : (typeof r.user === 'string' ? r.user : '');
          return rId === uId && r.date === dStr;
        });

        if (!hasAtt && !hasLeave) {
          absentRecords.push({
            _id: `absent_${uId}_${dStr}`,
            user: { _id: u._id, name: u.name, email: u.email, role: u.role },
            date: dStr,
            status: 'Absent',
            clockIn: '--',
            clockOut: '--',
            totalHours: '--'
          });
        }
      }
    });

    const uniqueCombinedMap = new Map();
    for (const rec of records) {
      const uId = rec.user?._id ? rec.user._id.toString() : (rec.user ? rec.user.toString() : '');
      const key = `${uId}_${rec.date}`;
      if (uId && !uniqueCombinedMap.has(key)) {
        uniqueCombinedMap.set(key, rec);
      }
    }
    for (const rec of leaveRecords) {
      const uId = rec.user?._id ? rec.user._id.toString() : (rec.user ? rec.user.toString() : '');
      const key = `${uId}_${rec.date}`;
      if (uId && !uniqueCombinedMap.has(key)) {
        uniqueCombinedMap.set(key, rec);
      }
    }
    for (const rec of absentRecords) {
      const uId = rec.user?._id ? rec.user._id.toString() : (rec.user ? rec.user.toString() : '');
      const key = `${uId}_${rec.date}`;
      if (uId && !uniqueCombinedMap.has(key)) {
        uniqueCombinedMap.set(key, rec);
      }
    }
    const combined = Array.from(uniqueCombinedMap.values());
    combined.sort((a, b) => b.date.localeCompare(a.date));

    try {
      const TimeTrack = require('../models/TimeTrack');
      const allDates = Array.from(new Set(combined.map(r => r.date).filter(Boolean)));
      if (allDates.length > 0) {
        const timeTrackRecords = await TimeTrack.find({
          date: { $in: allDates }
        }).lean();

        for (const rec of combined) {
          const uId = rec.user?._id ? rec.user._id.toString() : (rec.user ? rec.user.toString() : '');
          const tt = timeTrackRecords.find(t => {
            const tEmpId = t.employeeId?._id ? t.employeeId._id.toString() : (t.employeeId ? t.employeeId.toString() : '');
            return tEmpId === uId && t.date === rec.date;
          });

          if (tt) {
            if (tt.endTime && (!rec.checkOutTime || new Date(tt.endTime) > new Date(rec.checkOutTime))) {
              rec.checkOutTime = tt.endTime;
              const { hours, minutes } = getTimeDetails(new Date(tt.endTime));
              rec.clockOut = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }
            if (typeof tt.activeTime === 'number' && tt.activeTime > 0) {
              rec.totalActiveTime = tt.activeTime;
              rec.activeTime = tt.activeTime;
              rec.totalHours = parseFloat((tt.activeTime / 3600).toFixed(4));
            }
          }
        }
      }
    } catch (ttErr) {
      console.error('[ATTENDANCE HISTORY TIME TRACK SYNC ERROR]', ttErr);
    }

    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Weekly Attendance Summary (for Employee/Admin Dashboard Chart)
// @route   GET /api/attendance/summary/weekly
// @desc    Get Weekly/Monthly/Yearly Attendance Summary (for Employee/Admin/Manager/HR Dashboard Chart)
// @route   GET /api/attendance/summary/weekly
exports.getWeeklySummary = async (req, res) => {
  try {
    const now = new Date();
    const period = (req.query.period || 'week').toLowerCase();
    const isEmployee = req.user.role === 'employee' || req.query.scope === 'personal';

    const Leave = require('../models/Leave');
    const User = require('../models/User');
    const Employee = require('../models/Employee');

    let eligibleUserIds = [];
    if (isEmployee) {
      eligibleUserIds = [req.user.id.toString()];
    } else if (req.user.role === 'manager') {
      eligibleUserIds = await getManagerSubordinateUserIds(req.user.id);
      if (!eligibleUserIds.includes(req.user.id.toString())) {
        eligibleUserIds.push(req.user.id.toString());
      }
    } else if (req.user.role === 'hr' || req.user.role === 'admin') {
      const activeEmps = await Employee.find({ status: { $ne: 'inactive' } }).select('userId user');
      const empUserIds = activeEmps.map(e => e.userId?.toString() || e.user?.toString()).filter(Boolean);
      if (empUserIds.length > 0) {
        eligibleUserIds = Array.from(new Set(empUserIds));
      } else {
        const users = await User.find({ status: { $ne: 'inactive' } }).select('_id');
        eligibleUserIds = users.map(u => u._id.toString());
      }
    }

    const totalEmployees = eligibleUserIds.length || 1;

    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let intervals = [];

    if (period === 'month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      let startDay = 1;
      let weekNum = 1;
      while (startDay <= daysInMonth) {
        let endDay = Math.min(startDay + 6, daysInMonth);
        const sDate = new Date(year, month, startDay, 0, 0, 0, 0);
        const eDate = new Date(year, month, endDay, 23, 59, 59, 999);
        intervals.push({
          name: `Week ${weekNum}`,
          startStr: formatLocalDate(sDate),
          endStr: formatLocalDate(eDate),
          startDate: sDate,
          endDate: eDate
        });
        startDay += 7;
        weekNum++;
      }
    } else if (period === 'year') {
      const year = now.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let m = 0; m < 12; m++) {
        const sDate = new Date(year, m, 1, 0, 0, 0, 0);
        const eDate = new Date(year, m + 1, 0, 23, 59, 59, 999);
        intervals.push({
          name: monthNames[m],
          startStr: formatLocalDate(sDate),
          endStr: formatLocalDate(eDate),
          startDate: sDate,
          endDate: eDate
        });
      }
    } else {
      const currentDay = now.getDay();
      const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayDiff);

      const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const sDate = new Date(d);
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date(d);
        eDate.setHours(23, 59, 59, 999);
        const dStr = formatLocalDate(d);
        intervals.push({
          name: weekdayNames[i],
          startStr: dStr,
          endStr: dStr,
          startDate: sDate,
          endDate: eDate
        });
      }
    }

    const overallStart = intervals[0].startStr;
    const overallEnd = intervals[intervals.length - 1].endStr;

    const attendanceRecords = await Attendance.find({
      user: { $in: eligibleUserIds },
      date: { $gte: overallStart, $lte: overallEnd }
    });

    const TimeTrack = require('../models/TimeTrack');
    const timeTrackRecords = await TimeTrack.find({
      employeeId: { $in: eligibleUserIds },
      date: { $gte: overallStart, $lte: overallEnd }
    });

    const approvedLeaves = await Leave.find({
      user: { $in: eligibleUserIds },
      status: { $regex: /^approved$/i },
      startDate: { $lte: intervals[intervals.length - 1].endDate },
      endDate: { $gte: intervals[0].startDate }
    });

    const chartData = intervals.map(interval => {
      const periodRecords = attendanceRecords.filter(r => r.date >= interval.startStr && r.date <= interval.endStr);

      if (isEmployee) {
        let present = 0, late = 0, halfDay = 0, leave = 0, absent = 0;
        periodRecords.forEach(r => {
          if (r.status === 'Present') present++;
          else if (r.status === 'Late') late++;
          else if (r.status === 'Half Day') halfDay++;
          else if (r.status === 'Absent') absent++;
          else if (r.status === 'Leave') leave++;
        });

        const hasLeave = approvedLeaves.some(l => {
          const s = new Date(l.startDate);
          const e = new Date(l.endDate);
          const sDate = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
          const eDate = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
          return (sDate <= interval.endDate && eDate >= interval.startDate);
        });
        if (hasLeave && leave === 0) leave = 1;

        return {
          name: interval.name,
          date: interval.startStr,
          Present: present,
          Late: late,
          'Half Day': halfDay,
          Leave: leave,
          Absent: absent
        };
      } else {
        const presentCount = periodRecords.filter(r => r.status === 'Present').length;
        const lateCount = periodRecords.filter(r => r.status === 'Late').length;
        const halfDayCount = periodRecords.filter(r => r.status === 'Half Day').length;

        const employeesOnLeave = new Set(
          approvedLeaves.filter(l => {
            const s = new Date(l.startDate);
            const e = new Date(l.endDate);
            const sDate = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
            const eDate = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
            return (sDate <= interval.endDate && eDate >= interval.startDate);
          }).map(l => String(l.user?._id || l.user))
        ).size;

        const recordedAbsent = periodRecords.filter(r => r.status === 'Absent').length;
        const isSingleDay = interval.startStr === interval.endStr;

        let timeTrackPresentCount = 0;
        if (isSingleDay) {
          const activeUsersInTrack = timeTrackRecords.filter(t => {
            if (t.date !== interval.startStr) return false;
            const uId = t.employeeId?._id ? t.employeeId._id.toString() : (t.employeeId ? t.employeeId.toString() : '');
            if (!uId) return false;
            const isUserRecorded = periodRecords.some(r => (r.user?._id ? r.user._id.toString() : r.user.toString()) === uId);
            if (isUserRecorded) return false;
            return !!(t.startTime || t.isRunning || (t.status && ['active', 'working', 'paused', 'break', 'completed'].includes(t.status.toLowerCase())) || (t.activeTime && t.activeTime > 0));
          }).map(t => t.employeeId._id ? t.employeeId._id.toString() : t.employeeId.toString());
          timeTrackPresentCount = new Set(activeUsersInTrack).size;
        }

        const totalWorking = presentCount + lateCount + halfDayCount + timeTrackPresentCount;
        const finalPresent = presentCount + timeTrackPresentCount;

        let finalAbsent = recordedAbsent;
        if (isSingleDay) {
          const dayName = interval.name;
          const isWeekend = dayName === 'Sat' || dayName === 'Sun';
          finalAbsent = isWeekend ? 0 : Math.max(0, totalEmployees - (totalWorking + employeesOnLeave));
        }

        return {
          name: interval.name,
          date: interval.startStr,
          Present: finalPresent,
          Late: lateCount,
          'Half Day': halfDayCount,
          Leave: employeesOnLeave,
          Absent: finalAbsent
        };
      }
    });

    res.json({
      period,
      this_week: chartData,
      last_week: []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Clock In
// @route   POST /api/attendance/clock-in
// @desc    Clock In
// @route   POST /api/attendance/clock-in
exports.clockIn = async (req, res) => {
  try {
    const checkInTime = new Date();
    const { dateStr: todayStr, timeInMinutes, hours, minutes } = getTimeDetails(checkInTime);
    const { date, location } = req.body;
    const recordDate = date || todayStr;

    // Check if already clocked in today
    const existing = await Attendance.findOne({ user: req.user.id, date: recordDate });
    if (existing) {
      return res.status(400).json({ message: 'Already clocked in for today' });
    }

    let status = 'Present';
    if (timeInMinutes >= 14 * 60 + 30) { // 2:30 PM
      status = 'Half Day';
    } else if (timeInMinutes >= 10 * 60 + 30) { // 10:30 AM
      status = 'Late';
    }

    const clockInStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const attendance = await Attendance.create({
      user: req.user.id,
      date: recordDate,
      checkInTime,
      clockIn: clockInStr,
      location: location || 'Office',
      status
    });

    // Sync with TimeTrack model (if the user checked in from Dashboard, start time tracker)
    try {
      const TimeTrack = require('../models/TimeTrack');
      const Employee = require('../models/Employee');
      const employee = await Employee.findOne({ user: req.user.id });

      const existingSession = await TimeTrack.findOne({ employeeId: req.user.id, date: recordDate });
      if (!existingSession) {
        await TimeTrack.create({
          employeeId: req.user.id,
          employeeRole: employee ? employee.role : 'employee',
          date: recordDate,
          status: 'active',
          isRunning: true,
          startTime: checkInTime,
          segmentStart: checkInTime,
          sessions: [{ start: checkInTime }]
        });

        const io = req.app.get('io');
        if (io) {
          io.to(`user_${req.user.id}`).emit('timer_started', {
            hasActiveSession: true,
            status: 'active',
            isRunning: true,
            activeTime: 0
          });
        }
      }
    } catch (ttErr) {
      console.error('Error syncing TimeTrack on clockIn:', ttErr);
    }

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clock Out
// @route   PUT /api/attendance/clock-out
exports.clockOut = async (req, res) => {
  try {
    const now = new Date();
    const { dateStr: todayStr, hours, minutes } = getTimeDetails(now);
    const { date } = req.body;
    const recordDate = date || todayStr;

    let attendance = await Attendance.findOne({ user: req.user.id, date: recordDate });
    if (!attendance) {
      attendance = await Attendance.findOne({ user: req.user.id, checkOutTime: null }).sort({ checkInTime: -1 });
    }

    if (!attendance) {
      return res.status(404).json({ message: 'No clock-in record found for today' });
    }

    const clockOutStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    attendance.checkOutTime = now;
    attendance.clockOut = clockOutStr;

    if (attendance.checkInTime) {
      const diffMs = now - new Date(attendance.checkInTime);
      attendance.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      if (attendance.totalHours < 7.5) {
        attendance.status = 'Half Day';
      } else {
        const { timeInMinutes } = getTimeDetails(new Date(attendance.checkInTime));
        if (timeInMinutes >= 14 * 60 + 30) {
          attendance.status = 'Half Day';
        } else if (timeInMinutes >= 10 * 60 + 30) {
          attendance.status = 'Late';
        } else {
          attendance.status = 'Present';
        }
      }
    }
    await attendance.save();

    // Sync with TimeTrack model (if the user checked out from Dashboard, gracefully stop any running time tracker)
    try {
      const TimeTrack = require('../models/TimeTrack');
      const session = await TimeTrack.findOne({
        employeeId: req.user.id, status: { $in: ['active', 'paused', 'idle'] }
      }).sort({ createdAt: -1 });

      if (session) {
        if (session.status === 'active' && session.segmentStart) {
          const elapsed = (now - new Date(session.segmentStart)) / 1000;
          session.activeTime += Math.max(0, Math.floor(elapsed));
        }
        session.segmentStart = null;
        session.endTime = now;
        session.status = 'completed';
        session.isRunning = false;

        const lastIdx = session.sessions.length - 1;
        if (lastIdx >= 0 && !session.sessions[lastIdx].pause && !session.sessions[lastIdx].end) {
          session.sessions[lastIdx].end = now;
        }
        await session.save();

        // Use TimeTrack active time for Attendance totalHours
        if (attendance.checkInTime) {
          attendance.totalHours = parseFloat(((session.activeTime || 0) / 3600).toFixed(4));
          if (attendance.totalHours < 7.5) {
            attendance.status = 'Half Day';
          } else {
            const { timeInMinutes } = getTimeDetails(new Date(attendance.checkInTime));
            if (timeInMinutes >= 14 * 60 + 30) {
              attendance.status = 'Half Day';
            } else if (timeInMinutes >= 10 * 60 + 30) {
              attendance.status = 'Late';
            } else {
              attendance.status = 'Present';
            }
          }
          await attendance.save();
        }

        const io = req.app.get('io');
        if (io) {
          io.to(`user_${req.user.id}`).emit('timer_stopped', {
            hasActiveSession: false,
            status: 'completed',
            isRunning: false,
            activeTime: Math.floor(session.activeTime || 0)
          });
        }
      }
    } catch (ttErr) {
      console.error('Error syncing TimeTrack on clockOut:', ttErr);
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get My Attendance
// @route   GET /api/attendance/me
exports.getMyAttendance = async (req, res) => {
  try {
    const targetUserId = (req.user.role === 'admin' || req.user.role === 'hr') && req.query.userId ? req.query.userId : req.user.id;
    const fullHistory = await buildEmployeeAttendanceHistory(targetUserId);
    res.json(fullHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Attendance Stats for Current User by Period (Week, Month, Year)
// @route   GET /api/attendance/me/yearly-stats or GET /api/attendance/me/stats
exports.getMyYearlyStats = async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const period = (req.query.period || 'week').toLowerCase(); // 'week' | 'month' | 'year'

    const now = new Date();
    let startDate, endDate;

    if (period === 'week') {
      const currentDay = now.getDay();
      const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + mondayDiff);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // 'year'
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);
    const todayStr = formatLocalDate(now);

    // 1. Get attendance records for this period
    const attendanceRecords = await Attendance.find({
      user: userId,
      date: { $gte: startStr, $lte: endStr }
    });

    // 2. Get approved leaves for this period
    const Leave = require('../models/Leave');
    const leaves = await Leave.find({
      user: userId,
      status: 'approved',
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    });

    // 3. Determine employee effective join date
    const Employee = require('../models/Employee');
    const User = require('../models/User');
    const employeeData = await Employee.findOne({ userId });
    const userData = await User.findById(userId);

    let actualJoinDate = null;
    if (employeeData && employeeData.joinDate) {
      actualJoinDate = new Date(employeeData.joinDate);
    } else if (userData && userData.joinDate) {
      actualJoinDate = new Date(userData.joinDate);
    } else if (userData && userData.createdAt) {
      actualJoinDate = new Date(userData.createdAt);
    }

    let calculationStartDate = new Date(startDate);
    if (actualJoinDate && actualJoinDate > startDate) {
      calculationStartDate = new Date(actualJoinDate);
      calculationStartDate.setHours(0, 0, 0, 0);
    }

    // 4. Calculate day by day to ensure 100% accuracy and eliminate double counting
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let totalHrs = 0;
    let clockedDaysCount = 0;

    const calculationEndDate = now < endDate ? now : endDate;

    for (
      let d = new Date(calculationStartDate);
      d <= calculationEndDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dStr = formatLocalDate(d);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      // Check attendance record
      const record = attendanceRecords.find(r => r.date === dStr);

      if (record) {
        if (record.status === 'Late') {
          lateCount++;
        } else if (record.status === 'Half Day') {
          halfDayCount++;
        } else {
          presentCount++;
        }

        if (record.checkInTime && record.checkOutTime) {
          let diff = (new Date(record.checkOutTime) - new Date(record.checkInTime)) / (1000 * 60 * 60);
          if (diff > 6) diff -= 0.75;
          totalHrs += Math.max(0, diff);
          clockedDaysCount++;
        }
      } else {
        // Check approved leave
        const dStart = new Date(d);
        dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(d);
        dEnd.setHours(23, 59, 59, 999);

        const hasLeave = leaves.some(l => {
          const lStart = new Date(l.startDate);
          const lEnd = new Date(l.endDate);
          return (lStart <= dEnd && lEnd >= dStart);
        });

        if (hasLeave) {
          leaveCount++;
        } else if (!isWeekend && dStr <= todayStr) {
          // Working day with no attendance and no leave -> Absent
          absentCount++;
        }
      }
    }

    const avgHrs = clockedDaysCount > 0 ? (totalHrs / clockedDaysCount).toFixed(1) : '0.0';

    res.json({
      period,
      present: presentCount,
      late: lateCount,
      halfDay: halfDayCount,
      leave: leaveCount,
      absent: absentCount,
      avgWeeklyHours: `${avgHrs}h`,
      totalHours: parseFloat(totalHrs.toFixed(1))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get All Attendance (Admin/HR)
// @route   GET /api/attendance
exports.getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find().populate('user', 'name role email').sort({ date: -1 }).lean();
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Team Attendance Stats by Period (Admin, HR, Manager)
// @route   GET /api/attendance/summary/team-stats
exports.getTeamStats = async (req, res) => {
  try {
    const role = req.user.role.toLowerCase();
    const userId = req.user.id;
    const period = (req.query.period || 'week').toLowerCase();

    const now = new Date();
    let startDate, endDate;

    if (period === 'week') {
      const currentDay = now.getDay();
      const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + mondayDiff);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 4); // Mon to Fri
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);
    const todayStr = formatLocalDate(now);

    const User = require('../models/User');
    const Employee = require('../models/Employee');
    const Leave = require('../models/Leave');

    if (role === 'admin' || role === 'hr') {
      const activeEmps = await Employee.find({ status: { $ne: 'inactive' } }).select('userId user');
      const empUserIds = activeEmps.map(e => e.userId?.toString() || e.user?.toString()).filter(Boolean);
      if (empUserIds.length > 0) {
        eligibleUserIds = Array.from(new Set(empUserIds));
      } else {
        const users = await User.find({ status: { $ne: 'inactive' } }).select('_id');
        eligibleUserIds = users.map(u => u._id.toString());
      }
    } else if (role === 'manager') {
      eligibleUserIds = await getManagerSubordinateUserIds(userId);
    } else {
      return res.status(403).json({ message: 'Not authorized for team stats' });
    }

    const attendanceRecords = await Attendance.find({
      user: { $in: eligibleUserIds },
      date: { $gte: startStr, $lte: endStr }
    });

    const TimeTrack = require('../models/TimeTrack');
    const timeTrackRecords = await TimeTrack.find({
      employeeId: { $in: eligibleUserIds },
      date: { $gte: startStr, $lte: endStr }
    });

    const isUserActiveInTimeTrack = (uid, dateStr) => {
      const sess = timeTrackRecords.find(t => t.date === dateStr && t.employeeId && t.employeeId.toString() === uid);
      if (!sess) return false;
      return !!(sess.startTime || sess.isRunning || (sess.status && ['active', 'working', 'paused', 'break', 'completed'].includes(sess.status.toLowerCase())) || (sess.activeTime && sess.activeTime > 0));
    };

    const leaves = await Leave.find({
      user: { $in: eligibleUserIds },
      status: 'approved',
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    });

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let absentCount = 0;

    for (let d = new Date(startDate); d <= endDate && d <= now; d.setDate(d.getDate() + 1)) {
      const dStr = formatLocalDate(d);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      for (const uid of eligibleUserIds) {
        const record = attendanceRecords.find(r => r.date === dStr && r.user.toString() === uid);
        const hasTimeTrack = isUserActiveInTimeTrack(uid, dStr);

        if (record) {
          if (record.status === 'Late') lateCount++;
          else if (record.status === 'Half Day') halfDayCount++;
          else presentCount++;
        } else if (hasTimeTrack) {
          presentCount++;
        } else {
          const dStart = new Date(d);
          dStart.setHours(0, 0, 0, 0);
          const dEnd = new Date(d);
          dEnd.setHours(23, 59, 59, 999);

          const hasLeave = leaves.some(l => {
            return l.user.toString() === uid &&
              (new Date(l.startDate) <= dEnd && new Date(l.endDate) >= dStart);
          });

          if (hasLeave) {
            leaveCount++;
          } else if (!isWeekend && dStr <= todayStr) {
            absentCount++;
          }
        }
      }
    }

    const total = eligibleUserIds.length || 1;
    const workingDays = presentCount + lateCount + halfDayCount;
    const totalPossibleDays = (workingDays + absentCount + leaveCount) || 1;
    const pct = Math.round((workingDays / totalPossibleDays) * 100);

    // Calculate TODAY'S specific stats for Today's Attendance Rate banner
    let tPresent = 0;
    let tLate = 0;
    let tHalfDay = 0;
    let tLeave = 0;
    let tAbsent = 0;

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    for (const uid of eligibleUserIds) {
      const record = attendanceRecords.find(r => r.date === todayStr && r.user.toString() === uid);
      const hasTimeTrack = isUserActiveInTimeTrack(uid, todayStr);
      if (record) {
        if (record.status === 'Late') tLate++;
        else if (record.status === 'Half Day') tHalfDay++;
        else tPresent++;
      } else if (hasTimeTrack) {
        tPresent++;
      } else {
        const hasLeave = leaves.some(l => {
          return l.user.toString() === uid &&
            (new Date(l.startDate) <= todayEnd && new Date(l.endDate) >= todayStart);
        });
        if (hasLeave) {
          tLeave++;
        } else {
          tAbsent++;
        }
      }
    }

    const tWorking = tPresent + tLate + tHalfDay;
    const tTotal = eligibleUserIds.length || 1;
    const tPct = Math.round((tWorking / tTotal) * 100);

    res.json({
      present: presentCount,
      late: lateCount,
      halfDay: halfDayCount,
      leave: leaveCount,
      absent: absentCount,
      total: eligibleUserIds.length,
      pct,
      today: {
        present: tPresent,
        late: tLate,
        halfDay: tHalfDay,
        working: tWorking,
        leave: tLeave,
        absent: tAbsent,
        total: eligibleUserIds.length,
        pct: tPct
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Today's Attendance for Logged In User
// @route   GET /api/attendance/today
exports.getTodayAttendance = async (req, res) => {
  try {
    const now = new Date();
    const formatLocalDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = formatLocalDate(now);

    const attendance = await Attendance.findOne({ user: req.user.id, date: todayStr });
    res.json({ attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
