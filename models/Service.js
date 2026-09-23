const mongoose = require('mongoose');

// Services are the studio disciplines ("Film · Photography · Direction")
// shown in the hero eyebrow.
const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true },
  seedKey: { type: String, index: { unique: true, sparse: true } }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
