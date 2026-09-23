const mongoose = require('mongoose');

const MEDIA_TYPES = ['film', 'photography'];

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  mediaType: { type: String, required: true, enum: MEDIA_TYPES },
  order: { type: Number, default: 0 }
}, { timestamps: true });

categorySchema.index({ mediaType: 1, slug: 1 }, { unique: true });
categorySchema.index({ mediaType: 1, order: 1 });

categorySchema.statics.MEDIA_TYPES = MEDIA_TYPES;

module.exports = mongoose.model('Category', categorySchema);
