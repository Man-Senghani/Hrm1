/**
 * ============================================================
 * TIME ENGINE v2 — BACKEND AUTHORITY
 * ============================================================
 * Rules:
 *  - Backend is the ONLY source of truth
 *  - Frontend/Electron ONLY display values returned here
 *  - No local timer math anywhere
 *  - Idle time tracked as: inactivityCount × IDLE_THRESHOLD (deducted from activeTime)
 *  - All values stored in DB and returned on every poll
 * ============================================================
 */

const TimeTrack = require('../models/TimeTrack');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const OfflineRequest = require('../models/OfflineRequest');
const Notification = require('../models/Notification');
const Leave = require('../models/Leave');
const mongoose = require('mongoose');

// ── CONFIG // Constants for Idle tracking (MUST MATCH DESKTOP APP & WEB APP)
const IDLE_THRESHOLD_SECONDS = 600; // 10 minutes (600 seconds)

// ── HELPERS ───────────────────────────────────────────────
const getToday = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
};

const getTodayLeaveBounds = () => {
  const todayStr = getToday();
  const utcStart = new Date(`${todayStr}T00:00:00.000Z`);
  const utcEnd = new Date(`${todayStr}T23:59:59.999Z`);
  const istStart = new Date(`${todayStr}T00:00:00.000+05:30`);
  const istEnd = new Date(`${todayStr}T23:59:59.999+05:30`);
  return {
    start: new Date(Math.min(utcStart.getTime(), istStart.getTime())),
    end: new Date(Math.max(utcEnd.getTime(), istEnd.getTime()))
  };
};

const isDBConnected = () => mongoose.connection.readyState === 1;

const getRoleFilter = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'hr') return {
    $or: [
      { employeeRole: { $in: ['employee', 'manager'] } },
      { employeeId: user.id }
    ]
  };
  if (user.role === 'manager') return {
    $or: [
      { managerId: user.id },
      { employeeId: user.id }
    ]
  };
  return { employeeId: user.id };
};

// ── MOCK (DB offline fallback) ────────────────────────────
let mock = {
  hasActiveSession: false, status: 'completed', isRunning: false,
  activeTime: 0, idleTime: 0, inactivityCount: 0
};

// ── Auto-close unclosed sessions from previous days at 23:59:59 of that day ──
const closeStaleUserSessions = async (userId, today) => {
  try {
    const todayStart = new Date(`${today}T00:00:00+05:30`);
    const staleSessions = await TimeTrack.find({
      employeeId: userId,
      date: { $ne: today },
      $or: [
        { status: { $in: ['active', 'idle', 'paused'] } },
        { endTime: { $gt: todayStart } }
      ]
    });

    for (const s of staleSessions) {
      const eodDate = new Date(`${s.date}T23:59:59+05:30`);
      if (s.status === 'active' && s.segmentStart) {
        const elapsed = Math.max(0, (eodDate - new Date(s.segmentStart)) / 1000);
        s.activeTime += Math.floor(elapsed);
      }
      const lastIdx = (s.sessions || []).length - 1;
      if (lastIdx >= 0 && (!s.sessions[lastIdx].end || new Date(s.sessions[lastIdx].end) > eodDate)) {
        s.sessions[lastIdx].end = eodDate;
      }
      const lastPauseIdx = (s.pauseEvents || []).length - 1;
      if (lastPauseIdx >= 0 && (!s.pauseEvents[lastPauseIdx].resumeTime || new Date(s.pauseEvents[lastPauseIdx].resumeTime) > eodDate)) {
        s.pauseEvents[lastPauseIdx].resumeTime = eodDate;
      }
      s.segmentStart = null;
      s.idleStart = null;
      s.endTime = eodDate;
      s.status = 'completed';
      s.isRunning = false;
      s.isAutoStop = true;
      s.totalWorkedDuration = Math.round((s.activeTime || 0) / 60);
      s.totalTime = Math.max(0, Math.floor((eodDate - new Date(s.startTime)) / 1000));
      await s.save();

      const prevAtt = await Attendance.findOne({ user: userId, date: s.date });
      if (prevAtt) {
        let diffMs = 0;
        if (prevAtt.checkInTime) {
          diffMs = Math.max(0, eodDate - new Date(prevAtt.checkInTime));
        }
        prevAtt.checkOutTime = eodDate;
        prevAtt.clockOut = '23:59';
        prevAtt.totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
        prevAtt.autoCheckout = true;
        await prevAtt.save();
      }
    }

    const staleAtts = await Attendance.find({
      user: userId,
      date: { $ne: today },
      $or: [
        { checkOutTime: null },
        { clockOut: '--' },
        { clockOut: null },
        { checkOutTime: { $gt: todayStart } }
      ]
    });
    for (const att of staleAtts) {
      const eod = new Date(`${att.date}T23:59:59+05:30`);
      let diffMs = 0;
      if (att.checkInTime) {
        diffMs = Math.max(0, eod - new Date(att.checkInTime));
      }
      att.checkOutTime = eod;
      att.clockOut = '23:59';
      att.totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
      att.autoCheckout = true;
      await att.save();
    }
  } catch (err) {
    console.error('[CLOSE STALE USER SESSIONS ERROR]', err);
  }
};

