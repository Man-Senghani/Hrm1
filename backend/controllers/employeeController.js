const Employee = require('../models/Employee');
const User = require('../models/User');
const HR = require('../models/HR');
const Manager = require('../models/Manager');

// GET /api/employees
exports.getEmployees = async (req, res) => {
  try {
    const role = req.user.role;
    let query = {};

    if (role === 'employee') {
      query.userId = req.user.id;
    }

    const employees = await Employee.find(query)
      .populate('userId', 'name email status role')
      .populate('managerId', 'name email')
      .lean();

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/employees/:id
exports.getEmployeeById = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let employee = null;
    const rawId = req.params.id;

    // Sanitize common OCR / typo errors (e.g. 'l' -> 'f')
    const sanitizedId = rawId.replace(/l/g, 'f');
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);
    const isSanitizedObjectId = mongoose.Types.ObjectId.isValid(sanitizedId);

    if (isObjectId) {
      employee = await Employee.findById(rawId)
        .populate('userId', 'name email status role')
        .populate('managerId', 'name email');

      if (!employee) {
        employee = await Employee.findOne({ userId: rawId })
          .populate('userId', 'name email status role')
          .populate('managerId', 'name email');
      }
    }

    if (!employee && isSanitizedObjectId) {
      employee = await Employee.findById(sanitizedId)
        .populate('userId', 'name email status role')
        .populate('managerId', 'name email');

      if (!employee) {
        employee = await Employee.findOne({ userId: sanitizedId })
          .populate('userId', 'name email status role')
          .populate('managerId', 'name email');
      }
    }

    if (!employee) {
      employee = await Employee.findOne({ employeeId: rawId })
        .populate('userId', 'name email status role')
        .populate('managerId', 'name email');
    }

    if (!employee && rawId.length >= 10) {
      // Partial prefix match fallback (first 10 chars of Mongo ObjectId)
      const prefix = rawId.substring(0, 10);
      const isPrefixHex = /^[0-9a-fA-F]+$/.test(prefix);
      if (isPrefixHex) {
        employee = await Employee.findOne({ _id: { $regex: new RegExp(`^${prefix}`) } })
          .populate('userId', 'name email status role')
          .populate('managerId', 'name email');
      }
    }

    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    // 🛡️ ROLE INTEGRITY SYNC: Ensure Employee role matches User role
    if (employee.userId && employee.userId.role && employee.role !== employee.userId.role) {
      employee.role = employee.userId.role;
      await employee.save();
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/employees
exports.createEmployee = async (req, res) => {
  try {
    const { email, password, fullName, role, ...employeeData } = req.body;

    if (!email) return res.status(400).json({ message: 'Email Address is required' });
    const lowerEmail = email.toLowerCase();

    if (!employeeData.personalEmail) {
      return res.status(400).json({ message: 'Personal Email Address is required.' });
    }
    const lowerPersonalEmail = employeeData.personalEmail.trim().toLowerCase();

    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(lowerPersonalEmail)) {
      return res.status(400).json({ message: 'Personal Email must be a valid @gmail.com address' });
    }

    if (lowerEmail === lowerPersonalEmail) {
      return res.status(400).json({ message: 'Office Email and Personal Email cannot be the same' });
    }

    // Check cross-uniqueness for Office Email
    const emailInUser = await User.findOne({ email: lowerEmail });
    const emailInPersonal = await Employee.findOne({ personalEmail: lowerEmail });
    if (emailInUser || emailInPersonal) {
      return res.status(400).json({ message: 'Email already exists in the system' });
    }

    // Check cross-uniqueness for Personal Email
    const personalInUser = await User.findOne({ email: lowerPersonalEmail });
    const personalInPersonal = await Employee.findOne({ personalEmail: lowerPersonalEmail });
    if (personalInUser || personalInPersonal) {
      return res.status(400).json({ message: 'Personal Email already exists in the system' });
    }

    employeeData.personalEmail = lowerPersonalEmail;

    const userRole = role || 'employee';

    let finalEmployeeId = employeeData.employeeId;
    if (!finalEmployeeId) {
      const prefix = userRole === 'admin' ? 'ADM' : userRole === 'hr' ? 'HR' : userRole === 'manager' ? 'MGR' : 'EMP';
      const count = await Employee.countDocuments();
      finalEmployeeId = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }

    const newUser = new User({
      name: fullName,
      email,
      password,
      role: userRole,
    });
    const savedUser = await newUser.save();

    // 2. Create Employee profile
    const newEmployee = new Employee({
      userId: savedUser._id,
      email,
      fullName,
      role: userRole,
      ...employeeData,
      employeeId: finalEmployeeId
    });

    const savedEmployee = await newEmployee.save();
    res.status(201).json(savedEmployee);
  } catch (error) {
    console.error('Create Employee Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    // Ensure office email and DOB cannot be modified after creation
    if (updateData.email) {
      delete updateData.email;
    }
    if (updateData.dob) {
      delete updateData.dob;
    }

    if (updateData.personalEmail !== undefined) {
      const lowerPersonalEmail = updateData.personalEmail.trim().toLowerCase();
      if (!lowerPersonalEmail) {
        return res.status(400).json({ message: 'Personal Email Address is required.' });
      }
      if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(lowerPersonalEmail)) {
        return res.status(400).json({ message: 'Personal Email must be a valid @gmail.com address' });
      }

      const existingPersonal = await Employee.findOne({ personalEmail: lowerPersonalEmail, _id: { $ne: req.params.id } });
      const personalInUser = await User.findOne({ email: lowerPersonalEmail });

      if (existingPersonal || personalInUser) {
        return res.status(400).json({ message: 'Personal Email already exists in the system' });
      }

      updateData.personalEmail = lowerPersonalEmail;
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (req.user.role === 'hr' && (employee.role === 'admin' || employee.userId?.role === 'admin')) {
      return res.status(403).json({ message: 'Not authorized to modify Admin profiles' });
    }
    const managerIdStr = employee.managerId?._id ? employee.managerId._id.toString() : employee.managerId?.toString();
    if (req.user.role === 'manager' && managerIdStr !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this employee' });
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, updateData, { new: true });

    // Also update User if name or role changed (email is now locked)
    if (updateData.fullName || updateData.role) {
      const userUpdate = {};
      if (updateData.fullName) userUpdate.name = updateData.fullName;
      if (updateData.role) {
        userUpdate.role = updateData.role;

        // 🚀 SHADOW MIGRATION: Ensure Manager/HR record exists if role changed
        if (updateData.role === 'manager') {
          const exists = await Manager.findOne({ userId: employee.userId });
          if (!exists) await Manager.create({ userId: employee.userId, department: updatedEmployee.department?.name || 'Operations' });
        } else if (updateData.role === 'hr') {
          const exists = await HR.findOne({ userId: employee.userId });
          if (!exists) await HR.create({ userId: employee.userId });
        }
      }
      await User.findByIdAndUpdate(employee.userId, userUpdate);
    }

    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/employees/:id (Soft delete per requirement)
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (req.user.role === 'hr' && (employee.role === 'admin' || employee.userId?.role === 'admin')) {
      return res.status(403).json({ message: 'Not authorized to delete Admin profiles' });
    }

    employee.status = 'inactive';
    await employee.save();

    await User.findByIdAndUpdate(employee.userId, { status: 'inactive' });
    res.json({ message: 'Employee marked as inactive' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/employees/:id/status
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (req.user.role === 'hr' && (employee.role === 'admin' || employee.userId?.role === 'admin')) {
      return res.status(403).json({ message: 'Not authorized to modify Admin status' });
    }

    employee.status = status;
    await employee.save();

    await User.findByIdAndUpdate(employee.userId, { status });
    res.json({ message: `Employee status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/employees/manager/:managerId
exports.getEmployeesByManager = async (req, res) => {
  try {
    const employees = await Employee.find({ managerId: req.params.managerId })
      .populate('department', 'name');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// POST /api/employees/:id/profile-image
exports.updateEmployeeProfileImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'No image provided' });

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const { saveBase64Image } = require('../utils/fileUpload');
    const roleFolder = employee.role || 'employee';
    const nameFolder = (employee.fullName || employee.name || 'unknown').replace(/\s+/g, '_');
    const folderPath = `profile/${roleFolder}/${nameFolder}`;
    const imagePath = await saveBase64Image(image, folderPath, `profile-${employee._id}`);
    if (!imagePath) return res.status(400).json({ message: 'Invalid image data' });

    employee.profileImage = imagePath;
    await employee.save();

    // Update User
    await User.findByIdAndUpdate(employee.userId, { profileImage: imagePath });

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/employees/:id/document (Generic for Adhar/Docs)
exports.updateEmployeeDocument = async (req, res, field) => {
  try {
    const { document } = req.body;
    if (!document) return res.status(400).json({ message: 'No document provided' });

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Ensure an employee can only upload their own document
    if (req.user.role === 'employee' && employee.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this document' });
    }

    const { saveBase64Image } = require('../utils/fileUpload');
    const roleFolder = employee.role || 'employee';
    const nameFolder = (employee.fullName || employee.name || 'unknown').replace(/\s+/g, '_');
    const folderPath = `documents/${roleFolder}/${nameFolder}`;
    const docPath = await saveBase64Image(document, folderPath, `${field}-${employee._id}`);
    if (!docPath) return res.status(400).json({ message: 'Invalid document data' });

    employee[field] = docPath;
    await employee.save();

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/employees/events
exports.getUpcomingEvents = async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'active' }).populate('userId', 'name role profileImage').lean();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = [];

    employees.forEach(emp => {
      const name = emp.fullName || (emp.userId && emp.userId.name) || 'Employee';
      const role = emp.designation || (emp.userId && emp.userId.role) || 'Employee';
      const avatar = emp.profileImage || (emp.userId && emp.userId.profileImage) || null;
      const department = emp.position || emp.designation || '';

      // Birthday calculation
      const dobVal = emp.dob || (emp.userId && emp.userId.dob);
      if (dobVal) {
        const dob = new Date(dobVal);
        if (!isNaN(dob.getTime())) {
          const month = dob.getUTCMonth();
          const date = dob.getUTCDate();
          const thisYearBday = new Date(today.getFullYear(), month, date);
          thisYearBday.setHours(0, 0, 0, 0);

          let targetBday = new Date(thisYearBday);
          let diffTime = targetBday.getTime() - today.getTime();
          let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          // If birthday passed this year, check next year
          if (diffDays < 0) {
            targetBday.setFullYear(today.getFullYear() + 1);
            diffTime = targetBday.getTime() - today.getTime();
            diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          }

          if (diffDays >= 0 && diffDays <= 60) {
            events.push({
              id: `bday-${emp._id}`,
              name,
              role,
              department,
              avatar,
              type: 'birthday',
              date: targetBday,
              formattedDate: targetBday.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
              daysLeft: diffDays,
              desc: diffDays === 0
                ? 'Birthday Today'
                : (diffDays === 1
                  ? 'Birthday Tomorrow'
                  : `Birthday in ${diffDays} days`),
              icon: 'Cake',
              color: '#00a76b'
            });
          }
        }
      }

      // Anniversary calculation
      const joinVal = emp.joinDate || (emp.userId && emp.userId.joinDate);
      if (joinVal) {
        const doj = new Date(joinVal);
        if (!isNaN(doj.getTime())) {
          const month = doj.getUTCMonth();
          const date = doj.getUTCDate();
          const thisYearAnn = new Date(today.getFullYear(), month, date);
          thisYearAnn.setHours(0, 0, 0, 0);

          let targetAnn = new Date(thisYearAnn);
          let diffTime = targetAnn.getTime() - today.getTime();
          let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          // If anniversary passed this year, check next year
          if (diffDays < 0) {
            targetAnn.setFullYear(today.getFullYear() + 1);
            diffTime = targetAnn.getTime() - today.getTime();
            diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          }

          const years = targetAnn.getFullYear() - doj.getFullYear();

          if (diffDays >= 0 && diffDays <= 60 && years > 0) {
            const suffix = (years % 10 === 1 && years !== 11) ? 'st' :
              (years % 10 === 2 && years !== 12) ? 'nd' :
                (years % 10 === 3 && years !== 13) ? 'rd' : 'th';
            events.push({
              id: `ann-${emp._id}`,
              name,
              role,
              department,
              avatar,
              type: 'anniversary',
              date: targetAnn,
              formattedDate: targetAnn.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
              daysLeft: diffDays,
              years,
              desc: diffDays === 0
                ? `${years}${suffix} Work Anniversary Today`
                : (diffDays === 1
                  ? `${years}${suffix} Anniversary Tomorrow`
                  : `${years}${suffix} Anniversary in ${diffDays} days`),
              icon: 'Gift',
              color: '#00a76b'
            });
          }
        }
      }
    });

    events.sort((a, b) => a.daysLeft - b.daysLeft);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
