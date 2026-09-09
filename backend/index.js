// Prevent unexpected process crashes
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception caught:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection caught at:', promise, 'reason:', reason);
});

// nodemon restart trigger
// nodemon restart comment 10
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// 💓 Lightweight Health Endpoint for Keep-Alive pings
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date() });
});
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const taskRoutes = require('./routes/taskRoutes');
const personnelRoutes = require('./routes/personnelRoutes');
const timeTrackRoutes = require('./routes/timeTrackRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const managerRoutes = require('./routes/managerRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const screenshotRoutes = require('./routes/screenshotRoutes');
const jobRoutes = require('./routes/jobRoutes');
const compOffRoutes = require('./routes/compOffRoutes');
const roleRoutes = require('./routes/roleRoutes');
const systemRoleRoutes = require('./routes/systemRoleRoutes');
const searchRoutes = require('./routes/searchRoutes');
const path = require('path');
const fs = require('fs');
const initCronJobs = require('./cron/timeTrackerCron');

const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ⚙️ Middleware
app.use(compression());
app.use(cors({
  origin: true, // Allow all origins during dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Attach io to app for use in controllers
app.set('io', io);

// 🔌 Socket.io Logic
const activeUsers = new Map();
const userRoom = (userId) => `user_${String(userId)}`;
const isUserConnected = (userId) => (io.sockets.adapter.rooms.get(userRoom(userId))?.size || 0) > 0;

io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id);

  socket.on('join_task', (taskId) => {
    socket.join(taskId);
    console.log(`📡 User joined task room: ${taskId}`);
  });

  socket.on('join_notifications', ({ userId, role }) => {
    if (!userId) return;
    const normalizedUserId = String(userId);
    socket.join(userRoom(normalizedUserId));
    if (role) socket.join(`role_${role}`);

    // Add to active users and broadcast
    activeUsers.set(normalizedUserId, socket.id);
    io.emit('user_status_change', { userId: normalizedUserId, status: 'online' });

    console.log(`🔔 User joined notification rooms: ${userRoom(normalizedUserId)} ${role ? `role_${role}` : ''}`);
  });

  socket.on('get_online_users', () => {
    socket.emit('online_users', Array.from(activeUsers.keys()));
  });

  socket.on('mark_delivered', async ({ messageId, senderId }) => {
    try {
      const Message = require('./models/Message');
      await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
      io.to(`user_${senderId}`).emit('message_delivered', { messageId });
    } catch (err) {
      console.error('Error marking message delivered:', err);
    }
  });

  socket.on('desktop_logout', async (data) => {
    try {
      const userId = data?.userId;
      const logoutTime = data?.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      if (userId) {
        const TimeTrack = require('./models/TimeTrack');
        const Attendance = require('./models/Attendance');
        const now = new Date();

        await TimeTrack.updateMany(
          { employeeId: userId, status: { $in: ['active', 'paused', 'idle'] } },
          { $set: { status: 'completed', isRunning: false, endTime: now, segmentStart: null } }
        );

        io.to(`user_${userId}`).emit('timer_stopped', {
          userId,
          hasActiveSession: false,
          isRunning: false,
          status: 'completed',
          activeTime: 0
        });
        io.to(`user_${userId}`).emit('timer_update', {
          hasActiveSession: false,
          isRunning: false,
          status: 'completed',
          activeTime: 0
        });
        io.to(`user_${userId}`).emit('desktop_app_logout', {
          userId,
          message: `You are successfully logged out at ${logoutTime}`,
          time: logoutTime,
          logoutTime: logoutTime,
          timestamp: new Date().toISOString()
        });
        console.log(`[SOCKET DESKTOP LOGOUT] Emitted for user_${userId} at ${logoutTime}`);
      }
    } catch (err) {
      console.error('[SOCKET DESKTOP LOGOUT ERROR]', err);
    }
  });

  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    for (const [userId, sid] of activeUsers.entries()) {
      if (sid === socket.id) {
        disconnectedUserId = userId;
        activeUsers.delete(userId);
        break;
      }
    }
    if (disconnectedUserId) {
      io.emit('user_status_change', { userId: disconnectedUserId, status: 'offline' });
    }
    console.log('❌ User disconnected');
  });

  // ══════════════════════════════════════════════
  //  📞  WebRTC CALL SIGNALING
  // ══════════════════════════════════════════════

  // 1. Caller sends offer → relay to callee
  socket.on('call:offer', ({ to, from, offer, callType, callerName, callerImage }) => {
    if (isUserConnected(to)) {
      io.to(userRoom(to)).emit('call:incoming', { from, offer, callType, callerName, callerImage });
      console.log(`📞 Call offer from ${from} to ${to} (${callType})`);
    } else {
      // Callee is offline — notify caller immediately
      socket.emit('call:user_unavailable', { to });
    }
  });

  // 2. Callee answers → relay answer to caller
  socket.on('call:answer', ({ to, answer }) => {
    if (isUserConnected(to)) {
      io.to(userRoom(to)).emit('call:answer', { answer });
    }
  });

  // 3. ICE candidates — bidirectional relay
  socket.on('call:ice-candidate', ({ to, candidate }) => {
    if (isUserConnected(to)) {
      io.to(userRoom(to)).emit('call:ice-candidate', { candidate });
    }
  });

  // 4. Call rejected by callee
  socket.on('call:rejected', ({ to }) => {
    if (isUserConnected(to)) {
      io.to(userRoom(to)).emit('call:rejected');
    }
  });

  // 5. Either side hangs up
  socket.on('call:end', ({ to }) => {
    if (isUserConnected(to)) {
      io.to(userRoom(to)).emit('call:end');
    }
  });
});

