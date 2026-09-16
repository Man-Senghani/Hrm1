const mongoose = require('mongoose');
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

// Seed initial projects into DB if empty
const ensureInitialProjects = async (userId) => {
  try {
    const count = await Project.countDocuments();
    if (count === 0) {
      const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
      const creatorId = adminUser ? adminUser._id : (userId || new mongoose.Types.ObjectId());
      const initialDocs = INITIAL_PROJECT_OPTIONS.map((name, idx) => ({
        projectName: name,
        orderIndex: idx,
        description: 'Default System Project',
        department: 'General',
        createdBy: creatorId,
        assignedManager: creatorId,
        status: 'active'
      }));
      await Project.insertMany(initialDocs);
    }
  } catch (err) {
    console.warn('Initial projects check error:', err.message);
  }
};

// @desc    Get Available Project Names List
// @route   GET /api/daily-reports/projects
// @access  Private
exports.getProjectList = async (req, res) => {
  try {
    await ensureInitialProjects(req.user?.id);
    const dbProjects = await Project.find({}, 'projectName orderIndex').sort({ orderIndex: 1, createdAt: 1 }).lean();
    let names = dbProjects.map(p => p.projectName).filter(Boolean);
    if (names.length === 0) {
      names = INITIAL_PROJECT_OPTIONS;
    }
    const sanitized = Array.from(new Set(
      names.map(p => typeof p === 'string' ? p.trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad') : p).filter(Boolean)
    ));
    res.json(sanitized);
  } catch (error) {
    console.error('Error fetching project list:', error);
    res.json(INITIAL_PROJECT_OPTIONS);
  }
};

// @desc    Add New Project to Available List
// @route   POST /api/daily-reports/projects
// @access  Private (Admin, HR, Manager)
exports.addProject = async (req, res) => {
  try {
    const rawName = req.body.projectName || req.body.name;
    const trimmed = (rawName || '').trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad');
    if (!trimmed) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    await ensureInitialProjects(req.user?.id);

    const existing = await Project.findOne({
      projectName: { $regex: new RegExp(`^${trimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ message: 'Project already exists' });
    }

    const highestOrder = await Project.findOne().sort({ orderIndex: -1 }).select('orderIndex').lean();
    const nextOrder = (highestOrder?.orderIndex ?? 0) + 1;

    await Project.create({
      projectName: trimmed,
      orderIndex: nextOrder,
      description: 'Project managed via Dropdown Setup',
      department: 'General',
      createdBy: req.user.id,
      assignedManager: req.user.id,
      status: 'active'
    });

    return exports.getProjectList(req, res);
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).json({ message: error.message || 'Server error adding project' });
  }
};

// @desc    Edit Existing Project Name
// @route   PUT /api/daily-reports/projects
// @access  Private (Admin, HR, Manager)
exports.editProject = async (req, res) => {
  try {
    const oldName = req.body.oldName || req.body.oldProjectName;
    const newName = req.body.newName || req.body.newProjectName;
    const oldTrimmed = (oldName || '').trim();
    const newTrimmed = (newName || '').trim().replace(/\bAupan\s+ishad\b/gi, 'Aupanishad');

    if (!oldTrimmed || !newTrimmed) {
      return res.status(400).json({ message: 'Old and new project names are required' });
    }

    await ensureInitialProjects(req.user?.id);

    // Check if target name already exists on another project
    const conflict = await Project.findOne({
      projectName: { $regex: new RegExp(`^${newTrimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
    });

    const oldProject = await Project.findOne({
      projectName: { $regex: new RegExp(`^${oldTrimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
    });

    if (conflict && (!oldProject || String(conflict._id) !== String(oldProject._id))) {
      return res.status(400).json({ message: 'Another project with this name already exists' });
    }

    if (oldProject) {
      oldProject.projectName = newTrimmed;
      await oldProject.save();
    } else {
      await Project.create({
        projectName: newTrimmed,
        description: 'Project managed via Dropdown Setup',
        department: 'General',
        createdBy: req.user.id,
        assignedManager: req.user.id,
        status: 'active'
      });
    }

    // Update existing DailyReport records that referenced oldName
    await DailyReport.updateMany(
      { projectName: oldTrimmed },
      { $set: { projectName: newTrimmed } }
    );

    return exports.getProjectList(req, res);
  } catch (error) {
    console.error('Error editing project:', error);
    res.status(500).json({ message: error.message || 'Server error editing project' });
  }
};

// @desc    Delete Project from Available List
// @route   DELETE /api/daily-reports/projects
// @access  Private (Admin, HR, Manager)
exports.deleteProject = async (req, res) => {
  try {
    const rawName = req.body.projectName || req.body.name || req.query.projectName || req.query.name;
    const trimmed = (rawName || '').trim();
    if (!trimmed) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    await Project.deleteMany({
      projectName: { $regex: new RegExp(`^${trimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
    });

    return exports.getProjectList(req, res);
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: error.message || 'Server error deleting project' });
  }
};

// @desc    Reorder Projects List
// @route   PUT /api/daily-reports/projects/reorder
// @access  Private (Admin, HR, Manager)
exports.reorderProjects = async (req, res) => {
  try {
    const { orderedProjects } = req.body;
    if (!Array.isArray(orderedProjects) || orderedProjects.length === 0) {
      return res.status(400).json({ message: 'orderedProjects array is required' });
    }

    const bulkOps = orderedProjects.map((name, index) => ({
      updateMany: {
        filter: { projectName: { $regex: new RegExp(`^${String(name).trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') } },
        update: { $set: { orderIndex: index } }
      }
    }));

    if (bulkOps.length > 0) {
      await Project.bulkWrite(bulkOps);
    }

    return exports.getProjectList(req, res);
  } catch (error) {
    console.error('Error reordering projects:', error);
    res.status(500).json({ message: error.message || 'Server error reordering projects' });
  }
};

// @desc    Submit Daily Work Report (Employee / HR / Manager / Admin)
// @route   POST /api/daily-reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const { projectName, workDescription, hoursSpent, reportDate, status, projectEntries } = req.body;

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

    // Fetch employee details automatically from logged in session
    const employeeDoc = await Employee.findOne({ userId: req.user.id });
    let deptName = 'General';
    if (employeeDoc && employeeDoc.position) {
      deptName = employeeDoc.position;
    }

    // ── MULTI-PROJECT BATCH SUBMISSION ──
    if (Array.isArray(projectEntries) && projectEntries.length > 0) {
      let totalBatchHours = 0;
      const sanitizedEntries = [];

      for (const item of projectEntries) {
        const pName = (item.projectName || '').trim();
        if (!pName) {
          return res.status(400).json({ message: 'Project Name is required for each entry' });
        }
        const desc = (item.workDescription || '').trim();
        if (!desc) {
          return res.status(400).json({ message: `Work description is required for project "${pName}"` });
        }
        const hrs = parseFloat(item.hoursSpent);
        if (isNaN(hrs) || hrs <= 0) {
          return res.status(400).json({ message: `Please enter valid positive hours for project "${pName}"` });
        }
        totalBatchHours += hrs;

        sanitizedEntries.push({
          projectName: pName,
          workDescription: desc,
          hoursSpent: parseFloat(hrs.toFixed(2)),
          status: ['Completed', 'In Progress', 'Pending', 'On Hold'].includes(item.status) ? item.status : 'Completed'
        });
      }

      if (totalBatchHours > 24) {
        return res.status(400).json({
          message: `Total hours across all projects (${totalBatchHours.toFixed(1)} hrs) cannot exceed 24 hours in a single day.`
        });
      }

      // Check maximum 1 daily report session per date for this user
      const existingCount = await DailyReport.countDocuments({
        user: req.user.id,
        reportDate: targetDate
      });
      if (existingCount >= 1) {
        return res.status(400).json({
          message: `You have already submitted a daily report for ${targetDate}. Only 1 report is allowed per day. Please edit your existing report instead.`
        });
      }

      const combinedProjectNames = sanitizedEntries.map(e => e.projectName).join(', ');
      const combinedDescriptions = sanitizedEntries.length === 1
        ? sanitizedEntries[0].workDescription
        : sanitizedEntries.map(e => `${e.projectName}: ${e.workDescription}`).join('\n');

      const allCompleted = sanitizedEntries.every(e => e.status === 'Completed');
      const hasInProgress = sanitizedEntries.some(e => e.status === 'In Progress');
      const hasPending = sanitizedEntries.some(e => e.status === 'Pending');
      const hasOnHold = sanitizedEntries.some(e => e.status === 'On Hold');
      const overallStatus = allCompleted ? 'Completed' : (hasInProgress ? 'In Progress' : (hasPending ? 'Pending' : (hasOnHold ? 'On Hold' : 'In Progress')));

      const newDoc = await DailyReport.create({
        user: req.user.id,
        employee: employeeDoc ? employeeDoc._id : null,
        department: deptName,
        projectName: combinedProjectNames,
        workDescription: combinedDescriptions,
        hoursSpent: parseFloat(totalBatchHours.toFixed(2)),
        reportDate: targetDate,
        status: overallStatus,
        projectEntries: sanitizedEntries,
        batchId: `batch_${req.user.id}_${Date.now()}`
      });

      const populated = await DailyReport.findById(newDoc._id)
        .populate('user', 'name email employeeId profileImage role')
        .populate('employee', 'fullName email department position profileImage');

      return res.status(201).json({
        success: true,
        message: 'Daily report submitted successfully!',
        report: populated,
        reports: [populated]
      });
    }

    // ── LEGACY SINGLE REPORT SUBMISSION ──
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

    // Check duplicate report for exact same user and date
    const duplicate = await DailyReport.findOne({
      user: req.user.id,
      reportDate: targetDate
    });

    if (duplicate) {
      return res.status(400).json({
        message: `You have already submitted a daily report for ${targetDate}. Only 1 report is allowed per day. Please edit your existing report instead.`
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
      status: status || 'Completed',
      batchId: `batch_${req.user.id}_${Date.now()}`
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

// Helper to ensure reports from the same submission/date are grouped into a single list item
const mergeGroupedReports = (reports) => {
  const groups = new Map();
  const result = [];

  for (const rep of reports) {
    const raw = rep.toObject ? rep.toObject() : rep;
    const userId = (raw.user?._id || raw.user || '').toString();
    const date = raw.reportDate;
    const groupKey = raw.batchId ? `batch_${raw.batchId}` : `userdate_${userId}_${date}`;

    if (!groups.has(groupKey)) {
      const clone = {
        ...raw,
        projectEntries: Array.isArray(raw.projectEntries) && raw.projectEntries.length > 0
          ? [...raw.projectEntries]
          : [{
              projectName: raw.projectName,
              workDescription: raw.workDescription,
              hoursSpent: raw.hoursSpent,
              status: raw.status
            }]
      };
      groups.set(groupKey, clone);
      result.push(clone);
    } else {
      const existing = groups.get(groupKey);
      const currentEntry = {
        projectName: raw.projectName,
        workDescription: raw.workDescription,
        hoursSpent: raw.hoursSpent,
        status: raw.status
      };
      if (!existing.projectEntries.some(pe => pe.projectName === raw.projectName && pe.workDescription === raw.workDescription)) {
        existing.projectEntries.push(currentEntry);
      }

      const names = (existing.projectName || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!names.includes(raw.projectName)) {
        names.push(raw.projectName);
        existing.projectName = names.join(', ');
      }

      existing.hoursSpent = parseFloat(((existing.hoursSpent || 0) + (raw.hoursSpent || 0)).toFixed(2));

      if (raw.workDescription && !existing.workDescription.includes(raw.workDescription)) {
        existing.workDescription = `${existing.workDescription}\n${raw.projectName}: ${raw.workDescription}`;
      }

      if (raw.status === 'In Progress' || existing.status === 'In Progress') {
        existing.status = 'In Progress';
      } else if (raw.status === 'Pending' || existing.status === 'Pending') {
        existing.status = 'Pending';
      } else if (raw.status === 'On Hold' || existing.status === 'On Hold') {
        existing.status = 'On Hold';
      }
    }
  }

  return result;
};

// @desc    Get Logged-in Employee's Reports
// @route   GET /api/daily-reports/me
// @access  Private
exports.getMyReports = async (req, res) => {
  try {
    const { startDate, endDate, projectName, status, search, page = 1, limit = 10 } = req.query;

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

    const allFound = await DailyReport.find(query)
      .sort({ reportDate: -1, createdAt: -1 })
      .populate('user', 'name email employeeId profileImage role')
      .populate('employee', 'fullName email department position');

    const mergedReports = mergeGroupedReports(allFound);
    const total = mergedReports.length;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const paginatedReports = mergedReports.slice(skip, skip + parseInt(limit, 10));

    res.json({
      reports: paginatedReports,
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
      limit = 10
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

    // Fetch and merge any grouped / batch reports so each submission is 1 row in the list
    const allFiltered = await DailyReport.find(baseQuery)
      .sort({ reportDate: -1, createdAt: -1 })
      .populate('user', 'name email employeeId profileImage role')
      .populate('employee', 'fullName email department position profileImage');

    const mergedReports = mergeGroupedReports(allFiltered);
    const totalReports = mergedReports.length;
    let completedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let onHoldCount = 0;
    let totalHours = 0;

    mergedReports.forEach(rep => {
      totalHours += rep.hoursSpent || 0;
      if (rep.status === 'Completed') completedCount++;
      else if (rep.status === 'In Progress') inProgressCount++;
      else if (rep.status === 'Pending') pendingCount++;
      else if (rep.status === 'On Hold') onHoldCount++;
    });

    // Pagination & Execution
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const paginatedReports = mergedReports.slice(skip, skip + parseInt(limit, 10));

    res.json({
      reports: paginatedReports,
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
    const isHigherAuthority = ['admin', 'hr'].includes(userRole);
    // Allow update if own report or higher authority (admin / hr)
    if (report.user.toString() !== req.user.id && !isHigherAuthority) {
      return res.status(403).json({ message: 'Not authorized to edit this report' });
    }

    const todayStr = getTodayStr();
    // For regular employee editing own report:
    // If past 11:59 PM of report date (report.reportDate < todayStr), require editRequest.status === 'approved'
    if (!isHigherAuthority && report.reportDate < todayStr) {
      if (!report.editRequest || report.editRequest.status !== 'approved') {
        return res.status(403).json({
          message: 'Direct editing is locked after 11:59 PM on the day of the report. Please request edit access from higher authority.'
        });
      }
    }

    const { projectName, workDescription, hoursSpent, reportDate, status, projectEntries } = req.body;

    const updateFields = {};

    if (Array.isArray(projectEntries) && projectEntries.length > 0) {
      const sanitizedEntries = [];
      let totalHrs = 0;
      for (const item of projectEntries) {
        const pName = (item.projectName || '').trim();
        const desc = (item.workDescription || '').trim();
        const hrs = parseFloat(item.hoursSpent);
        if (pName && desc && !isNaN(hrs)) {
          totalHrs += hrs;
          sanitizedEntries.push({
            projectName: pName,
            workDescription: desc,
            hoursSpent: parseFloat(hrs.toFixed(2)),
            status: ['Completed', 'In Progress', 'Pending', 'On Hold'].includes(item.status) ? item.status : 'Completed'
          });
        }
      }

      if (sanitizedEntries.length > 0) {
        updateFields.projectEntries = sanitizedEntries;
        updateFields.projectName = sanitizedEntries.map(e => e.projectName).join(', ');
        updateFields.hoursSpent = parseFloat(totalHrs.toFixed(2));
        updateFields.workDescription = sanitizedEntries.length === 1
          ? sanitizedEntries[0].workDescription
          : sanitizedEntries.map(e => `${e.projectName}: ${e.workDescription}`).join('\n');

        const allCompleted = sanitizedEntries.every(e => e.status === 'Completed');
        const hasInProgress = sanitizedEntries.some(e => e.status === 'In Progress');
        const hasPending = sanitizedEntries.some(e => e.status === 'Pending');
        const hasOnHold = sanitizedEntries.some(e => e.status === 'On Hold');
        updateFields.status = allCompleted ? 'Completed' : (hasInProgress ? 'In Progress' : (hasPending ? 'Pending' : (hasOnHold ? 'On Hold' : 'In Progress')));
      }
    } else {
      if (projectName) {
        let finalProjectName = '';
        if (Array.isArray(projectName)) {
          finalProjectName = projectName.filter(Boolean).map(p => String(p).trim()).filter(Boolean).join(', ');
        } else if (typeof projectName === 'string') {
          finalProjectName = projectName.trim();
        }
        if (finalProjectName) updateFields.projectName = finalProjectName;
      }
      if (workDescription) updateFields.workDescription = workDescription.trim();
      if (hoursSpent !== undefined) {
        const h = parseFloat(hoursSpent);
        if (!isNaN(h) && h > 0) updateFields.hoursSpent = parseFloat(h.toFixed(2));
      }
      if (status) updateFields.status = status;
    }

    if (reportDate) updateFields.reportDate = reportDate.trim();

    // If edit request was approved, reset it after edit is submitted
    if (report.editRequest?.status === 'approved') {
      updateFields['editRequest.status'] = 'none';
    }

    const updated = await DailyReport.findByIdAndUpdate(
      report._id,
      { $set: updateFields },
      { new: true, runValidators: false }
    )
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

// @desc    Request Edit Access from Higher Authority for Daily Report (past 11:59 PM)
// @route   POST /api/daily-reports/:id/request-edit
// @access  Private
exports.requestEditAccess = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Daily report not found' });
    }
    if (report.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to request edit for this report' });
    }

    report.editRequest = {
      status: 'pending',
      reason: (req.body.reason || '').trim(),
      requestedAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: ''
    };

    await report.save();

    // Create notifications for HR and Admin
    const Notification = require('../models/Notification');
    const hrAdminUsers = await User.find({ role: { $in: ['admin', 'hr'] } }).select('_id');
    const requesterName = req.user.name || 'An employee';
    const notifMsg = `Daily Report Edit Request: ${requesterName} requested edit permission for report of ${report.reportDate}.`;

    const notifDocs = hrAdminUsers.map(u => ({
      userId: u._id,
      senderId: req.user.id,
      senderName: requesterName,
      senderRole: req.user.role || 'employee',
      message: notifMsg,
      type: 'daily_report'
    }));

    if (notifDocs.length > 0) {
      const inserted = await Notification.insertMany(notifDocs);
      const io = req.app.get('io');
      if (io) {
        inserted.forEach(n => {
          io.to(`user_${String(n.userId)}`).emit('new_notification', n);
        });
      }
    }

    res.json({
      success: true,
      message: 'Edit access request submitted to higher authority successfully.',
      report
    });
  } catch (error) {
    console.error('Error requesting edit access:', error);
    res.status(500).json({ message: error.message || 'Failed to submit edit access request' });
  }
};

// @desc    Review (Approve/Reject) Edit Access Request (Admin, HR, Manager)
// @route   PUT /api/daily-reports/:id/review-edit
// @access  Private (Admin, HR, Manager)
exports.reviewEditAccess = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject"' });
    }

    const report = await DailyReport.findById(req.params.id)
      .populate('user', 'name email employeeId');
    if (!report) {
      return res.status(404).json({ message: 'Daily report not found' });
    }

    const isApprove = action === 'approve';
    report.editRequest = {
      ...(report.editRequest ? (report.editRequest.toObject ? report.editRequest.toObject() : report.editRequest) : {}),
      status: isApprove ? 'approved' : 'rejected',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewNote: (note || '').trim()
    };

    await report.save();

    // Send Notification to Employee
    const Notification = require('../models/Notification');
    const reviewerName = req.user.name || 'Higher Authority';
    const empUserId = report.user?._id || report.user;
    const notifMsg = isApprove
      ? `Edit Access Granted: Your request to edit the daily report for ${report.reportDate} has been approved by ${reviewerName}. You can now edit your report.`
      : `Edit Request Declined: Your request to edit the daily report for ${report.reportDate} was declined by ${reviewerName}.`;

    const notif = await Notification.create({
      userId: empUserId,
      senderId: req.user.id,
      senderName: reviewerName,
      senderRole: req.user.role || 'hr',
      message: notifMsg,
      type: 'daily_report'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(empUserId)}`).emit('new_notification', notif);
    }

    res.json({
      success: true,
      message: `Edit access request successfully ${isApprove ? 'approved' : 'rejected'}.`,
      report
    });
  } catch (error) {
    console.error('Error reviewing edit access:', error);
    res.status(500).json({ message: error.message || 'Failed to review edit access request' });
  }
};