// ============================================================
// 🟢 START
// ============================================================
exports.startTracking = async (req, res) => {
  try {
    if (!isDBConnected()) {
      mock = { hasActiveSession: true, status: 'active', isRunning: true, activeTime: 0, idleTime: 0, inactivityCount: 0, startTime: new Date() };
      return res.status(201).json({ message: 'Mock start', session: mock });
    }

    const { id, role } = req.user;
    const today = getToday();
    const now = new Date();
    const userNode = await User.findById(id).select('reportingManager teamId');

    // Close any stale session from a previous day at 23:59:59 of that day
    await closeStaleUserSessions(id, today);

    let session = await TimeTrack.findOne({ employeeId: id, date: today });
    const existingAttendance = await Attendance.findOne({ user: id, date: today });

    // 🏖️ Check if employee has an approved leave today
    const { start: leaveStartBound, end: leaveEndBound } = getTodayLeaveBounds();
    const activeLeave = await Leave.findOne({
      user: id,
      status: 'approved',
      startDate: { $lte: leaveEndBound },
      endDate: { $gte: leaveStartBound }
    });

    if (activeLeave) {
      const leaveTypeName = activeLeave.leaveType ? (activeLeave.leaveType.charAt(0).toUpperCase() + activeLeave.leaveType.slice(1)) : 'Approved';
      return res.status(403).json({
        message: `You are on approved ${leaveTypeName} Leave today. Time tracking is suspended during approved leaves.`,
        isOnLeave: true,
        leaveType: activeLeave.leaveType
      });
    }

    // 🛡️ If user already checked out for today, require HR/Admin override
    if (session?.status === 'completed' && existingAttendance?.checkOutTime && role === 'employee') {
      return res.status(403).json({
        message: 'You have already ended your workday for today. Please contact your HR, Manager, or Admin to restart your timer.',
        checkedOut: true
      });
    }

    if (session) {
      // Resume existing day session
      if (session.idleStart) {
        const idleDuration = Math.floor((now - new Date(session.idleStart)) / 1000);
        session.idleTime += Math.max(0, idleDuration);
        session.idleStart = null;
      }
      session.status = 'active';
      session.isRunning = true;
      session.segmentStart = now;       // start of THIS active segment
      session.lastHeartbeat = now;
      session.idleApplied = false;
      session.sessions.push({ start: now });
    } else {
      session = new TimeTrack({
        employeeId: id,
        employeeRole: role || 'employee',
        managerId: userNode?.reportingManager || null,
        teamId: userNode?.teamId || null,
        date: today,
        startTime: now,
        segmentStart: now,
        lastHeartbeat: now,
        status: 'active',
        isRunning: true,
        activeTime: 0,
        idleTime: 0,
        inactivityCount: 0,
        sessions: [{ start: now }]
      });
    }

    await session.save();

    // Sync with legacy Attendance model for HR dashboards
    if (!existingAttendance) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      const timeInMinutes = hours * 60 + minutes;

      let status = 'Present';

      await Attendance.create({
        user: id,
        date: today,
        checkInTime: now,
        status
      });
    }

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) io.to(`user_${id}`).emit('timer_update', buildPayload(session));

    res.status(201).json({ message: 'Tracking started', session: buildPayload(session) });
  } catch (err) {
    console.error('[START ERROR]', err);
    res.status(500).json({ message: 'Failed to start tracking', error: err.message });
  }
};

// ============================================================
// ⏸️ PAUSE (manual)
// ============================================================
exports.pauseTracking = async (req, res) => {
  try {
    if (!isDBConnected()) {
      mock.status = 'paused'; mock.isRunning = false;
      return res.json({ message: 'Mock pause', session: mock });
    }

    const { id } = req.user;
    const now = new Date();
    const session = await TimeTrack.findOne({ employeeId: id, date: getToday(), status: 'active' });
    if (!session) return res.status(404).json({ message: 'No active session to pause' });

    // Commit the current active segment to activeTime
    session.activeTime += flushSegment(session, now);
    session.segmentStart = null;
    session.idleStart = now; // 🕒 Track pause duration as inactive time
    session.status = 'paused';
    session.isRunning = false;
    session.lastHeartbeat = now;
    session.idleApplied = false;

    const lastIdx = session.sessions.length - 1;
    if (lastIdx >= 0) {
      if (!session.sessions[lastIdx].pause && !session.sessions[lastIdx].end) {
        session.sessions[lastIdx].pause = now;
      }
    }

    await session.save();

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) io.to(`user_${id}`).emit('timer_paused', { reason: 'manual', ...buildPayload(session) });

    res.json({ message: 'Tracking paused', session: buildPayload(session) });
  } catch (err) {
    console.error('[PAUSE ERROR]', err);
    res.status(500).json({ message: 'Failed to pause', error: err.message });
  }
};

// ============================================================
// ▶️ RESUME (manual / auto)
// ============================================================
exports.resumeTracking = async (req, res) => {
  try {
    if (!isDBConnected()) {
      mock.status = 'active'; mock.isRunning = true;
      return res.json({ message: 'Mock resume', session: mock });
    }

    const { id } = req.user;
    const now = new Date();

    // 🏖️ Check if user has an approved leave today
    const { start: leaveStartBound, end: leaveEndBound } = getTodayLeaveBounds();
    const activeLeave = await Leave.findOne({
      user: id,
      status: 'approved',
      startDate: { $lte: leaveEndBound },
      endDate: { $gte: leaveStartBound }
    });

    if (activeLeave) {
      const sessionToClose = await TimeTrack.findOne({
        employeeId: id, date: getToday(), status: { $in: ['paused', 'idle', 'active'] }
      });
      if (sessionToClose) {
        sessionToClose.status = 'completed';
        sessionToClose.isRunning = false;
        sessionToClose.completedAt = now;
        await sessionToClose.save();
      }
      const leaveTypeName = activeLeave.leaveType ? (activeLeave.leaveType.charAt(0).toUpperCase() + activeLeave.leaveType.slice(1)) : 'Approved';
      return res.status(403).json({
        message: `You are on approved ${leaveTypeName} Leave today. Time tracking is suspended during approved leaves.`,
        isOnLeave: true,
        leaveType: activeLeave.leaveType
      });
    }

    const session = await TimeTrack.findOne({
      employeeId: id, date: getToday(), status: { $in: ['paused', 'idle', 'active'] }
    });
    if (!session) return res.status(404).json({ message: 'No session found to resume' });

    if (session.status === 'active' && session.isRunning) {
      return res.json({ message: 'Tracking already active', session: buildPayload(session) });
    }

    // 🕒 Finalize accumulated idle duration into idleTime
    if (session.idleStart) {
      const idleDuration = Math.floor((now - new Date(session.idleStart)) / 1000);
      session.idleTime += Math.max(0, idleDuration);
      session.idleStart = null;
    }

    session.status = 'active';
    session.isRunning = true;
    session.segmentStart = now;
    session.lastHeartbeat = now;
    session.idleApplied = false;

    session.sessions.push({ resume: now });

    await session.save();

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) io.to(`user_${id}`).emit('timer_resumed', buildPayload(session));

    res.json({ message: 'Tracking resumed', session: buildPayload(session) });
  } catch (err) {
    console.error('[RESUME ERROR]', err);
    res.status(500).json({ message: 'Failed to resume', error: err.message });
  }
};

