const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'backend/.env' });

const uri = process.env.MONGODB_URI || 'mongodb://mansenghani6_db_user:gzpvaOFjPZoMFvvs@ac-tsxj5ve-shard-00-00.zcawqhy.mongodb.net:27017,ac-tsxj5ve-shard-00-01.zcawqhy.mongodb.net:27017,ac-tsxj5ve-shard-00-02.zcawqhy.mongodb.net:27017/hrm?ssl=true&replicaSet=atlas-9lp5j7-shard-0&authSource=admin&appName=Cluster0';
const jwtSecret = process.env.JWT_SECRET || 'fluidhr_security_protocol_v2_resync';

async function main() {
  await mongoose.connect(uri);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const employeeUser = await User.findOne({ role: 'employee' });
  const managerUser = await User.findOne({ role: 'manager' });

  console.log('Employee User:', employeeUser ? { id: employeeUser._id, email: employeeUser.email, role: employeeUser.role, name: employeeUser.name } : 'None');
  console.log('Manager User:', managerUser ? { id: managerUser._id, email: managerUser.email, role: managerUser.role, name: managerUser.name } : 'None');

  if (employeeUser) {
    const empToken = jwt.sign({ id: employeeUser._id, role: employeeUser.role }, jwtSecret, { expiresIn: '1d' });
    console.log('EMP_TOKEN=' + empToken);
  }
  if (managerUser) {
    const mgrToken = jwt.sign({ id: managerUser._id, role: managerUser.role }, jwtSecret, { expiresIn: '1d' });
    console.log('MGR_TOKEN=' + mgrToken);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
