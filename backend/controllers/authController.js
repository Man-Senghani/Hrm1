const User = require('../models/User');
const Employee = require('../models/Employee');
const HR = require('../models/HR');
const Manager = require('../models/Manager');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// 🛡️ AUTH: Login Logic
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database connection is initializing. Please try again in a few seconds.' });
    }

    const user = await User.findOne({ email });

    // Ensure status is active
    if (user && user.status === 'inactive') {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Role check if provided matching the url
    // Actually, maybe users only have one role anyway. We verify if user exists.
    if (user && (await user.comparePassword(password))) {
      // Just check if the role they are logging into matches their actual role or if they are admin
      if (role && user.role !== role && user.role !== 'admin') {
        return res.status(403).json({ message: `Access Denied: You are not authorized for role ${role}` });
      }

      const token = jwt.sign(
        {
          id: user._id,
          role: user.role,
          name: user.name
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '30d' }
      );

      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('🔥 Login Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 🛠️ ADMIN ONLY: Create New User (can be used for initial setup)
exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, status, joinDate } = req.body;
    const name = `${firstName} ${lastName}`.trim();

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database offline' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userRole = role || 'employee';

    const newUser = new User({
      name,
      email,
      password,
      role: userRole,
      status: status || 'active'
    });

    await newUser.save();

    // 👤 CREATE EMPLOYEE PROFILE AUTOMATICALLY
    const prefix = userRole === 'admin' ? 'ADM' : userRole === 'hr' ? 'HR' : userRole === 'manager' ? 'MGR' : 'EMP';
    const count = await Employee.countDocuments();
    const finalEmployeeId = `${prefix}-${String(count + 1).padStart(3, '0')}`;

    const newEmployee = new Employee({
      userId: newUser._id,
      email,
      fullName: name,
      role: userRole,
      employeeId: finalEmployeeId,
      joinDate: joinDate || new Date()
    });

    await newEmployee.save();

    return res.status(201).json({
      message: `${userRole} profile synchronized successfully`,
      user: { _id: newUser._id, email: newUser.email, role: newUser.role, employeeId: finalEmployeeId }
    });

  } catch (error) {
    console.error('🔥 Create User Error:', error);
    return res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('reportingManager', 'name email').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 👤 MASTER REGISTRY BRIDGE: Always fetch from the Employee model for personnel details
    const employeeData = await Employee.findOne({ userId: req.user.id }).populate('reportingManager', 'name email').lean();

    // 🛰️ DYNAMIC SHADOW LOOKUP: Fetch role-specific metadata if needed
    let roleMetadata = {};
    if (user.role === 'hr') {
      roleMetadata = await HR.findOne({ userId: req.user.id }).lean() || {};
    } else if (user.role === 'manager') {
      roleMetadata = await Manager.findOne({ userId: req.user.id }).lean() || {};
    }

    console.log(`[PROFILE TRACE] User Role: ${user.role} | Master Registry: ${!!employeeData} | Shadow: ${!!roleMetadata}`);

    // Merge data - preserve the master User role and use registry data only for identity fields.
    const profile = {
      ...employeeData,
      ...user,
      ...roleMetadata,
      role: user.role,
      employeeId: employeeData?.employeeId || user.employeeId || 'PENDING-SYNC',
      employeeRecordId: employeeData?._id,
      _id: user._id
    };

    res.json(profile);
  } catch (err) {
    console.error('🔥 Error in getMe:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 🔐 SECURE: Update User Password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Verification failed: Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Security protocol updated successfully' });
  } catch (error) {
    res.status(500).json({ message: `System Error: ${error.message}` });
  }
};
// 📝 PROFILE: Update Details
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, personalEmail, phone, address, profileImage, adharCard, bankDetails, panCard } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { saveBase64Image } = require('../utils/fileUpload');
    const roleFolder = user.role || 'employee';
    const nameFolder = (user.name || user.fullName || 'unknown').replace(/\s+/g, '_');
    const profileFolderPath = `profile/${roleFolder}/${nameFolder}`;
    const docFolderPath = `documents/${roleFolder}/${nameFolder}`;

    let imagePath = user.profileImage;
    if (profileImage && profileImage.startsWith('data:')) {
      const savedPath = await saveBase64Image(profileImage, profileFolderPath, `profile-${req.user.id}-${Date.now()}`);
      if (savedPath) imagePath = savedPath;
    }

    let updateData = { profileImage: imagePath };

    // New support for individual documents
    if (adharCard && adharCard.startsWith('data:')) {
      const savedPath = await saveBase64Image(adharCard, docFolderPath, `adhar-${req.user.id}-${Date.now()}`);
      if (savedPath) updateData.adharCard = savedPath;
    }
    if (bankDetails && bankDetails.startsWith('data:')) {
      const savedPath = await saveBase64Image(bankDetails, docFolderPath, `bank-${req.user.id}-${Date.now()}`);
      if (savedPath) updateData.bankDetails = savedPath;
    }
    if (panCard && panCard.startsWith('data:')) {
      const savedPath = await saveBase64Image(panCard, docFolderPath, `pan-${req.user.id}-${Date.now()}`);
      if (savedPath) updateData.panCard = savedPath;
    }

    // Update User
    if (fullName) user.name = fullName;
    user.profileImage = imagePath;
    await user.save();

    // Update Shadow Registry (documents and personal details reside in Employee model)
    if (fullName) updateData.fullName = fullName;
    if (personalEmail !== undefined) updateData.personalEmail = personalEmail;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    const updatedProfile = await Employee.findOneAndUpdate(
      { userId: req.user.id }, 
      { $set: updateData },
      { new: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        profile: updatedProfile
      }
    });
  } catch (error) {
    console.error('🔥 Profile Update Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 🖼️ PROFILE: Upload Image
exports.uploadProfileImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const roleFolder = user.role || 'employee';
    const nameFolder = (user.name || user.fullName || 'unknown').replace(/\s+/g, '_');
    const folderPath = `profile/${roleFolder}/${nameFolder}`;

    const { saveBase64Image } = require('../utils/fileUpload');
    const imagePath = await saveBase64Image(image, folderPath, `profile-${req.user.id}`);
    if (!imagePath) {
      return res.status(400).json({ message: 'Invalid image data' });
    }

    // Update User
    user = await User.findByIdAndUpdate(req.user.id, { profileImage: imagePath }, { new: true });

    // Update Shadow Registry (profile image resides in Employee model)
    await Employee.findOneAndUpdate({ userId: req.user.id }, { profileImage: imagePath });

    res.json({
      message: 'Profile image updated successfully',
      profileImage: imagePath
    });
  } catch (error) {
    console.error('🔥 Upload Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// 🔄 RECOVERY: Forgot Password Validation
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    // Generate token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    // Create reset URL using CLIENT_URL environment variable if set, otherwise falling back to request protocol/host
    const clientUrl = (process.env.CLIENT_URL || `${req.protocol}://${req.get('host').replace(/:\d+/, ':4000')}`).replace(/\/+$/, '');
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request a password reset, please ignore this email.\nThis link will expire in 30 minutes.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #00a76b; margin: 0;">FluidHR</h1>
          <p style="color: #666; margin-top: 5px;">Reset your FluidHR password</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <h2 style="color: #333; margin-top: 0;">Hello,</h2>
          <p style="color: #555; line-height: 1.6;">
            A password reset was requested for your account. Click below to set a new password. Link expires in 30 minutes and works only once.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #00a76b; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 4px; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #555; line-height: 1.6;">
            Didn't request this? Ignore this email.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            Please do not reply to this message.
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'FluidHR - Password Reset Token',
        message,
        html
      });

      res.status(200).json({ message: 'A password reset link has been sent.' });
    } catch (err) {
      // Detailed server logs
      console.error("🔥 Password Reset Email Sending Error:");
      console.error(`- Recipient: ${user.email}`);
      console.error(`- Reset URL: ${resetUrl}`);
      console.error(`- Error Details:`, err.stack || err.message || err);
      
      // Local fallback for developers to test reset link
      if (process.env.NODE_ENV === 'development') {
        try {
          const fs = require('fs');
          const path = require('path');
          const filePath = path.resolve(__dirname, '../reset-link.txt');
          fs.writeFileSync(filePath, `RESET PASSWORD URL:\n${resetUrl}\n`);
          console.log(`\n==================================================\n⚠️ EMAIL SEND FAILED, BUT RESET LINK WRITTEN TO:\n👉 ${filePath}\n==================================================\n`);
          return res.status(200).json({ 
            message: 'Local development notice: Email delivery failed, but we generated a reset link in backend/reset-link.txt!' 
          });
        } catch (fileErr) {
          console.error("Failed to write fallback reset-link.txt:", fileErr);
        }
      }

      // Clear the tokens if sending failed
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      // User-friendly error message that does not expose raw SMTP/provider error
      return res.status(500).json({ message: 'Unable to send password reset email. Please try again later.' });
    }  } catch (error) {
    console.error('🔥 Forgot Password Error:', error);
    res.status(500).json({ message: 'Server error during password recovery validation' });
  }
};

