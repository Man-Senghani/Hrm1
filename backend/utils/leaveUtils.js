const Leave = require('../models/Leave');

/**
 * Validates leave start and end dates according to leave type rules:
 * - Sick Leave (Option C):
 *   * Future dates are NOT allowed (cannot select future dates for sick leave)
 *   * Past dates allowed within current calendar month up to today
 * - Other Leave Types (Casual Leave, Earned Leave, etc.):
 *   * Past dates are NOT allowed
 *   * Can only apply up to 6 months in advance
 * 
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @param {string} leaveType
 * @returns {{ passed: boolean, error?: string }}
 */
const isLeaveDatePassed = (startDate, endDate, leaveType = '') => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const lType = String(leaveType || '').toLowerCase();
  const isSick = lType === 'sick' || lType === 'sl' || lType.includes('sick');

  if (isSick) {
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0);
    if (oneMonthAgo.getMonth() === now.getMonth()) {
      oneMonthAgo.setDate(0);
    }

    if (startDate) {
      const s = new Date(startDate);
      if (s > endOfToday) return { passed: true, error: 'Sick leave cannot be applied for future dates.' };
      if (s < oneMonthAgo) return { passed: true, error: 'Sick leave can only be applied for dates within the past 1 month up to today.' };
    }
    if (endDate) {
      const e = new Date(endDate);
      if (e > endOfToday) return { passed: true, error: 'Sick leave cannot be applied for future dates.' };
      if (e < oneMonthAgo) return { passed: true, error: 'Sick leave can only be applied for dates within the past 1 month up to today.' };
    }
    return { passed: false };
  }

  // Non-sick leaves:
  const maxFutureDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate(), 23, 59, 59, 999);

  if (startDate) {
    const s = new Date(startDate);
    const startDay = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    if (startDay < startOfToday) return { passed: true, error: 'Cannot apply for leave for dates that have already passed.' };
    if (s > maxFutureDate) return { passed: true, error: 'Leave cannot be applied more than 6 months in advance.' };
  }
  if (endDate) {
    const e = new Date(endDate);
    const endDay = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    if (endDay < startOfToday) return { passed: true, error: 'Cannot apply for leave for dates that have already passed.' };
    if (e > maxFutureDate) return { passed: true, error: 'Leave cannot be applied more than 6 months in advance.' };
  }
  return { passed: false };
};

/**
 * Finds all pending leaves whose requested dates have expired, marks them as 'rejected',
 * and notifies via Socket.io if available.
 * Excludes pending Sick Leaves that are within the current calendar month.
 * @param {object} io - Socket.io instance (optional)
 */
const autoRejectExpiredLeaves = async (io = null) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0);
    if (oneMonthAgo.getMonth() === now.getMonth()) {
      oneMonthAgo.setDate(0);
    }

    // Find all pending leaves where dates expired:
    // - Non-sick leaves where startDate or endDate is before start of today
    // - Sick leaves where startDate or endDate is before 1 month ago
    const expiredLeaves = await Leave.find({
      status: { $regex: /^pending$/i },
      $or: [
        {
          leaveType: { $nin: ['sick', 'sl', /sick/i] },
          $or: [
            { startDate: { $lt: startOfToday } },
            { endDate: { $lt: startOfToday } }
          ]
        },
        {
          leaveType: { $in: ['sick', 'sl', /sick/i] },
          $or: [
            { startDate: { $lt: oneMonthAgo } },
            { endDate: { $lt: oneMonthAgo } }
          ]
        }
      ]
    });

    if (expiredLeaves && expiredLeaves.length > 0) {
      for (const leave of expiredLeaves) {
        leave.status = 'rejected';
        leave.rejectionReason = 'Auto-rejected: Leave period expired (date passed without approval)';
        await leave.save();

        if (io && leave.user) {
          io.to(`user_${leave.user.toString()}`).emit('leave_updated', leave);
        }
      }
      console.log(`[Auto-Reject] ${expiredLeaves.length} expired pending leave(s) automatically marked as rejected.`);
    }
  } catch (error) {
    console.error('[Auto-Reject] Error auto-rejecting expired leaves:', error);
  }
};

module.exports = {
  isLeaveDatePassed,
  autoRejectExpiredLeaves
};
