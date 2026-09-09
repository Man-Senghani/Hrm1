const DailyReport = require('../models/DailyReport');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Project = require('../models/Project');
const Department = require('../models/Department');

// Helper for date formatting
const getTodayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Default project options required by initial business spec
const INITIAL_PROJECT_OPTIONS = [
  'HRMS',
  'Aupanishad',
  'MTK',
  'Client side work',
  'Management kinda thing'
];

// @desc    Get Available Project Names List
// @route   GET /api/daily-reports/projects
// @access  Private
exports.getProjectList = async (req, res) => {
  try {
    const dbProjects = await Project.find({}, 'projectName').lean();
    const dbProjectNames = dbProjects.map(p => p.projectName).filter(Boolean);
    const combined = Array.from(new Set([...INITIAL_PROJECT_OPTIONS, ...dbProjectNames]))
      .map(p => typeof p === 'string' ? p.trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad') : p)
      .filter(Boolean);
    res.json(Array.from(new Set(combined)));
  } catch (error) {
    console.error('Error fetching project list:', error);
    res.json(INITIAL_PROJECT_OPTIONS);
  }
};

// @desc    Submit Daily Work Report (Employee)
// @route   POST /api/daily-reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const { projectName, workDescription, hoursSpent, reportDate, status } = req.body;

    let finalProjectName = '';
    if (Array.isArray(projectName)) {
      finalProjectName = projectName.filter(Boolean).map(p => String(p).trim()).filter(Boolean).join(', ');
    } else if (typeof projectName === 'string') {
      finalProjectName = projectName.trim();
    }

    // Validation
    if (!finalProjectName) {
      return res.status(400).json({ message: 'Project Name is required' });
    }
    if (!workDescription || !workDescription.trim()) {
      return res.status(400).json({ message: 'Work Done description is required' });
    }
    const numericHours = parseFloat(hoursSpent);
    if (isNaN(numericHours) || numericHours <= 0) {
      return res.status(400).json({ message: 'Hours Spent must be a valid positive number' });
    }
    if (numericHours > 24) {
      return res.status(400).json({ message: 'Hours Spent cannot exceed 24 hours in a single day' });
    }

    const targetDate = reportDate ? String(reportDate).trim() : getTodayStr();

    // Restrict reportDate to last week (past 7 days up to today)
    const now = new Date();
    const minAllowedDate = new Date();
    minAllowedDate.setDate(now.getDate() - 7);
    const pad = (n) => String(n).padStart(2, '0');
    const minAllowedStr = `${minAllowedDate.getFullYear()}-${pad(minAllowedDate.getMonth() + 1)}-${pad(minAllowedDate.getDate())}`;
    const todayStr = getTodayStr();

    if (targetDate < minAllowedStr) {
      return res.status(400).json({
        message: 'You cannot submit reports for dates older than last week (past 7 days).'
      });
    }
    if (targetDate > todayStr) {
      return res.status(400).json({
        message: 'You cannot submit reports for future dates.'
      });
    }

    // Limit to max 2 reports per single date
    const dateReportsCount = await DailyReport.countDocuments({
      user: req.user.id,
      reportDate: targetDate
    });
    if (dateReportsCount >= 2) {
      return res.status(400).json({
        message: `Maximum 2 reports allowed per date. You have already submitted ${dateReportsCount} reports for ${targetDate}.`
      });
    }

    // Fetch employee details automatically from logged in session
    const employeeDoc = await Employee.findOne({ userId: req.user.id });
    let deptName = 'General';
    if (employeeDoc && employeeDoc.position) {
      deptName = employeeDoc.position;
    }

    // Check duplicate report for exact same user, project, and date
    const duplicate = await DailyReport.findOne({
      user: req.user.id,
      projectName: finalProjectName,
      reportDate: targetDate
    });

    if (duplicate) {
      return res.status(400).json({
        message: `You have already submitted a report for project "${finalProjectName}" on ${targetDate}. Please edit your existing report instead.`
      });
    }

    const newReport = await DailyReport.create({
      user: req.user.id,
      employee: employeeDoc ? employeeDoc._id : null,
      department: deptName,
      projectName: finalProjectName,
      workDescription: workDescription.trim(),
      hoursSpent: parseFloat(numericHours.toFixed(2)),
      reportDate: targetDate,
      status: status || 'Completed'
    });

    const populated = await DailyReport.findById(newReport._id)
      .populate('user', 'name email employeeId profileImage role')
      .populate('employee', 'fullName email department position profileImage');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating daily report:', error);
    res.status(500).json({ message: error.message || 'Failed to submit daily report' });
  }
};

