const path = require('path');
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Employee = require('../backend/models/Employee');

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to Mongo");

  const byIdUser = await User.findById('6a61ed265980804df7137feb').catch(() => null);
  console.log("User by ID 6a61ed265980804df7137feb:", byIdUser);

  const byUserIdEmp = await Employee.findOne({ userId: '6a61ed265980804df7137feb' });
  console.log("Employee by userId 6a61ed265980804df7137feb:", byUserIdEmp);

  const snehaEmps = await Employee.find({ fullName: /sneha/i });
  console.log("Sneha Employees:", snehaEmps);

  const snehaUsers = await User.find({ name: /sneha/i });
  console.log("Sneha Users:", snehaUsers);

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
