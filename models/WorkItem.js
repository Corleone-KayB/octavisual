const mongoose = require('mongoose');

// One collection for Selected Work. Film items are YouTube-backed; photography
// items are Cloudinary-hosted images. Fields that do not apply to a media type
// are left empty.
const workItemSchema = new mongoose.Schema({
  mediaType: { type: String, required: true, enum: ['film', 'photography'], index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  year: { type: String, trim: true, maxlength: 4, default: '' },
  order: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  published: { type: Boolean, default: false },

  // Film
  youtubeUrl: { type: String, trim: true, default: '' },
  youtubeId: { type: String, trim: true, default: '', match: /^$|^[A-Za-z0-9_-]{11}$/ },
  thumbnailUrl: { type: String, trim: true, default: '' },
  customThumbnailUrl: { type: String, trim: true, default: '' },
  customThumbnailPublicId: { type: String, default: '' },
  client: { type: String, trim: true, maxlength: 120, default: '' },

  // Photography
  imageUrl: { type: String, trim: true, default: '' },
  imagePublicId: { type: String, default: '' },
  source: { type: String, enum: ['upload', 'link', ''], default: '' },
  sourceUrl: { type: String, trim: true, default: '' },
  alt: { type: String, trim: true, maxlength: 300, default: '' },
  width: Number,
  height: Number,

  // Stable identifier for content imported by scripts/seed.js (idempotent upserts).
  seedKey: { type: String, index: { unique: true, sparse: true } }
}, { timestamps: true });

workItemSchema.index({ mediaType: 1, published: 1, order: 1 });

workItemSchema.virtual('displayThumbnail').get(function displayThumbnail() {
  return this.customThumbnailUrl || this.thumbnailUrl;
});

module.exports = mongoose.model('WorkItem', workItemSchema);