// @desc    Get Logged-in Employee's Reports
// @route   GET /api/daily-reports/me
// @access  Private
exports.getMyReports = async (req, res) => {
  try {
    const { startDate, endDate, projectName, status, search, page = 1, limit = 20 } = req.query;

    const query = { user: req.user.id };

    if (projectName && projectName !== 'all') {
      query.projectName = new RegExp(projectName.trim(), 'i');
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (startDate && endDate) {
      query.reportDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.reportDate = { $gte: startDate };
    } else if (endDate) {
      query.reportDate = { $lte: endDate };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { projectName: regex },
        { workDescription: regex },
        { status: regex }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await DailyReport.countDocuments(query);
    const reports = await DailyReport.find(query)
      .sort({ reportDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('user', 'name email employeeId profileImage role')
      .populate('employee', 'fullName email department position');

    res.json({
      reports,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1
    });
  } catch (error) {
    console.error('Error fetching my daily reports:', error);
    res.status(500).json({ message: 'Failed to retrieve daily reports' });
  }
};

// @desc    Get All Reports for Higher Authority (Admin / HR / Manager)
// @route   GET /api/daily-reports
// @access  Private (Admin, HR, Manager)
exports.getAllReports = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const {
      employeeId,
      department,
      project,
      status,
      period, // 'today', 'yesterday', 'this_week', 'this_month', 'custom'
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    let baseQuery = {};

    // Manager Scoping: only show reports for employees managed by this manager
    if (userRole === 'manager') {
      const managedEmployees = await Employee.find({
        $or: [
          { managerId: req.user.id },
          { reportingManager: req.user.id }
        ]
      }, 'userId').lean();

      const managedUserIds = managedEmployees.map(e => e.userId).filter(Boolean);
      managedUserIds.push(req.user.id); // allow manager to see their own reports as well
      baseQuery.user = { $in: managedUserIds };
    }

    // Filter by specific Employee User ID
    if (employeeId && employeeId !== 'all') {
      baseQuery.user = employeeId;
    }

    // Filter by Department
    if (department && department !== 'all') {
      baseQuery.department = department;
    }

    // Filter by Project
    if (project && project !== 'all') {
      baseQuery.projectName = new RegExp(project.trim(), 'i');
    }

    // Filter by Status
    if (status && status !== 'all') {
      baseQuery.status = status;
    }

    // Filter by Date Range / Preset Period
    const todayStr = getTodayStr();
    if (period === 'today') {
      baseQuery.reportDate = todayStr;
    } else if (period === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      baseQuery.reportDate = `${yyyy}-${mm}-${dd}`;
    } else if (period === 'this_week') {
      const d = new Date();
      const day = d.getDay();
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diffToMonday));
      const mStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      baseQuery.reportDate = { $gte: mStr, $lte: todayStr };
    } else if (period === 'this_month') {
      const d = new Date();
      const firstDayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      baseQuery.reportDate = { $gte: firstDayStr, $lte: todayStr };
    } else if (startDate && endDate) {
      baseQuery.reportDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      baseQuery.reportDate = { $gte: startDate };
    } else if (endDate) {
      baseQuery.reportDate = { $lte: endDate };
    }

    // Text Search
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      
      // Search matching users/employees
      const matchingUsers = await User.find({
        $or: [{ name: regex }, { email: regex }, { employeeId: regex }]
      }, '_id').lean();
      const matchingUserIds = matchingUsers.map(u => u._id);

      baseQuery.$or = [
        { user: { $in: matchingUserIds } },
        { projectName: regex },
        { workDescription: regex },
        { department: regex }
      ];
    }

    // ── Calculate Real DB Summary Statistics ──
    const allFiltered = await DailyReport.find(baseQuery).lean();
    const totalReports = allFiltered.length;
    let completedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let onHoldCount = 0;
    let totalHours = 0;

    allFiltered.forEach(rep => {
      totalHours += rep.hoursSpent || 0;
      if (rep.status === 'Completed') completedCount++;
      else if (rep.status === 'In Progress') inProgressCount++;
      else if (rep.status === 'Pending') pendingCount++;
      else if (rep.status === 'On Hold') onHoldCount++;
    });

    // Pagination & Execution
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const reports = await DailyReport.find(baseQuery)
      .sort({ reportDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('user', 'name email employeeId profileImage role')
      .populate('employee', 'fullName email department position profileImage');

    res.json({
      reports,
      summary: {
        totalReports,
        completedCount,
        inProgressCount,
        pendingCount,
        onHoldCount,
        totalHours: parseFloat(totalHours.toFixed(2))
      },
      total: totalReports,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalReports / parseInt(limit, 10)) || 1
    });
  } catch (error) {
    console.error('Error fetching higher authority daily reports:', error);
    res.status(500).json({ message: 'Failed to retrieve daily reports data' });
  }
};

// @desc    Get Report Details By ID
// @route   GET /api/daily-reports/:id
// @access  Private
exports.getReportById = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id)
      .populate('user', 'name email employeeId profileImage role')
      .populate('employee', 'fullName email department position profileImage');

    if (!report) {
      return res.status(404).json({ message: 'Daily report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error getting daily report by id:', error);
    res.status(500).json({ message: 'Error retrieving report details' });
  }
};

