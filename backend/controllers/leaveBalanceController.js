const LeaveBalance = require('../models/LeaveBalance');
const Leave = require('../models/Leave');
const User = require('../models/User');

// Helper: Calculate months between two dates
const getMonthsBetween = (start, end) => {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
};

exports.getLeaveBalance = async (req, res) => {
    try {
        const { id } = req.user;
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Get user join date from Employee profile
        const Employee = require('../models/Employee');
        const empProfile = await Employee.findOne({ userId: id }).select('joinDate');
        
        if (!empProfile || !empProfile.joinDate) {
            // Default to start of current year if not found to prevent crash, but log it
            console.warn(`[LEAVE SYSTEM] Join date missing for user ${id}. Defaulting to Jan 1st.`);
            const defaultDate = new Date(new Date().getFullYear(), 0, 1);
            var joinDate = defaultDate;
        } else {
            var joinDate = new Date(empProfile.joinDate);
        }

        const monthsDiff = getMonthsBetween(joinDate, now) + 1; // +1 to include current month

        // Ensure we have balance records for all months since join
        let totalEarned = 0;
        let totalUsed = 0;
        let lastRemaining = 0;

        for (let i = 0; i < monthsDiff; i++) {
            const date = new Date(joinDate.getFullYear(), joinDate.getMonth() + i, 1);
            const m = date.getMonth() + 1;
            const y = date.getFullYear();

            let balance = await LeaveBalance.findOne({ employeeId: id, month: m, year: y });

            if (!balance) {
                // Calculate used leave for this month
                const monthStart = new Date(y, m - 1, 1);
                const monthEnd = new Date(y, m, 0);

                const leavesInMonth = await Leave.find({
                    user: id,
                    status: 'approved',
                    startDate: { $gte: monthStart, $lte: monthEnd }
                });

                const usedInMonth = leavesInMonth.reduce((sum, l) => {
                    const diff = (new Date(l.endDate) - new Date(l.startDate)) / (1000 * 3600 * 24);
                    return sum + Math.max(1, Math.ceil(diff));
                }, 0);

                // Year transition carry forward rule: 50% carries forward into next year
                const effectiveCarryForward = (m === 1 && i > 0) ? Number((lastRemaining * 0.5).toFixed(1)) : lastRemaining;

                balance = await LeaveBalance.create({
                    employeeId: id,
                    month: m,
                    year: y,
                    earnedLeave: 1.5,
                    casualLeave: Number((1.5 + effectiveCarryForward).toFixed(1)),
                    usedLeave: usedInMonth,
                    carryForward: effectiveCarryForward,
                    remainingLeave: Number((1.5 + effectiveCarryForward - usedInMonth).toFixed(1))
                });
            }

            lastRemaining = balance.remainingLeave;
            totalEarned += balance.earnedLeave;
            totalUsed += balance.usedLeave;
        }

        res.json({
            totalEarned: parseFloat(totalEarned.toFixed(2)),
            totalUsed,
            remaining: parseFloat(lastRemaining.toFixed(2)),
            currentMonth: {
                month: currentMonth,
                year: currentYear,
                earned: 1.5,
                carried: parseFloat((lastRemaining - (1.5 - (await LeaveBalance.findOne({ employeeId: id, month: currentMonth, year: currentYear })).usedLeave)).toFixed(2)) // Simplified
            }
        });

    } catch (error) {
        console.error('Leave Balance Error:', error);
        res.status(500).json({ message: 'Failed to calculate leave balance', error: error.message });
    }
};
