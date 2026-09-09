const Notification = require('../models/Notification');
const User = require('../models/User');

exports.getNotifications = async (req, res) => {
  try {
    const [received, sent] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .populate('senderId', 'name email role')
        .sort({ createdAt: -1 })
        .lean(),
      Notification.find({ senderId: req.user.id, batchId: { $exists: true } })
        .populate('senderId', 'name email role')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const uniqueSent = [];
    const seenBatches = new Set();
    for (const s of sent) {
      if (!seenBatches.has(s.batchId)) {
        seenBatches.add(s.batchId);
        if (!received.find(r => r.batchId === s.batchId)) {
          uniqueSent.push({ ...s, read: true, isSentByMe: true });
        }
      }
    }

    const allNotifs = [...received, ...uniqueSent].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);

    const formatted = allNotifs.map(n => {
      const sName = n.senderName || (n.senderId && typeof n.senderId === 'object' ? n.senderId.name : null) || 'HR / Management';
      const sRole = n.senderRole || (n.senderId && typeof n.senderId === 'object' ? n.senderId.role : null) || '';
      return {
        ...n,
        senderName: sName,
        senderRole: sRole
      };
    });

    res.json({ notifications: formatted });
  } catch (error) {
    console.error('Get Notifications failed:', error);
    res.status(500).json({ message: 'Unable to fetch notifications', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id, 
        $or: [{ userId: req.user.id }, { senderId: req.user.id }] 
      },
      { read: true },
      { new: true }
    );
    res.json({ message: 'Notification marked as read', notification: notification || { _id: req.params.id, read: true } });
  } catch (error) {
    console.error('Mark notification read failed:', error);
    res.status(500).json({ message: 'Unable to update notification', error: error.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { 
        $or: [{ userId: req.user.id }, { senderId: req.user.id }], 
        read: false 
      }, 
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read failed:', error);
    res.status(500).json({ message: 'Unable to update notifications', error: error.message });
  }
};

// Helper to retrieve team member IDs and documents for a manager
const getManagerSubordinateUsers = async (managerId) => {
  const User = require('../models/User');
  const Employee = require('../models/Employee');
  const Team = require('../models/Team');

  const managerUser = await User.findById(managerId).select('teamId department role');
  const managerEmp = await Employee.findOne({ userId: managerId }).select('_id department');

  const subUserIds = new Set();

  // 1. Direct reports in User model
  const directUsers = await User.find({
    _id: { $ne: managerId },
    reportingManager: managerId,
    role: { $nin: ['admin', 'hr'] }
  }).select('_id');
  directUsers.forEach(u => subUserIds.add(u._id.toString()));

  // 2. Direct reports in Employee model
  const empMatch = [{ managerId: managerId }, { reportingManager: managerId }];
  if (managerEmp?._id) {
    empMatch.push({ managerId: managerEmp._id }, { reportingManager: managerEmp._id });
  }
  const employeeDocs = await Employee.find({ $or: empMatch }).select('userId');
  employeeDocs.forEach(e => {
    const uid = e.userId?._id || e.userId;
    if (uid && uid.toString() !== managerId.toString()) {
      subUserIds.add(uid.toString());
    }
  });

  // 3. Team members where manager is assigned to team or leads it
  const teamMatch = [{ managerId: managerId }];
  if (managerUser?.teamId) {
    teamMatch.push({ _id: managerUser.teamId });
  }
  const teams = await Team.find({ $or: teamMatch }).select('members');
  teams.forEach(t => {
    (t.members || []).forEach(m => {
      if (m && m.toString() !== managerId.toString()) {
        subUserIds.add(m.toString());
      }
    });
  });

  // 4. Fallback: if no direct subordinates mapped yet, match active employees in the same department
  if (subUserIds.size === 0 && (managerUser?.department || managerEmp?.department)) {
    const dept = managerUser?.department || managerEmp?.department;
    const deptUsers = await User.find({
      _id: { $ne: managerId },
      role: 'employee',
      department: dept
    }).select('_id');
    deptUsers.forEach(u => subUserIds.add(u._id.toString()));
  }

  // 5. Query user documents
  const teamUsers = await User.find({
    _id: { $in: Array.from(subUserIds) },
    role: { $nin: ['admin', 'hr'] },
    status: { $ne: 'inactive' }
  }).select('_id name email role employeeId profileImage').lean();

  return teamUsers;
};

// @desc   Get team members for manager to send notifications to
// @route  GET /api/notifications/team-members
// @access Private
exports.getTeamMembers = async (req, res) => {
  try {
    const role = (req.user?.role || '').toLowerCase();
    if (role === 'manager') {
      const members = await getManagerSubordinateUsers(req.user.id);
      return res.json(members);
    }
    const all = await User.find({
      _id: { $ne: req.user.id },
      role: { $ne: 'admin' },
      status: { $ne: 'inactive' }
    }).select('_id name email role employeeId profileImage').lean();
    res.json(all);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ message: 'Failed to fetch team members' });
  }
};