// ============================================================
// 🔴 STOP / CHECKOUT
// ============================================================
exports.stopTracking = async (req, res) => {
  try {
    if (!isDBConnected()) {
      mock.status = 'completed'; mock.isRunning = false; mock.hasActiveSession = false;
      return res.json({ message: 'Mock stop', session: mock });
    }

    const { id } = req.user;
    const now = new Date();
    const session = await TimeTrack.findOne({
      employeeId: id, date: getToday(), status: { $in: ['active', 'paused', 'idle'] }
    });
    if (!session) return res.status(404).json({ message: 'No session to stop' });

    // Commit final active segment or idle segment
    if (session.status === 'active') {
      session.activeTime += flushSegment(session, now);
    } else if ((session.status === 'idle' || session.status === 'paused') && session.idleStart) {
      const idleDuration = Math.floor((now - new Date(session.idleStart)) / 1000);
      session.idleTime += Math.max(0, idleDuration);
      session.idleStart = null;
    }

    session.segmentStart = null;
    session.idleStart = null;
    session.endTime = now;
    session.status = 'completed';
    session.isRunning = false;

    const totalSeconds = Math.max(0, Math.floor((now - new Date(session.startTime)) / 1000));
    session.totalTime = totalSeconds;

    // Sync with legacy Attendance model for HR dashboards
    try {
      const attendance = await Attendance.findOne({ user: id, date: session.date });
      if (attendance) {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(now);
        const h = parts.find(p => p.type === 'hour')?.value || '00';
        const m = parts.find(p => p.type === 'minute')?.value || '00';

        attendance.checkOutTime = now;
        attendance.clockOut = `${h}:${m}`;
        const activeSecs = session.activeTime || 0;
        if (activeSecs > 0) {
          attendance.totalHours = parseFloat((activeSecs / 3600).toFixed(4));
        } else if (attendance.checkInTime) {
          const diffMs = now - new Date(attendance.checkInTime);
          attendance.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(4));
        }
        attendance.status = attendance.totalHours < 7.5 ? 'Half Day' : 'Present';
        await attendance.save();
      }
    } catch (attErr) {
      console.error('[SYNC ATTENDANCE ERROR]', attErr);
    }

    const lastIdx = session.sessions.length - 1;
    if (lastIdx >= 0) {
      if (!session.sessions[lastIdx].pause && !session.sessions[lastIdx].end) {
        session.sessions[lastIdx].end = now;
      }
    }

    await session.save();

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.to(`user_${id}`).emit('timer_stopped', buildPayload(session));
      io.to(`user_${id}`).emit('timer_update', buildPayload(session));
    }

    res.json({ message: 'Tracking stopped', session: buildPayload(session) });
  } catch (err) {
    console.error('[STOP ERROR]', err);
    res.status(500).json({ message: 'Failed to stop', error: err.message });
  }
};

// ============================================================
// 🔄 HEARTBEAT / ACTIVITY UPDATE
// ============================================================
exports.updateActivity = async (req, res) => {
  try {
    if (!isDBConnected()) return res.json(mock);

    const { id } = req.user;
    const { type } = req.body;
    const now = new Date();

    const session = await TimeTrack.findOne({
      employeeId: id, date: getToday(), status: { $in: ['active', 'idle', 'paused'] }
    });

    if (!session) {
      // Auto-close stale previous day sessions at 23:59:59 of that day
      await closeStaleUserSessions(id, getToday());
      return res.status(404).json({ message: 'No active session' });
    }

    // 🏖️ Check if user has an approved leave today
    const { start: leaveStartBound, end: leaveEndBound } = getTodayLeaveBounds();
    const activeLeave = await Leave.findOne({
      user: id,
      status: 'approved',
      startDate: { $lte: leaveEndBound },
      endDate: { $gte: leaveStartBound }
    });

    if (activeLeave) {
      if (session && session.status !== 'completed') {
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
      return res.status(403).json({
        message: 'You are on approved Leave today.',
        isOnLeave: true,
        status: 'ON_LEAVE',
        leaveType: activeLeave.leaveType
      });
    }

    const normalizedType = String(type || '').toLowerCase();
    const isIdleSignal = normalizedType === 'idle';
    const isActiveSignal = ['mouse', 'keyboard', 'click', 'scroll', 'touch', 'focus', 'tab', 'active', 'heartbeat'].includes(normalizedType);

    if (session.status === 'active') {
      const sinceHeartbeat = session.lastHeartbeat
        ? (now - new Date(session.lastHeartbeat)) / 1000
        : 0;

      if (isIdleSignal) {
        // ── Idle transition ──
        if (!session.idleApplied) {
          // Flush active duration up to idle transition, deducting exact idle threshold/duration
          const idleDuration = Math.max(IDLE_THRESHOLD_SECONDS, parseInt(req.body.idleSeconds || IDLE_THRESHOLD_SECONDS, 10));
          const segmentDuration = flushSegment(session, now);
          const activeSegment = Math.max(0, segmentDuration - idleDuration);
          session.activeTime += activeSegment;
          session.idleTime += idleDuration;
          session.segmentStart = null;
          session.idleStart = now; // 🕒 Ongoing idle time accumulates from now
          session.inactivityCount += 1;
          session.idleApplied = true;

          const lastIdx = session.sessions.length - 1;
          if (lastIdx >= 0 && !session.sessions[lastIdx].pause && !session.sessions[lastIdx].end) {
            session.sessions[lastIdx].pause = now;
          }
        }

        session.status = 'idle';
        session.isRunning = false;
        session.segmentStart = null;
        session.lastHeartbeat = now;

        await session.save();

        const io = req.app?.get ? req.app.get('io') : null;
        if (io) {
          io.to(`user_${id}`).emit('timer_paused', {
            reason: 'inactivity',
            employeeId: id,
            ...buildPayload(session)
          });
        }

        return res.json(buildPayload(session));

      } else if (isActiveSignal) {
        // ── Normal active heartbeat ──
        session.lastHeartbeat = now;
      }

    } else if (session.status === 'idle') {
      session.lastHeartbeat = now;
      session.isRunning = false;
      session.segmentStart = null;
    }

    await session.save();
    res.json(buildPayload(session));
  } catch (err) {
    console.error('[HEARTBEAT ERROR]', err);
    res.status(500).json({ message: 'Heartbeat failed', error: err.message });
  }
};

// ============================================================
// 📡 GET SESSION STATUS  (frontend polls this every second)
// ============================================================
exports.getSessionStatus = async (req, res) => {
  try {
    if (!isDBConnected()) return res.json({ hasActiveSession: false, ...mock });

    const { id, role } = req.user;
    let targetId = id;
    if (req.query?.userId && (role === 'admin' || role === 'hr' || role === 'manager')) {
      targetId = req.query.userId;
    }
    const today = getToday();
    const session = await TimeTrack.findOne({
      employeeId: targetId, date: today
    }).sort({ createdAt: -1 });

    const attendance = await Attendance.findOne({ user: targetId, date: today });
    const isAttendanceCheckedOut = attendance && (attendance.checkOutTime || attendance.clockOut);

    // 🏖️ Check for approved leave today
    const { start: leaveStartBound, end: leaveEndBound } = getTodayLeaveBounds();
    const activeLeave = await Leave.findOne({
      user: targetId,
      status: 'approved',
      startDate: { $lte: leaveEndBound },
      endDate: { $gte: leaveStartBound }
    });

    if (activeLeave) {
      if (session && session.status !== 'completed') {
        const now = new Date();
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

      const leaveTypeName = activeLeave.leaveType ? (activeLeave.leaveType.charAt(0).toUpperCase() + activeLeave.leaveType.slice(1)) : 'Approved';
      return res.json({
        hasActiveSession: false,
        status: 'ON_LEAVE',
        isRunning: false,
        isOnLeave: true,
        leaveType: activeLeave.leaveType,
        leaveTypeName,
        leaveReason: activeLeave.reason,
        startDate: activeLeave.startDate,
        endDate: activeLeave.endDate,
        message: `You are on approved ${leaveTypeName} Leave today.`
      });
    }

    if (!session) {
      if (isAttendanceCheckedOut) {
        return res.json({
          hasActiveSession: false,
          status: 'completed',
          isRunning: false,
          activeTime: Math.floor((attendance.totalHours || 0) * 3600),
          idleTime: 0
        });
      }
      return res.json({
        hasActiveSession: false,
        status: 'OFFLINE',
        isRunning: false,
        activeTime: 0,
        idleTime: 0
      });
    }

    if (session.status === 'completed' || isAttendanceCheckedOut) {
      return res.json({
        hasActiveSession: false,
        status: 'completed',
        isRunning: false,
        activeTime: Math.floor(session.activeTime || (attendance?.totalHours ? attendance.totalHours * 3600 : 0)),
        idleTime: Math.floor(session.idleTime || 0)
      });
    }

    // 🛡️ Dead-Man's Switch: If session is active but no heartbeat for > 25 seconds, auto-pause it immediately
    if (session.status === 'active' && session.lastHeartbeat) {
      const secondsSinceHeartbeat = (Date.now() - new Date(session.lastHeartbeat).getTime()) / 1000;
      if (secondsSinceHeartbeat > 25) {
        const pauseTime = new Date(session.lastHeartbeat);
        session.activeTime += flushSegment(session, pauseTime);
        session.segmentStart = null;
        session.idleStart = pauseTime;
        session.status = 'paused';
        session.isRunning = false;

        const lastIdx = (session.sessions || []).length - 1;
        if (lastIdx >= 0 && !session.sessions[lastIdx].pause && !session.sessions[lastIdx].end) {
          session.sessions[lastIdx].pause = pauseTime;
        }

        await session.save();

        const io = req.app?.get ? req.app.get('io') : null;
        if (io) {
          io.to(`user_${targetId}`).emit('timer_paused', {
            reason: 'stale_heartbeat',
            employeeId: targetId,
            ...buildPayload(session)
          });
        }
      }
    }

    // ── Session Status ──
    res.json(buildPayload(session));
  } catch (err) {
    console.error('[STATUS ERROR]', err);
    res.status(500).json({ message: 'Status check failed', error: err.message });
  }
};

// ============================================================
// 📊 ANALYTICS / VIEWS  (unchanged logic, just cleaner)
// ============================================================
exports.getTimeSummary = async (req, res) => {
  try {
    if (!isDBConnected()) return res.json({ stats: { active: 0, idle: 0, total: 0, productivity: 0 }, chartData: [], logs: [] });

    const filter = getRoleFilter(req.user);

    const { timeRange } = req.query;
    let limitCount = 30; // default 30 days
    if (timeRange === '7days') limitCount = 7;
    else if (timeRange === 'year') limitCount = 365;

    const sessions = await TimeTrack.find(filter).sort({ date: -1 }).limit(limitCount);
    const today = getToday();
    const todayData = sessions.filter(s => s.date === today);

    const stats = {
      active: todayData.reduce((a, s) => a + (s.activeTime || 0), 0),
      idle: todayData.reduce((a, s) => a + (s.idleTime || 0), 0),
      total: todayData.reduce((a, s) => a + (s.activeTime || 0) + (s.idleTime || 0), 0),
      productivity: 0
    };
    const total = stats.active + stats.idle;
    if (total > 0) stats.productivity = Math.round((stats.active / total) * 100);

    const chartMap = {};
    sessions.forEach(s => {
      if (!chartMap[s.date]) chartMap[s.date] = { date: s.date, active: 0, idle: 0 };
      chartMap[s.date].active += (s.activeTime || 0) / 3600;
      chartMap[s.date].idle += (s.idleTime || 0) / 3600;
    });

    res.json({ stats, chartData: Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date)), logs: sessions.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ message: 'Summary failed', error: err.message });
  }
};

