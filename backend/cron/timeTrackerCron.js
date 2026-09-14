const cron = require('node-cron');
const TimeTrack = require('../models/TimeTrack');
const Attendance = require('../models/Attendance');
const { autoRejectExpiredLeaves } = require('../utils/leaveUtils');
const { performBulkImport } = require('../controllers/holidayController');

function initCronJobs() {
  // Run on server startup to auto-reject any pending leaves whose dates have passed & sync holidays
  autoRejectExpiredLeaves();
  performBulkImport().catch(err => console.error('[CRON] Startup holiday sync failed:', err));

  // ── AUTO CHECKOUT AT 11:59 PM IST ──
  // Runs at 23:59 in Asia/Kolkata timezone every day.
  // Automatically checks out any employees who have checked in but not checked out by end of day.
  cron.schedule('59 23 * * *', async () => {
    console.log('[CRON] Running 11:59 PM IST auto-checkout for unchecked-out attendance records...');
    try {
      // Determine today's date string in IST (YYYY-MM-DD)
      const now = new Date();
      const todayIST = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(now);

      // Use 23:59:59 IST as the checkout time
      const checkoutTime = new Date(`${todayIST}T23:59:59+05:30`);

      // Find all today's Attendance records with no checkout
      const uncheckedOut = await Attendance.find({
        date: todayIST,
        checkOutTime: null
      });

      console.log(`[CRON] Found ${uncheckedOut.length} unchecked-out attendance record(s) for ${todayIST}`);

      for (const att of uncheckedOut) {
        const diffMs = checkoutTime - new Date(att.checkInTime);
        att.checkOutTime = checkoutTime;
        att.clockOut = '23:59';
        att.totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
        att.autoCheckout = true; // audit flag — system-initiated checkout
        await att.save();
        console.log(`[CRON] Auto-checkout applied → user: ${att.user}, date: ${todayIST}`);
      }

      // Also stop any still-active TimeTrack sessions for today
      const activeSessions = await TimeTrack.find({
        status: { $in: ['active', 'paused', 'idle'] },
        date: todayIST
      });

      for (const session of activeSessions) {
        if (session.status === 'active' && session.segmentStart) {
          const elapsed = (checkoutTime - new Date(session.segmentStart)) / 1000;
          session.activeTime += Math.max(0, Math.floor(elapsed));
        }

        const lastIdx = session.sessions.length - 1;
        if (lastIdx >= 0 && !session.sessions[lastIdx].end) {
          session.sessions[lastIdx].end = checkoutTime;
        }

        const lastPauseIdx = session.pauseEvents.length - 1;
        if (lastPauseIdx >= 0 && !session.pauseEvents[lastPauseIdx].resumeTime) {
          session.pauseEvents[lastPauseIdx].resumeTime = checkoutTime;
          const dur = Math.max(0, Math.round((checkoutTime - session.pauseEvents[lastPauseIdx].pauseTime) / 60000));
          session.pauseEvents[lastPauseIdx].durationMinutes = dur;
          session.totalPauseDuration += dur;
        }

        session.segmentStart = null;
        session.endTime = checkoutTime;
        session.status = 'completed';
        session.isRunning = false;
        session.isAutoStop = true;
        session.totalWorkedDuration = Math.round((session.activeTime || 0) / 60);

        await session.save();
        console.log(`[CRON] Auto-stopped TimeTrack session → employee: ${session.employeeId}`);
      }

      console.log(`[CRON] 11:59 PM IST auto-checkout completed for ${todayIST}.`);
    } catch (err) {
      console.error('[CRON] Failed to run 11:59 PM IST auto-checkout:', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Run every hour to auto-reject expired leaves
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running hourly check to auto-reject expired leaves...');
    await autoRejectExpiredLeaves();
  });

  // ── MIDNIGHT MAINTENANCE CRON ──
  // Runs at 00:00 every day (server time) as a catch-all for any sessions not closed by 11:59 PM cron.
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running midnight maintenance tasks (holiday sync, leave rejection, time tracker cleanup)...');

    // 1. Sync Google Public Holidays
    try {
      await performBulkImport();
      console.log('[CRON] Midnight Google holiday auto-sync completed.');
    } catch (err) {
      console.error('[CRON] Midnight holiday auto-sync failed:', err);
    }

    // 2. Auto-reject expired pending leaves
    try {
      await autoRejectExpiredLeaves();
      console.log('[CRON] Midnight expired leaves auto-rejection completed.');
    } catch (err) {
      console.error('[CRON] Midnight expired leaves auto-rejection failed:', err);
    }

    // 3. Catch-all: auto-stop any remaining active time tracker sessions
    try {
      const now = new Date();
      const sessions = await TimeTrack.find({ status: { $in: ['active', 'paused', 'idle'] } });

      for (const session of sessions) {
        if (session.status === 'active' && session.segmentStart) {
          const elapsed = (now - new Date(session.segmentStart)) / 1000;
          session.activeTime += Math.max(0, Math.floor(elapsed));
        }

        session.segmentStart = null;
        session.endTime = now;
        session.status = 'completed';
        session.isRunning = false;
        session.isAutoStop = true;
        session.totalWorkedDuration = Math.round((session.activeTime || 0) / 60);

        const lastIdx = session.sessions.length - 1;
        if (lastIdx >= 0) session.sessions[lastIdx].end = now;

        const lastPauseIdx = session.pauseEvents.length - 1;
        if (lastPauseIdx >= 0 && !session.pauseEvents[lastPauseIdx].resumeTime) {
          session.pauseEvents[lastPauseIdx].resumeTime = now;
          const dur = Math.max(0, Math.round((now - session.pauseEvents[lastPauseIdx].pauseTime) / 60000));
          session.pauseEvents[lastPauseIdx].durationMinutes = dur;
          session.totalPauseDuration += dur;
        }

        await session.save();
        console.log(`[CRON] Midnight catch-all: auto-stopped session for employee: ${session.employeeId}`);
      }

      // 4. Catch-all: auto-checkout any Attendance records from yesterday or older that are still open
      const openAttendances = await Attendance.find({ checkOutTime: null });
      for (const att of openAttendances) {
        const eodIST = new Date(`${att.date}T23:59:59+05:30`);
        const diffMs = eodIST - new Date(att.checkInTime);
        att.checkOutTime = eodIST;
        att.clockOut = '23:59';
        att.totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
        att.autoCheckout = true;
        await att.save();
        console.log(`[CRON] Midnight catch-all auto-checkout → user: ${att.user}, date: ${att.date}`);
      }

      console.log('[CRON] Midnight maintenance completed.');
    } catch (err) {
      console.error('[CRON] Failed to run midnight maintenance:', err);
    }
  });
}

module.exports = initCronJobs;