// @desc   Create/Send a notification announcement to users
// @route  POST /api/notifications
// @access Private/HR/Admin/Manager
exports.createNotification = async (req, res) => {
  try {
    const { message, type, targetRole, targetUserId, targetLabel } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const senderUser = await User.findById(req.user.id).select('name role');
    const senderRole = (senderUser?.role || req.user.role || '').toLowerCase();
    const senderName = senderUser?.name || (senderRole === 'admin' ? 'Admin' : senderRole === 'manager' ? 'Team Manager' : 'HR');

    let users = [];

    if (senderRole === 'manager') {
      // 🔒 SECURITY SCOPE: Manager can ONLY send to their own team members!
      const teamMembers = await getManagerSubordinateUsers(req.user.id);
      const teamUserIds = teamMembers.map(m => m._id.toString());

      if (targetUserId) {
        // Specific person: must belong to manager's team if team has members
        if (teamUserIds.length > 0 && !teamUserIds.includes(targetUserId.toString())) {
          return res.status(403).json({ message: 'You can only send announcements to your own team members.' });
        }
        users = [{ _id: targetUserId }];
      } else {
        // All team members
        if (teamUserIds.length === 0) {
          return res.status(400).json({ message: 'No team members assigned to your team yet.' });
        }
        users = teamUserIds.map(id => ({ _id: id }));
      }
    } else {
      if (targetUserId) {
        const user = await User.findById(targetUserId).select('_id');
        if (user) users.push(user);
      } else {
        const query = targetRole && targetRole !== 'all' ? { role: targetRole } : {};
        users = await User.find(query).select('_id');
      }
    }

    const batchId = Date.now().toString();

    let computedTargetLabel = targetLabel;
    if (senderRole === 'manager') {
      if (targetUserId) {
        const targetUser = await User.findById(targetUserId).select('name');
        computedTargetLabel = targetUser?.name || 'Specific Team Member';
      } else {
        computedTargetLabel = 'My Team Members';
      }
    } else if (!computedTargetLabel) {
      computedTargetLabel = targetRole || 'All Employees';
    }

    const notifications = await Notification.insertMany(
      users.map(u => ({
        userId: u._id,
        senderId: req.user.id,
        senderName,
        senderRole,
        batchId,
        message,
        type: type || 'announcement',
        targetLabel: computedTargetLabel,
        read: false
      }))
    );

    // 🔔 Emit real-time socket event to each user instantly
    const io = req.app.get('io');
    if (io) {
      notifications.forEach(n => {
        io.to(`user_${String(n.userId)}`).emit('new_notification', {
          _id: n._id,
          message: n.message,
          type: n.type,
          read: false,
          senderId: req.user.id,
          senderName,
          senderRole,
          batchId: batchId,
          createdAt: n.createdAt
        });
      });
    }

    res.status(201).json({ message: `Notification sent to ${notifications.length} users`, count: notifications.length });
  } catch (error) {
    console.error('Create Notification failed:', error);
    res.status(500).json({ message: 'Unable to create notification', error: error.message });
  }
};

// @desc   Update a notification (only creator can do this)
exports.updateNotification = async (req, res) => {
  try {
    const { message } = req.body;
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Not found' });
    if (notif.senderId?.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    if (notif.batchId) {
      await Notification.updateMany({ batchId: notif.batchId }, { message });
    } else {
      await Notification.findByIdAndUpdate(req.params.id, { message });
    }

    // 🔔 Emit real-time update socket
    const io = req.app.get('io');
    if (io) {
      const affected = await Notification.find({ batchId: notif.batchId || notif._id });
      affected.forEach(n => {
        io.to(`user_${String(n.userId)}`).emit('update_notification', {
          _id: n._id,
          message: message,
          batchId: n.batchId
        });
      });
    }

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Delete a notification (only creator can do this)
exports.deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Not found' });
    if (notif.senderId?.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    // Find affected before deleting to emit socket event
    const affected = await Notification.find({ batchId: notif.batchId || notif._id });

    if (notif.batchId) {
      await Notification.deleteMany({ batchId: notif.batchId });
    } else {
      await Notification.findByIdAndDelete(req.params.id);
    }

    // 🔔 Emit real-time delete socket
    const io = req.app.get('io');
    if (io) {
      affected.forEach(n => {
        io.to(`user_${String(n.userId)}`).emit('delete_notification', {
          _id: n._id,
          batchId: n.batchId
        });
      });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