// @desc    Update Daily Report
// @route   PUT /api/daily-reports/:id
// @access  Private
exports.updateReport = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Daily report not found' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    // Allow update if own report or higher authority (admin / hr)
    if (report.user.toString() !== req.user.id && !['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({ message: 'Not authorized to edit this report' });
    }

    const { projectName, workDescription, hoursSpent, reportDate, status } = req.body;
    if (projectName) {
      let finalProjectName = '';
      if (Array.isArray(projectName)) {
        finalProjectName = projectName.filter(Boolean).map(p => String(p).trim()).filter(Boolean).join(', ');
      } else if (typeof projectName === 'string') {
        finalProjectName = projectName.trim();
      }
      if (finalProjectName) report.projectName = finalProjectName;
    }
    if (workDescription) report.workDescription = workDescription.trim();
    if (hoursSpent !== undefined) {
      const h = parseFloat(hoursSpent);
      if (!isNaN(h) && h > 0) report.hoursSpent = parseFloat(h.toFixed(2));
    }
    if (reportDate) report.reportDate = reportDate.trim();
    if (status) report.status = status;

    await report.save();

    const updated = await DailyReport.findById(report._id)
      .populate('user', 'name email employeeId profileImage role')
      .populate('employee', 'fullName email department position');

    res.json(updated);
  } catch (error) {
    console.error('Error updating daily report:', error);
    res.status(500).json({ message: 'Failed to update daily report' });
  }
};

// @desc    Delete Daily Report
// @route   DELETE /api/daily-reports/:id
// @access  Private
exports.deleteReport = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Daily report not found' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    if (report.user.toString() !== req.user.id && !['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({ message: 'Not authorized to delete this report' });
    }

    await DailyReport.findByIdAndDelete(req.params.id);
    res.json({ message: 'Daily report deleted successfully' });
  } catch (error) {
    console.error('Error deleting daily report:', error);
    res.status(500).json({ message: 'Failed to delete daily report' });
  }
};
