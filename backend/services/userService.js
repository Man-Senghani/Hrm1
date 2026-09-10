const mongoose = require('mongoose');
const User = require('../models/User');
const HR = require('../models/HR');
const Manager = require('../models/Manager');
const Employee = require('../models/Employee');

/**
 * 🛠️ SENIOR FULL-STACK: ATOMIC USER GENESIS
 * Goal: Transactional creation of User + Role Record + Instant ID Sync
 */
exports.createNewUserAtomic = async (userData) => {
  try {
    const { name, email, password, role, ...extraData } = userData;

    if (!email) throw new Error('Email Address is required');
    const lowerEmail = email.toLowerCase();
    
    if (!extraData.personalEmail) throw new Error('Personal Email Address is required.');
    const lowerPersonalEmail = extraData.personalEmail.trim().toLowerCase();

    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(lowerPersonalEmail)) {
      throw new Error('Personal Email must be a valid @gmail.com address');
    }

    if (lowerEmail === lowerPersonalEmail) {
      throw new Error('Office Email and Personal Email cannot be the same');
    }

    // 1. Parallel Uniqueness Protocol (High Performance)
    const [emailInUser, emailInPersonal, personalInUser, personalInPersonal] = await Promise.all([
      User.findOne({ email: lowerEmail }).lean(),
      Employee.findOne({ personalEmail: lowerEmail }).lean(),
      User.findOne({ email: lowerPersonalEmail }).lean(),
      Employee.findOne({ personalEmail: lowerPersonalEmail }).lean()
    ]);

    if (emailInUser || emailInPersonal) {
      throw new Error('Duplicate email addresses are not allowed. This Office Email is already registered.');
    }

    if (personalInUser || personalInPersonal) {
      throw new Error('Duplicate email addresses are not allowed. This Personal Email is already registered.');
    }

    extraData.personalEmail = lowerPersonalEmail;

    // 2. Strict ID Generation (Format: hr-004.hr)
    const roleMatch = role.toLowerCase();
    const count = await User.countDocuments({});
    const generatedId = `AT_EMP_${count + 1}`;

    // 3. Root User Creation (Goal Component c)
    const user = new User({ 
        name, 
        email, 
        password, 
        role: role.toLowerCase(), 
        employeeId: generatedId,
        status: 'active' 
    });
    await user.save();

    try {
      // 4. Personnel Profile & Role-Based Shadow Insertion
      // 🛡️ UNIFIED REGISTRY: Everyone gets a base Employee profile for the Personnel Registry
      const employeeProfile = new Employee({ 
          userId: user._id,
          fullName: name,
          email: email,
          employeeId: generatedId,
          role: role.toLowerCase(),
          joinDate: userData.joinDate || new Date(),
          reportingManager: userData.reportingManager || null,
          ...extraData 
      });
      await employeeProfile.save();

      let roleData = null;
      const shadowBase = { userId: user._id, ...extraData };

      switch (role.toLowerCase()) {
        case 'hr':
          roleData = new HR({ ...shadowBase, hrId: generatedId });
          break;
        case 'manager':
          roleData = new Manager({ ...shadowBase });
          break;
        case 'employee':
          // Profile already created above as base
          roleData = employeeProfile;
          break;
        default:
          // Admin or fallback
          break;
      }

      if (roleData && role.toLowerCase() !== 'employee') {
        await roleData.save();
      }

      return { user, roleData, employeeProfile };
    } catch (innerError) {
      // 🔙 Manual Rollback on System Failure
      await User.findByIdAndDelete(user._id);
      throw innerError;
    }

  } catch (error) {
    throw error;
  }
};