// 🌍 Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/personnel', require('./routes/personnelRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/time', require('./routes/timeTrackRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/notifications', notificationRoutes);
app.use('/api/screenshot', screenshotRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/system-roles', systemRoleRoutes);
app.use('/api/comp-off', compOffRoutes);
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/search', searchRoutes);
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/hr-dashboard', require('./routes/hrDashboardRoutes'));
app.use('/api/desktop-app', require('./routes/desktopAppRoutes'));
app.use('/api/leave-policies', require('./routes/leavePolicyRoutes'));
app.use('/api/holidays', require('./routes/holidayRoutes'));
app.use('/api/on-duty', require('./routes/onDutyRoutes'));
app.use('/api/daily-reports', require('./routes/dailyReportRoutes'));


// Health and Version Check
app.get('/health', (req, res) => res.json({ status: 'API is running' }));
app.get('/api/health', (req, res) => res.json({ status: 'API is running' }));
app.get('/api/version', (req, res) => {
  res.json({
    status: 'ok',
    version: require('../package.json').version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString()
  });
});

// Cache configuration for static assets
const isProd = process.env.NODE_ENV === 'production' && !process.env.DEV_MODE;
const staticOptions = {
  maxAge: isProd ? '1d' : 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || !isProd) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
};

// 🌐 Serve Static Frontend Apps (Multi-SPA Subpaths: /admin, /hr, /employee, /manager)
const frontends = [
  { prefix: '/admin', dir: path.join(__dirname, '../frontend/admin/dist') },
  { prefix: '/hr', dir: path.join(__dirname, '../frontend/hr/dist') },
  { prefix: '/employee', dir: path.join(__dirname, '../frontend/employee/dist') },
  { prefix: '/manager', dir: path.join(__dirname, '../frontend/manager/dist') }
];

frontends.forEach(({ prefix, dir }) => {
  const indexPath = path.join(dir, 'index.html');
  if (fs.existsSync(indexPath)) {
    // Serve static assets under the subpath
    app.use(prefix, express.static(dir, staticOptions));

    // Handle client-side routing fallback (SPA) for subpath
    app.use(prefix, (req, res, next) => {
      if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(indexPath);
      }
      next();
    });
  }
});

// 🚪 Serve Root Unified Login Gateway (/)
const LOGIN_DIST = path.join(__dirname, '../frontend/login/dist');
const LOGIN_INDEX = path.join(LOGIN_DIST, 'index.html');

if (fs.existsSync(LOGIN_INDEX)) {
  app.use(express.static(LOGIN_DIST, staticOptions));
  app.get(['/', '/login', '/forgot-password', '/reset-password'], (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(LOGIN_INDEX);
  });
}

// 🔄 Fallback handler for unhandled browser navigation (non-API GET requests like /daily-report)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
    const employeeIndex = path.join(__dirname, '../frontend/employee/dist/index.html');
    if (fs.existsSync(employeeIndex)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(employeeIndex);
    }
    if (fs.existsSync(LOGIN_INDEX)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(LOGIN_INDEX);
    }
  }
  next();
});

// 404 JSON fallback for unhandled API/backend requests
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// 🔌 Database Connection & Server Start
const rawUri = (process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms').trim();
const MONGO_URI = rawUri.replace(/^["']|["']$/g, '');
const PORT = process.env.PORT || 5000;

console.log('Connecting to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ DB Connection Error:', err.message));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);

  // Initialize Cron Jobs
  initCronJobs();
});