exports.getTimeByDate = async (req, res) => {
  try {
    const filter = { ...getRoleFilter(req.user), date: req.params.date };
    res.json(await TimeTrack.find(filter).populate('employeeId', 'name fullName email'));
  } catch (err) { res.status(500).json({ message: 'Date fetch failed', error: err.message }); }
};

exports.getLogs = async (req, res) => {
  try {
    res.json(await TimeTrack.find(getRoleFilter(req.user)).sort({ createdAt: -1 }).populate('employeeId', 'name fullName email'));
  } catch (err) { res.status(500).json({ message: 'Logs failed', error: err.message }); }
};

exports.getMyTime = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = { employeeId: req.user.id };

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = startDate;
    }

    const myTracks = await TimeTrack.find(filter).sort({ date: -1 }).lean();
    const curTodayStr = getToday();
    for (const t of myTracks) {
      if (t.date !== curTodayStr) {
        const eodIST = new Date(`${t.date}T23:59:59+05:30`);
        if (t.endTime && new Date(t.endTime) > eodIST) {
          t.endTime = eodIST;
        }
        if (t.status === 'active' || t.status === 'paused' || t.status === 'idle') {
          t.status = 'completed';
          t.isRunning = false;
          t.endTime = eodIST;
        }
      }
    }
    res.json(myTracks);
  } catch (err) { res.status(500).json({ message: 'My logs failed', error: err.message }); }
};


exports.getHRTime = async (req, res) => {
  try {
    res.json(await TimeTrack.find({ employeeRole: { $in: ['employee', 'manager'] } }).sort({ date: -1 }).populate('employeeId', 'name fullName email').lean());
  } catch (err) { res.status(500).json({ message: 'HR logs failed', error: err.message }); }
};

