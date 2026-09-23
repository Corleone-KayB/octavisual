#!/usr/bin/env node
// Sets the admin password to the current ADMIN_PASSWORD (creating the account
// for ADMIN_EMAIL if needed). The app never overwrites an existing admin on
// startup, so use this after changing ADMIN_PASSWORD.
//
// Usage: npm run admin:reset
require('dotenv').config();

const { connectDB, mongoose } = require('../lib/db');
const { hashPassword } = require('../lib/auth');
const AdminUser = require('../models/AdminUser');

async function reset() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD first.');
  if (password.length < 12) console.warn('WARNING: ADMIN_PASSWORD is shorter than 12 characters.');

  await connectDB();
  const passwordHash = await hashPassword(password);
  const result = await AdminUser.updateOne({ email }, { $set: { email, passwordHash } }, { upsert: true });
  // Sign out every existing admin session.
  await mongoose.connection.db.collection('sessions').deleteMany({}).catch(() => {});
  console.log(result.upsertedCount ? `Created admin ${email}.` : `Password updated for ${email}. All admin sessions were signed out.`);
}

reset()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
