const CompOffRequest = require('../models/CompOffRequest');
const LeaveBalance = require('../models/LeaveBalance');

exports.createRequest = async (req, res) => {
  try {
    const { dateWorked, reason, isFullDay, fromTime, toTime } = req.body;
    const request = new CompOffRequest({
      employeeId: req.user.id || req.user._id,
      dateWorked,
      reason,
      isFullDay,
      fromTime,
      toTime
    });
    await request.save();
    res.status(201).json({ message: 'Comp-Off request submitted successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting Comp-Off request', error: error.message });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const userRole = req.user.role;
    let allowedRoles = [];
    
    if (userRole === 'admin') {
      allowedRoles = ['employee', 'manager', 'hr', 'admin'];
    } else if (userRole === 'hr') {
      allowedRoles = ['employee', 'manager'];
    } else if (userRole === 'manager') {
      allowedRoles = ['employee'];
    }

    const User = require('../models/User');
    const targetUsers = await User.find({ role: { $in: allowedRoles } }).select('_id');
    const targetUserIds = targetUsers.map(u => u._id);

    let requests = await CompOffRequest.find({ employeeId: { $in: targetUserIds } })
      .populate('employeeId', 'name email role employeeId')
      .populate('approverId', 'name')
      .sort({ createdAt: -1 });

    requests = requests.filter(r => r.employeeId != null);
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const employeeId = req.user.id || req.user._id;
    const requests = await CompOffRequest.find({ employeeId })
      .populate('approverId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your requests', error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    const request = await CompOffRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const previousStatus = request.status;
    request.status = status;
    request.approverId = req.user.id || req.user._id;
    
    if (status === 'rejected') {
      request.rejectionReason = rejectionReason;
    }
    
    await request.save();

    // Adjust employee's Earned Leave balance when Comp-Off is approved
    if (status === 'approved' && previousStatus !== 'approved') {
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      let balance = await LeaveBalance.findOne({ employeeId: request.employeeId, month: m, year: y });
      if (!balance) {
        balance = new LeaveBalance({ employeeId: request.employeeId, month: m, year: y, earnedLeave: 1.5 });
      }
      balance.earnedLeave = (balance.earnedLeave || 0) + 1;
      balance.remainingLeave = (balance.remainingLeave || 0) + 1;
      await balance.save();
    } else if (previousStatus === 'approved' && status !== 'approved') {
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      let balance = await LeaveBalance.findOne({ employeeId: request.employeeId, month: m, year: y });
      if (balance) {
        balance.earnedLeave = Math.max(0, (balance.earnedLeave || 0) - 1);
        balance.remainingLeave = Math.max(0, (balance.remainingLeave || 0) - 1);
        await balance.save();
      }
    }
    
    res.status(200).json({ message: `Request ${status} successfully`, request });
  } catch (error) {
    res.status(500).json({ message: 'Error updating request', error: error.message });
  }
};