exports.getAllTime = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    let filter = {};
    if (userRole === 'hr') {
      const User = require('../models/User');
      const nonAdminUsers = await User.find({ role: { $not: /admin/i } }).select('_id');
      const allowedIds = nonAdminUsers.map(u => u._id);
      filter = {
        employeeId: { $in: allowedIds },
        employeeRole: { $not: /admin/i }
      };
    } else if (userRole === 'manager') {
      const User = require('../models/User');
      const Employee = require('../models/Employee');
      const directUsers = await User.find({
        role: { $nin: ['admin', 'hr', 'superadmin'] },
        $or: [
          { reportingManager: req.user.id },
          { managerId: req.user.id }
        ]
      }).select('_id').lean();
      const directIds = directUsers.map(u => u._id);

      const empDocs = await Employee.find({
        $or: [
          { managerId: req.user.id },
          { reportingManager: req.user.id }
        ]
      }).select('userId').lean();
      const empIds = empDocs.filter(e => e.userId).map(e => e.userId);

      let allowedIds = Array.from(new Set([...directIds.map(String), ...empIds.map(String)]));
      if (allowedIds.length === 0) {
        const unassigned = await User.find({
          role: { $in: ['employee', 'staff'] },
          reportingManager: { $in: [req.user.id, null, undefined] }
        }).select('_id').lean();
        allowedIds = unassigned.map(u => u._id.toString());
      }
      if (!allowedIds.includes(String(req.user.id))) {
        allowedIds.push(String(req.user.id));
      }
      filter = { employeeId: { $in: allowedIds } };
    }
    const tracks = await TimeTrack.find(filter).sort({ date: -1 }).populate('employeeId', 'name fullName email role').lean();
    
    // 🕒 LIVE CALCULATION: Compute live active time for all team members for today
    const now = new Date();
    const curTodayStr = getToday();
    for (const t of tracks) {
      if (t.date === curTodayStr) {
        let liveActive = Math.floor(t.activeTime || 0);
        let liveIdle = Math.floor(t.idleTime || 0);

        if (t.status === 'active' && t.isRunning && t.segmentStart) {
          const elapsed = Math.floor((now.getTime() - new Date(t.segmentStart).getTime()) / 1000);
          liveActive += Math.max(0, elapsed);
        } else if ((t.status === 'idle' || t.status === 'paused') && t.idleStart) {
          const idleElapsed = Math.floor((now.getTime() - new Date(t.idleStart).getTime()) / 1000);
          liveIdle += Math.max(0, idleElapsed);
        }
        t.activeTime = liveActive;
        t.idleTime = liveIdle;
        t.totalTime = liveActive + liveIdle;
      } else {
        const eodIST = new Date(`${t.date}T23:59:59+05:30`);
        if (t.endTime && new Date(t.endTime) > eodIST) {
          t.endTime = eodIST;
        }
        if (t.status === 'active' || t.status === 'paused' || t.status === 'idle') {
          t.status = 'completed';
          t.isRunning = false;
          t.endTime = eodIST;
        }
      }
    }

    const result = userRole === 'hr'
      ? tracks.filter(t => {
          const r = (t.employeeId?.role || t.employeeRole || '').toLowerCase();
          const n = (t.employeeId?.name || t.employeeId?.fullName || '').toLowerCase();
          return !r.includes('admin') && !n.includes('admin');
        })
      : tracks;
    res.json(result);
  } catch (err) { res.status(500).json({ message: 'All logs failed', error: err.message }); }
};

exports.getAllTimeLogs = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, role } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = startDate;
    }

    if (employeeId) filter.employeeId = employeeId;
    if (role) filter.employeeRole = role;

    const logs = await TimeTrack.find(filter)
      .populate('employeeId', 'name fullName email role')
      .sort({ date: -1, createdAt: -1 });

    // Deduplicate logs by employeeId + date (keeping the latest record)
    const uniqueMap = new Map();
    for (const log of logs) {
      const empId = log.employeeId?._id ? log.employeeId._id.toString() : (log.employeeId ? log.employeeId.toString() : '');
      const key = `${empId}_${log.date}`;
      if (empId && !uniqueMap.has(key)) {
        uniqueMap.set(key, log);
      }
    }

    // Also include checked-in Attendance records if no TimeTrack log exists for that user+date
    const Attendance = require('../models/Attendance');
    let attFilter = {};
    if (startDate && endDate) {
      attFilter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      attFilter.date = startDate;
    }

    const attRecords = await Attendance.find(attFilter).populate('user', 'name fullName email role').lean();
    const curTodayStr = getToday();
    for (const att of attRecords) {
      if (!att.user) continue;
      const empId = att.user._id ? att.user._id.toString() : att.user.toString();
      const key = `${empId}_${att.date}`;
      if (!uniqueMap.has(key)) {
        const formatTimeStr = (dStr) => {
          if (!dStr) return '--';
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return String(dStr);
          return d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
        };

        const activeSecs = (att.totalHours || 0) * 3600;
        const eodIST = new Date(`${att.date}T23:59:59+05:30`);
        let effectiveEnd = att.checkOutTime;
        if (att.date !== curTodayStr) {
          if (effectiveEnd && new Date(effectiveEnd) > eodIST) {
            effectiveEnd = eodIST;
          } else if (!effectiveEnd && att.checkInTime) {
            effectiveEnd = eodIST;
          }
        }

        uniqueMap.set(key, {
          _id: att._id.toString(),
          employeeId: att.user,
          date: att.date,
          activeTime: activeSecs,
          idleTime: 0,
          totalTime: activeSecs,
          startTime: att.checkInTime ? formatTimeStr(att.checkInTime) : '--',
          endTime: effectiveEnd ? formatTimeStr(effectiveEnd) : '--',
          status: att.status === 'Present' || att.status === 'Half Day' || att.status === 'Late' ? 'completed' : 'not_started',
          pauses: 0,
          breakTime: 0,
          logs: []
        });
      }
    }

    let uniqueLogs = Array.from(uniqueMap.values());
    for (const log of uniqueLogs) {
      if (log.date !== curTodayStr) {
        const eodIST = new Date(`${log.date}T23:59:59+05:30`);
        if (log.endTime && new Date(log.endTime) > eodIST) {
          log.endTime = eodIST;
        }
      }
    }

    if (req.user && req.user.role === 'manager') {
      uniqueLogs = uniqueLogs.filter(log => {
        const empRole = (log.employeeId?.role || '').toLowerCase();
        const empName = (log.employeeId?.name || log.employeeId?.fullName || '').toLowerCase();
        if (empRole === 'admin' || empRole === 'hr' || empRole === 'superadmin') return false;
        if (empName.includes('admin') || empName.includes('hr manager')) return false;
        return true;
      });
    } else if (req.user && req.user.role === 'hr') {
      uniqueLogs = uniqueLogs.filter(log => {
        const empRole = (log.employeeId?.role || '').toLowerCase();
        const empName = (log.employeeId?.name || log.employeeId?.fullName || '').toLowerCase();
        if (empRole === 'admin' || empRole === 'superadmin') return false;
        if (empName.includes('admin')) return false;
        return true;
      });
    }

    res.json(uniqueLogs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch all logs', error: err.message });
  }
};

