const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const LeaveBalance = require('../models/LeaveBalance');
const mongoose = require('mongoose');

exports.getDashboardStats = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const attPeriod = req.query.attPeriod || 'This Week';
    const currentDayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 for Mon, 6 for Sun
    const startOfCurrentWeek = new Date(startOfToday);
    startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - currentDayOfWeek);

    if (attPeriod === 'Last Week') {
      startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - 7);
    }

    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 6);

    const startOfCurrentWeekStr = formatLocalDate(startOfCurrentWeek);
    const endOfCurrentWeekStr = formatLocalDate(endOfCurrentWeek);

    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const getPeriodLeaveMetrics = async (start, end) => {
      const matchQuery = {};
      if (start && end) {
        matchQuery.$or = [
          {
            startDate: { $lte: end },
            endDate: { $gte: start }
          },
          {
            createdAt: { $gte: start, $lte: end }
          }
        ];
      }

      const counts = await Leave.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      const result = { total: 0, approved: 0, rejected: 0, cancelled: 0, pending: 0 };
      counts.forEach(c => {
        const s = (c._id || '').toLowerCase();
        if (s === 'approved') result.approved += c.count;
        else if (s === 'rejected') result.rejected += c.count;
        else if (s === 'cancelled' || s === 'canceled') result.cancelled += c.count;
        else if (s.includes('pending')) result.pending += c.count;
      });
      result.total = result.approved + result.pending + result.rejected + result.cancelled;
      return result;
    };

    const getPeriodRecruitmentMetrics = async (startDate, endDate) => {
      const jobMatch = {};
      if (startDate && endDate) {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        jobMatch.$or = [
          { createdAt: { $gte: startDate, $lte: endDate } },
          { datePosted: { $gte: startStr, $lte: endStr } }
        ];
      }

      let jobs = await Job.find(startDate && endDate ? jobMatch : {}).lean();
      // If no jobs posted specifically in this period, fallback to all active jobs so current metrics stay meaningful
      if (jobs.length === 0 && (!startDate || endDate >= startOfMonth)) {
        jobs = await Job.find({}).lean();
      }

      const empMatch = {};
      if (startDate && endDate) {
        empMatch.$or = [
          { joinDate: { $gte: startDate, $lte: endDate } },
          { createdAt: { $gte: startDate, $lte: endDate } }
        ];
      }
      const hiresCount = await Employee.countDocuments(empMatch);

      let newApplications = 0;
      let shortlisted = 0;
      let interviewsScheduled = 0;
      let offersIssued = 0;
      let jobHires = 0;

      jobs.forEach(job => {
        const apps = Number(job.applicants) || 0;
        newApplications += apps;
        shortlisted += (typeof job.shortlisted === 'number' && job.shortlisted > 0) ? job.shortlisted : Math.round(apps * 0.4);
        interviewsScheduled += (typeof job.interviews === 'number' && job.interviews > 0) ? job.interviews : Math.round(apps * 0.2);
        offersIssued += (typeof job.offers === 'number' && job.offers > 0) ? job.offers : Math.round(apps * 0.08);
        jobHires += (typeof job.hired === 'number' && job.hired > 0) ? job.hired : 0;
      });

      return {
        newApplications,
        shortlisted,
        interviewsScheduled,
        offersIssued,
        hires: hiresCount > 0 ? hiresCount : jobHires
      };
    };

    // Pending leaves needs the current user's role first to scope the query,
    // but that chain is independent of everything else below, so it runs
    // alongside the rest as just one more branch of the big Promise.all.
    const getPendingLeavesData = async () => {
      const currentUser = await User.findById(req.user.id);
      let pendingLeaveQuery = { status: { $in: ['pending', 'cancellation_pending'] } };

      if (currentUser.role === 'hr') {
        const allowedUsers = await User.find({ role: 'employee' }).select('_id');
        pendingLeaveQuery.user = { $in: allowedUsers.map(u => u._id) };
      } else if (currentUser.role === 'manager') {
        const allowedUsers = await User.find({ role: 'employee' }).select('_id');
        pendingLeaveQuery.user = { $in: allowedUsers.map(u => u._id) };
      }

      return Leave.find(pendingLeaveQuery)
        .populate('user', 'name email role employeeId profileImage')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    };

    const adminUserIds = (await User.find({ role: { $regex: /^admin$/i } }).select('_id')).map(u => u._id);
    const hrEmpFilter = req.user.role === 'hr'
      ? {
          userId: { $nin: adminUserIds },
          role: { $not: /^admin$/i }
        }
      : {};

    // Every query below is independent of the others, so fetch them all
    // concurrently — total wait time becomes the slowest single query
    // instead of the sum of ~20 sequential round-trips.
    const [
      totalEmployees,
      activeEmployeesCount,
      newJoinersThisMonth,
      pendingLeaveApprovals,
      employeesOnLeaveToday,
      employeesPresentToday,
      [statsToday, statsThisWeek, statsThisMonth, statsThisYear, statsAllTime],
      [recThisMonth, recLastMonth, recThisYear, recAllTime],
      openPositions,
      payrollStats,
      attRecords,
      employees,
      recentJoiners,
      pendingLeaves,
      rawAnnouncements,
      activeEmps,
      wishesToday,
      upcomingHolidaysCount,
      currentMonthBalances,
      compOffsApproved,
      encashmentsPending,
      leaveAdjustments
    ] = await Promise.all([
      Employee.countDocuments(hrEmpFilter),
      Employee.countDocuments({ ...hrEmpFilter, status: { $in: ['active', 'Active'] } }),
      Employee.countDocuments({ ...hrEmpFilter, joinDate: { $gte: startOfMonth } }),
      req.user.role === 'hr'
        ? (async () => {
            const allowedUsers = await User.find({ role: 'employee' }).select('_id');
            return Leave.countDocuments({ user: { $in: allowedUsers.map(u => u._id) }, status: { $in: ['pending', 'cancellation_pending'] } });
          })()
        : Leave.countDocuments({ status: { $in: ['pending', 'cancellation_pending'] } }),
      (async () => {
        const leaveQuery = {
          status: { $regex: /^approved$/i },
          startDate: { $lte: endOfToday },
          endDate: { $gte: startOfToday }
        };
        if (req.user.role === 'hr') {
          const allowedUsers = await User.find({ role: { $in: ['employee', 'manager'] } }).select('_id');
          leaveQuery.user = { $in: allowedUsers.map(u => u._id) };
        }
        const approvedLeaves = await Leave.find(leaveQuery).select('user').lean();
        return new Set(approvedLeaves.map(l => (l.user?._id || l.user).toString())).size;
      })(),
      (async () => {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const records = await Attendance.find({
          $or: [
            { date: todayStr },
            { date: { $gte: startOfToday, $lte: endOfToday } }
          ],
          status: { $in: ['Present', 'Late', 'Half Day', 'present', 'late', 'half day'] }
        }).select('user').lean();
        return new Set(records.map(r => (r.user?._id || r.user).toString())).size;
      })(),
      Promise.all([
        getPeriodLeaveMetrics(startOfToday, endOfToday),
        getPeriodLeaveMetrics(startOfWeek, endOfWeek),
        getPeriodLeaveMetrics(startOfMonth, endOfMonth),
        getPeriodLeaveMetrics(startOfYear, endOfYear),
        getPeriodLeaveMetrics(null, null)
      ]),
      Promise.all([
        getPeriodRecruitmentMetrics(startOfMonth, endOfMonth),
        getPeriodRecruitmentMetrics(startOfLastMonth, endOfLastMonth),
        getPeriodRecruitmentMetrics(startOfYear, endOfYear),
        getPeriodRecruitmentMetrics(null, null)
      ]),
      Job.countDocuments({ status: { $regex: /^open$/i } }),
      Payroll.aggregate([
        { $match: { month: now.toLocaleString('default', { month: 'long', year: 'numeric' }) } },
        { $group: { _id: { $toLower: '$status' }, total: { $sum: '$netSalary' } } }
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: startOfCurrentWeekStr, $lte: endOfCurrentWeekStr } } },
        {
          $group: {
            _id: "$date",
            present: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "present"] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "absent"] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "late"] }, 1, 0] } },
            halfDay: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "half day"] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Employee.find(hrEmpFilter, 'userId gender').populate('userId', 'role').lean(),
      Employee.find(hrEmpFilter, 'fullName role joinDate profileImage userId').sort({ joinDate: -1 }).limit(5).populate('userId', 'name email profile').lean(),
      getPendingLeavesData(),
      Notification.find({
        $or: [
          { type: { $in: ['announcement', 'general', 'emergency', 'task', 'broadcast'] } },
          { userId: req.user.id },
          { senderId: req.user.id },
          { type: { $exists: false } }
        ]
      })
        .populate('senderId', 'name email role')
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
      Employee.find({ ...hrEmpFilter, status: { $in: ['active', 'Active'] } }, 'fullName userId dob joinDate profileImage role designation email').populate('userId', 'name profile email role').lean(),
      Notification.find({
        senderId: req.user.id,
        type: { $in: ['birthday', 'anniversary'] },
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      }).select('userId type').lean(),
      Holiday.countDocuments({
        date: { $gte: now, $lte: thirtyDaysFromNow }
      }),
      LeaveBalance.find({ month: now.getMonth() + 1, year: now.getFullYear() }).lean(),
      Leave.countDocuments({
        leaveType: { $regex: /comp/i },
        status: { $regex: /^approved$/i },
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Leave.countDocuments({
        leaveType: { $regex: /encashment/i },
        status: { $regex: /^pending$/i },
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      AuditLog.countDocuments({
        action: { $regex: /adjust/i },
        timestamp: { $gte: startOfMonth, $lte: endOfMonth }
      })
    ]);

    // Payroll Summary
    let processedPayroll = 0;
    let pendingPayroll = 0;
    payrollStats.forEach(stat => {
      if (stat._id === 'paid' || stat._id === 'processed') processedPayroll += stat.total;
      else pendingPayroll += stat.total;
    });

    // Attendance Overview (Current Week: Mon - Sun)
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const attendanceOverview = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfCurrentWeek);
      d.setDate(d.getDate() + i);
      const dStr = formatLocalDate(d);
      const match = attRecords.find(r => r._id === dStr);

      let present = match ? match.present : 0;
      let absent = match ? match.absent : 0;
      let late = match ? match.late : 0;
      let halfDay = match ? match.halfDay : 0;

      attendanceOverview.push({
        name: weekDays[i],
        present,
        absent,
        late,
        halfDay
      });
    }

    // Department & Gender Distribution
    const departmentDistribution = {};
    const genderDistribution = {};

    employees.forEach(emp => {
      const role = emp.userId?.role || 'employee';
      const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
      departmentDistribution[formattedRole] = (departmentDistribution[formattedRole] || 0) + 1;

      const gen = emp.gender || 'Unknown';
      genderDistribution[gen] = (genderDistribution[gen] || 0) + 1;
    });

    const deptChart = Object.keys(departmentDistribution).map(k => ({
      name: k, value: departmentDistribution[k]
    }));
    const genderChart = Object.keys(genderDistribution).map(k => ({
      name: k, value: genderDistribution[k]
    }));

    // Announcements & Latest Notifications from Database
    const announcements = [];
    const seenBatches = new Set();
    for (const item of rawAnnouncements) {
      if (item.type === 'birthday' || item.type === 'anniversary') continue;
      const key = item.batchId || String(item._id);
      if (!seenBatches.has(key)) {
        seenBatches.add(key);
        const sName = item.senderName || (item.senderId && typeof item.senderId === 'object' ? item.senderId.name : null) || (item.senderRole === 'admin' ? 'Admin' : 'HR Manager');
        const sRole = item.senderRole || (item.senderId && typeof item.senderId === 'object' ? item.senderId.role : null) || 'HR / Management';
        announcements.push({
          ...item,
          senderName: sName,
          senderRole: sRole
        });
      }
      if (announcements.length >= 3) break;
    }

    // Birthdays & Anniversaries (Upcoming in 30 days)
    const upcomingCelebrations = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of day for accurate day diff

    const wishedSet = new Set(wishesToday.map(w => `${w.type}-${String(w.userId)}`));

    activeEmps.forEach(emp => {
      const uId = emp.userId?._id || emp.userId;
      // Check Birthday
      if (emp.dob) {
        let nextBirthday = new Date(today.getFullYear(), emp.dob.getMonth(), emp.dob.getDate());
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        const diffDays = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          const isToday = diffDays === 0;
          const isWished = isToday ? wishedSet.has(`birthday-${String(uId)}`) : false;
          upcomingCelebrations.push({
            _id: `bday-${emp._id}`,
            employeeId: emp._id,
            userId: uId,
            name: emp.fullName || emp.userId?.name,
            profileImage: emp.profileImage,
            email: emp.email || emp.userId?.email,
            role: emp.role || emp.designation || 'Employee',
            type: 'Birthday',
            date: nextBirthday,
            diffDays,
            isToday,
            isWished
          });
        }
      }

      // Check Work Anniversary
      if (emp.joinDate) {
        let nextAnniversary = new Date(today.getFullYear(), emp.joinDate.getMonth(), emp.joinDate.getDate());
        if (nextAnniversary < today) {
          nextAnniversary.setFullYear(today.getFullYear() + 1);
        }
        const diffDays = Math.ceil((nextAnniversary - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          const years = nextAnniversary.getFullYear() - new Date(emp.joinDate).getFullYear();
          if (years > 0) {
            const isToday = diffDays === 0;
            const isWished = isToday ? wishedSet.has(`anniversary-${String(uId)}`) : false;
            upcomingCelebrations.push({
              _id: `anniv-${emp._id}`,
              employeeId: emp._id,
              userId: uId,
              name: emp.fullName || emp.userId?.name,
              profileImage: emp.profileImage,
              email: emp.email || emp.userId?.email,
              role: emp.role || emp.designation || 'Employee',
              type: `${years} Yr Anniversary`,
              date: nextAnniversary,
              diffDays,
              isToday,
              isWished
            });
          }
        }
      }
    });

    upcomingCelebrations.sort((a, b) => a.diffDays - b.diffDays);
    const topCelebrations = upcomingCelebrations.slice(0, 5);

    // Quick Stats
    let totalAllocatedDays = 0;
    currentMonthBalances.forEach(b => {
      totalAllocatedDays += (b.earnedLeave || 0) + (b.sickLeave || 0) + (b.casualLeave || 0) + (b.compOff || 0) + (b.otherLeaves || 0);
    });

    // Compile the response
    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          activeEmployees: activeEmployeesCount,
          activeEmployeesPercent: totalEmployees > 0 ? ((activeEmployeesCount / totalEmployees) * 100).toFixed(2) : 0,
          newJoiners: newJoinersThisMonth,
          employeesPresent: employeesPresentToday,
          employeesOnLeave: employeesOnLeaveToday,
          employeesOnLeavePercent: totalEmployees > 0 ? ((employeesOnLeaveToday / totalEmployees) * 100).toFixed(2) : 0,
          pendingLeaveApprovals,
          openPositions,
          leaveBalanceAllocated: totalAllocatedDays,
          upcomingHolidays: upcomingHolidaysCount,
          quickStats: {
            bulkAllocationDays: totalAllocatedDays,
            importedEmployees: newJoinersThisMonth,
            leaveAdjustments,
            compOffsApproved,
            encashmentsPending
          }
        },
        charts: {
          attendanceOverview,
          departmentDistribution: deptChart,
          genderDistribution: genderChart
        },
        leaveOverview: {
          total: statsThisMonth.total,
          approved: statsThisMonth.approved,
          rejected: statsThisMonth.rejected,
          cancelled: statsThisMonth.cancelled,
          pending: statsThisMonth.pending,
          byPeriod: {
            'This Month': statsThisMonth,
            'This Week': statsThisWeek,
            'This Year': statsThisYear,
            'All Time': statsAllTime,
            'Today': statsToday
          }
        },
        payrollSummary: {
          processed: processedPayroll,
          pending: pendingPayroll,
          total: processedPayroll + pendingPayroll
        },
        recruitmentOverview: {
          newApplications: recThisMonth.newApplications,
          shortlisted: recThisMonth.shortlisted,
          interviewsScheduled: recThisMonth.interviewsScheduled,
          offersIssued: recThisMonth.offersIssued,
          hires: recThisMonth.hires,
          hiresThisMonth: recThisMonth.hires,
          byPeriod: {
            'This Month': recThisMonth,
            'Last Month': recLastMonth,
            'This Year': recThisYear,
            'All Time': recAllTime
          }
        },
        recentJoiners: recentJoiners.map(r => ({
          _id: r._id,
          name: r.fullName || r.userId?.name,
          role: r.role,
          joinDate: r.joinDate,
          profileImage: r.profileImage || r.userId?.profile?.avatar
        })),
        pendingApprovals: pendingLeaves.map(l => {
          const diffDays = Math.max(1, Math.round((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1);
          const isCancelReq = l.status === 'cancellation_pending';
          return {
            _id: l._id,
            type: isCancelReq ? 'Cancellation Requested' : 'Leave Request',
            subType: isCancelReq ? 'Cancellation Requested' : l.leaveType,
            name: l.user?.name || 'Employee',
            email: l.user?.email || '',
            role: l.user?.role || 'employee',
            employeeId: l.user?.employeeId || '',
            profileImage: l.user?.profileImage || '',
            startDate: l.startDate,
            endDate: l.endDate,
            totalDays: l.totalDays || diffDays,
            reason: isCancelReq ? (l.cancellationReason || l.reason || 'Cancellation requested') : (l.reason || 'No reason provided'),
            status: l.status || 'pending',
            date: l.createdAt,
            details: `${new Date(l.startDate).toLocaleDateString()} - ${new Date(l.endDate).toLocaleDateString()}`
          };
        }),
        announcements,
        upcomingCelebrations: topCelebrations
      }
    });
  } catch (error) {
    console.error('HR Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard data' });
  }
};