// 🔄 RECOVERY: Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    // Check strength
    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})");
    if (!strongRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long, contain 1 uppercase letter and 1 number.' });
    }

    // Hash token to compare with DB
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    // Set new password (the pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: 'Password has been successfully reset. You can now login.' });

  } catch (error) {
    console.error('🔥 Reset Password Error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// 🔄 RECOVERY: Verify Reset Token (GET request to validate token and return user details)
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash token to compare with DB
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    res.status(200).json({
      name: user.name,
      email: user.email
    });
  } catch (error) {
    console.error('🔥 Verify Reset Token Error:', error);
    res.status(500).json({ message: 'Server error during token verification' });
  }
};

exports.cleanStagingData = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    if (!db || db.databaseName !== 'hrm_staging') {
      return res.status(403).json({
        message: 'Safety Guard Triggered: This endpoint only operates on hrm_staging database!'
      });
    }

    const usersColl = db.collection('users');
    const employeesColl = db.collection('employees');

    let adminUser = await usersColl.findOne({
      $or: [{ email: /dhruv/i }, { name: /dhruv/i }]
    });

    if (!adminUser) {
      adminUser = await usersColl.findOne({ role: 'admin' });
    }

    if (!adminUser) {
      return res.status(404).json({ message: 'Dhruv Mehta Admin user not found' });
    }

    const collectionsToClear = [
      'attendances', 'auditlogs', 'chats', 'dailyreports', 'events',
      'holidays', 'leaverequests', 'leavebalances', 'notifications',
      'payslips', 'projects', 'screenshots', 'tasks', 'timetracks',
      'compoffrequests', 'ondutyrequests'
    ];

    let totalDeleted = 0;
    for (const collName of collectionsToClear) {
      try {
        const r = await db.collection(collName).deleteMany({});
        totalDeleted += r.deletedCount;
      } catch (e) { }
    }

    const delUsers = await usersColl.deleteMany({ _id: { $ne: adminUser._id } });
    const delEmps = await employeesColl.deleteMany({
      _id: { $ne: adminUser.profileId || adminUser._id },
      email: { $not: /dhruv/i }
    });

    const remainingCount = await usersColl.countDocuments();

    return res.status(200).json({
      success: true,
      message: `Staging database cleaned! ${delUsers.deletedCount} users removed. Only Admin (${adminUser.name}) remains.`,
      remainingUsersCount: remainingCount,
      admin: adminUser.email
    });
  } catch (err) {
    console.error('Clean staging error:', err);
    return res.status(500).json({ message: err.message });
  }
};
