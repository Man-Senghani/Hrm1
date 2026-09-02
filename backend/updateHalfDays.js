require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');

async function updateDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms');
    console.log('Connected to MongoDB');

    // 1. Mark records under 7.5 hours (where check-out has completed) as Half Day
    const halfDayResult = await Attendance.updateMany(
      { totalHours: { $lt: 7.5, $ne: null } },
      { $set: { status: 'Half Day' } }
    );

    // 2. Mark records with 7.5 hours or more as Present
    const fullDayRecords = await Attendance.find({ totalHours: { $gte: 7.5 } });
    let fullDayCount = 0;
    for (const att of fullDayRecords) {
      att.status = 'Present';
      await att.save();
      fullDayCount++;
    }

    console.log(`Updated database: ${halfDayResult.modifiedCount} records marked Half Day (< 7.5 hrs), ${fullDayCount} records marked Present (>= 7.5 hrs).`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
}

updateDatabase();