exports.getLeaveAllocations = async (req, res) => {
  try {
    const { filter } = req.query;
    let query = {};
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    if (filter === 'this_month') {
      query = { month: currentMonth, year: currentYear };
    } else if (filter === 'last_month') {
      const targetMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const targetYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      query = { month: targetMonth, year: targetYear };
    } else if (filter === 'last_2_months') {
      const targetMonth1 = currentMonth === 1 ? 12 : currentMonth - 1;
      const targetYear1 = currentMonth === 1 ? currentYear - 1 : currentYear;
      const targetMonth2 = targetMonth1 === 1 ? 12 : targetMonth1 - 1;
      const targetYear2 = targetMonth1 === 1 ? targetYear1 - 1 : targetYear1;
      query = {
        $or: [
          { month: targetMonth1, year: targetYear1 },
          { month: targetMonth2, year: targetYear2 }
        ]
      };
    } else if (filter === 'this_year') {
      query = { year: currentYear };
    }

    const balances = await LeaveBalance.find(query);
    let totalEL = 0, totalSL = 0, totalCL = 0, totalCO = 0, totalOther = 0;
    balances.forEach(b => {
      totalEL += b.earnedLeave || 0;
      totalSL += b.sickLeave || 0;
      totalCL += b.casualLeave || 0;
      totalCO += b.compOff || 0;
      totalOther += b.otherLeaves || 0;
    });

    const total = totalEL + totalSL + totalCL + totalCO + totalOther;

    res.json({
      success: true,
      data: [
        { name: 'Earned Leave (EL)', value: totalEL, color: '#059669' },
        { name: 'Sick Leave (SL)', value: totalSL, color: '#2563eb' },
        { name: 'Casual Leave (CL)', value: totalCL, color: '#ea580c' },
        { name: 'Comp Off (CO)', value: totalCO, color: '#7c3aed' },
        { name: 'Other Leaves', value: totalOther, color: '#ec4899' }
      ],
      totalDays: total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const CompanyShutdown = require('../models/CompanyShutdown');
exports.getCompanyShutdowns = async (req, res) => {
  try {
    const shutdowns = await CompanyShutdown.find().sort({ startDate: 1 });
    res.json({ success: true, data: shutdowns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAttendanceReconciliation = async (req, res) => {
  try {
    const employees = await Employee.find({ status: { $in: ['active', 'Active'] } }, 'userId').populate('userId', 'role');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const userIds = employees.map(e => e.userId?._id).filter(Boolean);

    const attRecords = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: startOfMonth }
    });

    const reconciledSet = new Set(attRecords.map(a => String(a.user)));

    const deptMap = {};

    employees.forEach(emp => {
      const role = emp.userId?.role || 'employee';
      const deptName = role.charAt(0).toUpperCase() + role.slice(1);
      
      if (!deptMap[deptName]) {
        deptMap[deptName] = { dept: deptName, total: 0, reconciled: 0, pending: 0, status: '' };
      }

      deptMap[deptName].total++;

      const isReconciled = reconciledSet.has(String(emp.userId?._id));
      if (isReconciled) {
        deptMap[deptName].reconciled++;
      } else {
        deptMap[deptName].pending++;
      }
    });

    const data = Object.values(deptMap).map(d => {
      if (d.pending === 0 && d.total > 0) d.status = 'Completed';
      else if (d.reconciled === 0) d.status = 'Pending';
      else d.status = 'In Progress';
      return d;
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLeaveAudits = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    
    // Fetch real audit logs for the Leave module
    const logs = await AuditLog.find({ 
      $or: [
        { module: { $regex: /leave/i } },
        { action: { $regex: /leave/i } }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(5);
    
    // Format them for the frontend
    const formattedLogs = logs.map(log => {
      // Calculate time ago string
      const seconds = Math.floor((new Date() - new Date(log.timestamp)) / 1000);
      let timeStr = 'Just now';
      if (seconds > 86400) timeStr = Math.floor(seconds / 86400) + ' days ago';
      else if (seconds > 3600) timeStr = Math.floor(seconds / 3600) + ' hours ago';
      else if (seconds > 60) timeStr = Math.floor(seconds / 60) + ' minutes ago';

      let displayStatus = 'Completed';
      if (log.status === 'Warning' || log.status === 'Failed') displayStatus = 'Issues Found';
      else if (log.action.includes('Processing')) displayStatus = 'In Progress';

      return {
        img: `https://ui-avatars.com/api/?name=${encodeURIComponent(log.userName)}&background=random`,
        text: log.description,
        time: timeStr,
        status: displayStatus
      };
    });

    res.json({ success: true, data: formattedLogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
