const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  role: { type: String, trim: true, maxlength: 80, default: '' },
  bio: { type: String, trim: true, maxlength: 2000, default: '' },
  imageUrl: { type: String, trim: true, default: '' },
  imagePublicId: { type: String, default: '' },
  cv: { type: String, trim: true, default: '' },
  instagram: { type: String, trim: true, default: '' },
  linkedin: { type: String, trim: true, default: '' },
  vimeo: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
