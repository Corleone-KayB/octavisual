const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  lastLoginAt: Date
}, { timestamps: true });

module.exports = mongoose.model('AdminUser', adminUserSchema);