exports.exportTimeLogs = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, role } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = startDate;
    }

    if (employeeId) filter.employeeId = employeeId;
    if (role) filter.employeeRole = role;

    const logs = await TimeTrack.find(filter)
      .populate('employeeId', 'name fullName email')
      .sort({ date: -1 });

    const csvRows = [];
    csvRows.push(['Employee Name', 'Role', 'Date', 'Check-in Time', 'Stop Time', 'Pauses', 'Total Break (mins)', 'Total Hours', 'Auto Stop?'].join(','));

    for (const log of logs) {
      const name = log.employeeId?.fullName || log.employeeId?.name || 'Unknown';
      const roleStr = log.employeeRole || 'N/A';
      const date = log.date;
      const checkin = log.startTime ? new Date(log.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
      const checkout = log.endTime ? new Date(log.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
      const pauses = log.events ? log.events.filter(e => e.type === 'pause').length : 0;
      const totalBreak = Math.floor((log.idleTime || 0) / 60);
      const activeSecs = log.totalActiveTime || log.activeTime || 0;
      const h = Math.floor(activeSecs / 3600);
      const m = Math.floor((activeSecs % 3600) / 60);
      const totalHours = `${h}h ${m}m`;
      const isAuto = log.isAutoStop ? 'Yes' : 'No';

      csvRows.push([
        `"${name}"`,
        `"${roleStr}"`,
        date,
        checkin,
        checkout,
        pauses,
        totalBreak,
        `"${totalHours}"`,
        isAuto
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=hr_logs_${Date.now()}.csv`);
    res.status(200).send(csvRows.join('\n'));
  } catch (err) {
    res.status(500).json({ message: 'Failed to export logs', error: err.message });
  }
};

exports.getCalendarData = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;

    if (req.user.id !== employeeId && req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const regex = new RegExp(`^${month}`);
    const tracks = await TimeTrack.find({ employeeId, date: { $regex: regex } }).select('date totalTime totalActiveTime status');

    res.json(tracks);
  } catch (err) {
    res.status(500).json({ message: 'Calendar data failed', error: err.message });
  }
};

exports.getDailyData = async (req, res) => {
  try {
    const { employeeId, date } = req.params;

    if (req.user.id !== employeeId && req.user.role !== 'admin' && req.user.role !== 'hr' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const track = await TimeTrack.findOne({ employeeId, date });
    if (!track) return res.status(404).json({ message: 'No data for this date' });

    res.json({
      date: track.date,
      startTime: track.startTime,
      endTime: track.endTime,
      totalWorkedDuration: Math.floor((track.activeTime || 0) / 60),
      totalPauseDuration: Math.floor((track.idleTime || 0) / 60),
      pauseEvents: track.sessions ? track.sessions.filter(s => s.pause) : [],
      sessions: track.sessions || [],
      isAutoStop: track.isAutoStop || false
    });
  } catch (err) {
    res.status(500).json({ message: 'Daily data failed', error: err.message });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const { timeRange, userFilter, roleFilter } = req.query;
    let filter = getRoleFilter(req.user);
    if (userFilter) filter.employeeId = userFilter;
    if (roleFilter) filter.employeeRole = roleFilter;

    const now = new Date();
    const today = getToday();

    if (timeRange === 'weekly' || timeRange === 'week') {
      const d = new Date(); d.setDate(now.getDate() - 7);
      filter.date = { $gte: d.toISOString().split('T')[0] };
    } else if (timeRange === 'monthly' || timeRange === 'month') {
      const d = new Date(); d.setMonth(now.getMonth() - 1);
      filter.date = { $gte: d.toISOString().split('T')[0] };
    } else if (timeRange === 'quarterly' || timeRange === 'quarter') {
      const d = new Date(); d.setMonth(now.getMonth() - 3);
      filter.date = { $gte: d.toISOString().split('T')[0] };
    } else if (timeRange === 'yearly' || timeRange === 'year') {
      const d = new Date(); d.setFullYear(now.getFullYear() - 1);
      filter.date = { $gte: d.toISOString().split('T')[0] };
    } else if (timeRange === 'today') {
      filter.date = today;
    }

    const sessions = await TimeTrack.find(filter).sort({ date: -1, createdAt: -1 }).populate('employeeId', 'name fullName email role').lean();
    const stats = {
      totalTime: sessions.reduce((a, s) => a + (s.activeTime || 0) + (s.idleTime || 0), 0),
      activeTime: sessions.reduce((a, s) => a + (s.activeTime || 0), 0),
      idleTime: sessions.reduce((a, s) => a + (s.idleTime || 0), 0),
      sessions: sessions.length
    };

    const chartMap = {};
    sessions.forEach(s => {
      if (!chartMap[s.date]) chartMap[s.date] = { date: s.date, active: 0, idle: 0, total: 0 };
      chartMap[s.date].active += (s.activeTime || 0) / 3600;
      chartMap[s.date].idle += (s.idleTime || 0) / 3600;
      chartMap[s.date].total += ((s.activeTime || 0) + (s.idleTime || 0)) / 3600;
    });

    res.json({
      stats,
      chartData: Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date)),
      tableData: sessions.map(s => ({
        id: s._id, name: s.employeeId?.name || s.employeeId?.fullName || 'Unknown',
        role: s.employeeId?.role || s.employeeRole || 'N/A',
        status: s.status, todayHours: s.activeTime, lastActivity: s.lastHeartbeat
      })),
      activityLogs: sessions.slice(0, 10).map(s => ({
        name: s.employeeId?.name || s.employeeId?.fullName || 'Unknown', date: s.date,
        activeTime: s.activeTime, status: s.status
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Dashboard failed', error: err.message });
  }
};

exports.getDailySummaryLogs = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { range, startDate, endDate, month } = req.query;

    if (req.user.id !== employeeId && req.user.role !== 'admin' && req.user.role !== 'hr' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    let filter = { employeeId };

    if (range === 'month' && month) {
      filter.date = { $regex: `^${month}` };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    }

    const sessions = await TimeTrack.find(filter).sort({ date: -1, createdAt: -1 });

    const uniqueMap = new Map();
    for (const track of sessions) {
      if (!uniqueMap.has(track.date)) {
        uniqueMap.set(track.date, track);
      }
    }

    const summary = Array.from(uniqueMap.values()).map(track => {
      const isToday = track.date === getToday();
      const isLive = isToday && track.status === 'active';
      return {
        date: track.date,
        checkIn: track.startTime,
        checkOut: track.endTime,
        totalHours: track.activeTime || 0,
        isAutoStop: track.isAutoStop || false,
        isLive,
        status: track.status
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summary logs', error: err.message });
  }
};

// ============================================================
// 📋 MEETING / OFFLINE ACTIVITY REQUESTS
// ============================================================

/**
 * Submit a meeting / offline activity request.
 * Strict Inactive Time Ceiling: Requested minutes cannot exceed the employee's recorded inactive time!
 */
exports.submitOfflineRequest = async (req, res) => {
  try {
    const { reason, durationMinutes, date } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason for meeting / offline activity is required.' });
    }

    const minutesNum = parseInt(durationMinutes, 10);
    if (isNaN(minutesNum) || minutesNum <= 0) {
      return res.status(400).json({ message: 'Please provide a valid duration in minutes (greater than 0).' });
    }

    const targetDate = date || getToday();

    // 🛡️ Prevent rapid duplicate submission (e.g. double-click race condition within 3 seconds)
    const recentDuplicate = await OfflineRequest.findOne({
      employeeId: req.user.id,
      date: targetDate,
      reason: reason.trim(),
      requestedDurationMinutes: minutesNum,
      createdAt: { $gte: new Date(Date.now() - 3000) }
    });
    if (recentDuplicate) {
      return res.status(200).json({
        message: 'Meeting request submitted successfully!',
        request: recentDuplicate
      });
    }

    // 🛡️ Resolve reporting manager and employee ID
    let managerId = null;
    let empId = req.user.employeeId || '';
    const employeeDoc = await Employee.findOne({ userId: req.user.id });
    if (employeeDoc) {
      managerId = employeeDoc.reportingManager || employeeDoc.managerId || null;
      if (!empId && employeeDoc.employeeId) empId = employeeDoc.employeeId;
    }
    if (!managerId) {
      const userDoc = await User.findById(req.user.id);
      if (userDoc?.reportingManager) managerId = userDoc.reportingManager;
    }

    // 🛡️ INACTIVE TIME CEILING VALIDATION:
    // Check recorded inactive time for this employee on the target date
    const timeTrack = await TimeTrack.findOne({ employeeId: req.user.id, date: targetDate });
    let recordedInactiveSec = Math.floor(timeTrack?.idleTime || 0);

    // If currently idle or paused, add the live ongoing idle duration
    if (timeTrack && (timeTrack.status === 'idle' || timeTrack.status === 'paused') && timeTrack.idleStart) {
      const ongoing = Math.floor((Date.now() - new Date(timeTrack.idleStart).getTime()) / 1000);
      recordedInactiveSec += Math.max(0, ongoing);
    }

    const maxAllowedMinutes = Math.floor(recordedInactiveSec / 60);

    if (maxAllowedMinutes <= 0) {
      return res.status(400).json({
        message: 'No recorded inactive time available to convert for this date. You can only request meeting time if inactive time was recorded.'
      });
    }

    if (minutesNum > maxAllowedMinutes) {
      return res.status(400).json({
        message: `Requested duration (${minutesNum} mins) cannot exceed your recorded inactive time of ${maxAllowedMinutes} mins.`
      });
    }

    const newRequest = await OfflineRequest.create({
      employeeId: req.user.id,
      employeeName: req.user.name || 'Employee',
      employeeRole: req.user.role || 'employee',
      empId: empId,
      managerId: managerId,
      date: targetDate,
      reason: reason.trim(),
      recordedInactiveMinutes: maxAllowedMinutes,
      requestedDurationMinutes: minutesNum,
      approvedDurationMinutes: 0,
      status: 'pending'
    });

    // 🔔 Notify Manager and HR via Socket.io and Notification Model
    const io = req.app?.get ? req.app.get('io') : null;
    const notifMessage = `${req.user.name || 'An employee'} submitted a meeting request for ${minutesNum} mins on ${targetDate}.`;

    if (managerId) {
      const mgrNotif = await Notification.create({
        userId: managerId,
        senderId: req.user.id,
        senderName: req.user.name || 'Employee',
        senderRole: req.user.role || 'employee',
        message: notifMessage,
        type: 'meeting_request'
      });
      if (io) {
        io.to(`user_${String(managerId)}`).emit('new_notification', mgrNotif);
      }
    }

    // Also notify HR and Admin
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } }, '_id');
    for (const hr of hrUsers) {
      if (String(hr._id) !== String(managerId) && String(hr._id) !== String(req.user.id)) {
        const hrNotif = await Notification.create({
          userId: hr._id,
          senderId: req.user.id,
          senderName: req.user.name || 'Employee',
          senderRole: req.user.role || 'employee',
          message: notifMessage,
          type: 'meeting_request'
        });
        if (io) {
          io.to(`user_${String(hr._id)}`).emit('new_notification', hrNotif);
        }
      }
    }

    res.status(201).json({
      message: 'Meeting / Offline request submitted successfully.',
      request: newRequest
    });
  } catch (err) {
    console.error('Error submitting offline request:', err);
    res.status(500).json({ message: 'Failed to submit request', error: err.message });
  }
};

/**
 * Fetch meeting / offline activity requests with role scoping & filters.
 */
exports.getOfflineRequests = async (req, res) => {
  try {
    const { status, search, date, startDate, endDate, page = 1, limit = 10 } = req.query;
    const userRole = (req.user.role || 'employee').toLowerCase();
    const query = {};

    // 🔒 Role Scoping
    if (userRole === 'employee') {
      query.employeeId = req.user.id;
    } else if (userRole === 'manager') {
      query.$or = [
        { managerId: req.user.id },
        { employeeId: req.user.id }
      ];
    }
    // Admin & HR see all

    // Status filter
    if (status && status !== 'All' && status !== 'all') {
      query.status = status.toLowerCase();
    }

    // Date filter (exact match or date range)
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    } else if (date) {
      if (date.includes(':')) {
        const [start, end] = date.split(':');
        query.date = { $gte: start, $lte: end };
      } else {
        query.date = date;
      }
    }

    // Search filter
    if (search && search.trim()) {
      const sRegex = new RegExp(search.trim(), 'i');
      const searchMatch = {
        $or: [
          { employeeName: sRegex },
          { empId: sRegex },
          { reason: sRegex },
          { employeeRole: sRegex }
        ]
      };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, searchMatch];
        delete query.$or;
      } else {
        Object.assign(query, searchMatch);
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      OfflineRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OfflineRequest.countDocuments(query)
    ]);

    res.json({
      requests,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (err) {
    console.error('Error fetching offline requests:', err);
    res.status(500).json({ message: 'Failed to fetch requests', error: err.message });
  }
};

/**
 * Approve or reject an offline request with editable final approved timer.
 * Managers can approve their team members, HR & Admin can approve all.
 */
exports.updateOfflineRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, finalMinutes, reviewRemarks } = req.body;
    const userRole = (req.user.role || '').toLowerCase();

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Status must be either 'approved' or 'rejected'." });
    }

    const request = await OfflineRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Offline request not found.' });
    }

    const targetRole = (request.employeeRole || 'employee').toLowerCase();
    const isOwnRequest = String(request.employeeId) === String(req.user.id);

    // 🔒 1. No self-approval unless Admin
    if (isOwnRequest && userRole !== 'admin') {
      return res.status(403).json({
        message: 'You cannot approve or reject your own meeting request. A higher authority must review it.'
      });
    }

    // 🔒 2. HR requests can ONLY be approved/rejected by Admin
    if (targetRole === 'hr' && userRole !== 'admin') {
      return res.status(403).json({
        message: 'HR meeting requests can only be approved or rejected by an Admin.'
      });
    }

    // 🔒 3. Manager requests can only be approved/rejected by HR or Admin
    if (targetRole === 'manager' && !['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({
        message: 'Manager meeting requests can only be approved or rejected by an HR or Admin.'
      });
    }

    // 🔒 4. Employee requests: Managers can only review direct reports
    if (targetRole === 'employee' && userRole === 'manager') {
      const isManager = String(request.managerId) === String(req.user.id);
      if (!isManager) {
        return res.status(403).json({
          message: 'You are only authorized to review requests from your direct reports.'
        });
      }
    }

    if (status === 'approved') {
      // 🛡️ Determine final approved duration
      const approvedMins = parseInt(finalMinutes !== undefined ? finalMinutes : request.requestedDurationMinutes, 10);
      if (isNaN(approvedMins) || approvedMins <= 0) {
        return res.status(400).json({ message: 'Approved duration must be a positive number of minutes.' });
      }

      // 🛡️ Inactive Time Ceiling: Approved minutes cannot exceed recorded inactive time
      if (approvedMins > request.recordedInactiveMinutes) {
        return res.status(400).json({
          message: `Approved time (${approvedMins} mins) cannot exceed the recorded inactive time (${request.recordedInactiveMinutes} mins).`
        });
      }

      request.status = 'approved';
      request.approvedDurationMinutes = approvedMins;
      request.reviewedBy = req.user.id;
      request.reviewerName = req.user.name || 'Manager';
      request.reviewRemarks = (reviewRemarks || '').trim();
      request.reviewedAt = new Date();
      await request.save();

      // 🎯 TRANSFER MATH: Deduct from Inactive Time and Add to Active Work Time in TimeTrack
      const approvedSeconds = approvedMins * 60;
      const timeTrack = await TimeTrack.findOne({ employeeId: request.employeeId, date: request.date });
      if (timeTrack) {
        const actualDeduct = Math.min(timeTrack.idleTime || 0, approvedSeconds);
        timeTrack.idleTime = Math.max(0, (timeTrack.idleTime || 0) - actualDeduct);
        timeTrack.activeTime = (timeTrack.activeTime || 0) + approvedSeconds;
        await timeTrack.save();
      }

      // 🎯 UPDATE ATTENDANCE RECORD (reflects added active work hours)
      const attendance = await Attendance.findOne({ user: request.employeeId, date: request.date });
      if (attendance) {
        const currentWork = parseFloat(attendance.workHours || attendance.totalHours) || 0;
        const additionalHours = approvedMins / 60;
        const updatedHours = (currentWork + additionalHours).toFixed(2);
        attendance.workHours = updatedHours;
        attendance.totalHours = updatedHours;
        attendance.effectiveHours = updatedHours;
        if (attendance.status === 'Absent' || attendance.status === 'absent') {
          attendance.status = 'Present';
        }
        await attendance.save();
      }

      // 🔔 Real-time notification to employee
      const io = req.app?.get ? req.app.get('io') : null;
      const empNotif = await Notification.create({
        userId: request.employeeId,
        senderId: req.user.id,
        senderName: req.user.name || 'Manager',
        senderRole: req.user.role || 'manager',
        message: `Your meeting request for ${request.date} has been approved for ${approvedMins} mins.`,
        type: 'meeting_request_approved'
      });
      if (io) {
        io.to(`user_${String(request.employeeId)}`).emit('new_notification', empNotif);
      }

      return res.json({
        message: `Meeting request approved for ${approvedMins} minutes.`,
        request
      });
    }

    if (status === 'rejected') {
      request.status = 'rejected';
      request.reviewedBy = req.user.id;
      request.reviewerName = req.user.name || 'Manager';
      request.reviewRemarks = (reviewRemarks || '').trim();
      request.reviewedAt = new Date();
      await request.save();

      // 🔔 Real-time notification to employee
      const io = req.app?.get ? req.app.get('io') : null;
      const empNotif = await Notification.create({
        userId: request.employeeId,
        senderId: req.user.id,
        senderName: req.user.name || 'Manager',
        senderRole: req.user.role || 'manager',
        message: `Your meeting request for ${request.date} was rejected.${request.reviewRemarks ? ` Reason: ${request.reviewRemarks}` : ''}`,
        type: 'meeting_request_rejected'
      });
      if (io) {
        io.to(`user_${String(request.employeeId)}`).emit('new_notification', empNotif);
      }

      return res.json({
        message: 'Meeting request rejected.',
        request
      });
    }
  } catch (err) {
    console.error('Error updating offline request status:', err);
    res.status(500).json({ message: 'Failed to update request status', error: err.message });
  }
};

// ============================================================
// 🔧 INTERNAL HELPERS
// ============================================================

/**
 * Flush the current active segment: returns seconds elapsed since segmentStart.
 * Does NOT mutate session — caller adds the result to session.activeTime.
 */
function flushSegment(session, now) {
  if (!session.segmentStart) return 0;
  const elapsed = (now - new Date(session.segmentStart)) / 1000;
  return Math.max(0, Math.floor(elapsed));
}

/**
 * Build the authoritative payload returned to frontend/Electron.
 * Frontend MUST display these values directly — no local math.
 */
function buildPayload(session) {
  const now = Date.now();
  let liveActive = Math.floor(session.activeTime || 0);
  let liveIdle = Math.floor(session.idleTime || 0);

  if (session.status === 'active' && session.segmentStart) {
    const elapsed = Math.floor((now - new Date(session.segmentStart).getTime()) / 1000);
    liveActive += Math.max(0, elapsed);
  } else if ((session.status === 'idle' || session.status === 'paused') && session.idleStart) {
    const idleElapsed = Math.floor((now - new Date(session.idleStart).getTime()) / 1000);
    liveIdle += Math.max(0, idleElapsed);
  }

  return {
    hasActiveSession: session.status !== 'completed',
    status: session.status,
    isRunning: session.isRunning,
    activeTime: liveActive,
    idleTime: liveIdle,
    idleStart: session.idleStart,
    inactivityCount: session.inactivityCount || 0,
    startTime: session.startTime,
    lastHeartbeat: session.lastHeartbeat,
    segmentStart: session.segmentStart
  };
}
