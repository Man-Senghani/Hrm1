const OnDutyRequest = require('../models/OnDutyRequest');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

exports.createRequest = async (req, res) => {
  try {
    const { startDate, endDate, isFullDay, fromTime, toTime, reason, location } = req.body;
    const request = new OnDutyRequest({
      employeeId: req.user.id || req.user._id,
      startDate,
      endDate,
      isFullDay,
      fromTime,
      toTime,
      reason,
      location
    });
    await request.save();
    res.status(201).json({ message: 'On Duty request submitted successfully', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const requests = await OnDutyRequest.find({ employeeId: req.user.id || req.user._id })
      .populate('approverId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    let requests = await OnDutyRequest.find({ employeeId: { $in: targetUserIds } })
      .populate('employeeId', 'name role profileImage')
      .populate('approverId', 'name')
      .sort({ createdAt: -1 });

    requests = requests.filter(r => r.employeeId != null);
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const request = await OnDutyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = status;
    request.approverId = req.user.id || req.user._id;
    if (status === 'rejected') {
      request.rejectionReason = rejectionReason;
    }
    
    await request.save();

    // If approved, update attendance
    if (status === 'approved') {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      
      // Loop through every day from startDate to endDate
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        let attendance = await Attendance.findOne({ 
          user: request.employeeId, 
          date: dateStr 
        });

        if (!attendance) {
          attendance = new Attendance({
            user: request.employeeId,
            date: dateStr,
            checkInTime: new Date(d),
            totalHours: request.isFullDay ? 8 : 4,
            status: 'Present'
          });
        } else {
          attendance.status = 'Present';
          if (request.isFullDay) {
            attendance.totalHours = Math.max(attendance.totalHours, 8);
          }
        }
        await attendance.save();
      }
    }

    res.status(200).json({ message: `Request ${status} successfully`, request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
