const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true, trim: true },
  imagePublicId: { type: String, default: '' },
  alt: { type: String, required: true, trim: true, maxlength: 300 },
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true },
  seedKey: { type: String, index: { unique: true, sparse: true } }
}, { timestamps: true });

module.exports = mongoose.model('HeroSlide', heroSlideSchema);
