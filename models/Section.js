const mongoose = require('mongoose');

// Built-in section types map to a partial in views/sections and to the DOM id
// the front-end scripts expect. Only "text" may appear more than once.
const SECTION_TYPES = ['hero', 'about', 'work', 'team', 'contact', 'text'];
const SINGLETON_TYPES = ['hero', 'about', 'work', 'team', 'contact'];
const ANCHORS = { hero: 'home', about: 'about', work: 'portfolio', team: 'team', contact: 'contact' };

const sectionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, maxlength: 60, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  type: { type: String, required: true, enum: SECTION_TYPES },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  navLabel: { type: String, trim: true, maxlength: 40, default: '' },
  order: { type: Number, default: 0, index: true },
  visible: { type: Boolean, default: true },
  fields: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
}, { timestamps: true, minimize: false });

sectionSchema.virtual('anchor').get(function anchor() {
  return ANCHORS[this.type] || `section-${this.key}`;
});

sectionSchema.statics.TYPES = SECTION_TYPES;
sectionSchema.statics.SINGLETON_TYPES = SINGLETON_TYPES;
sectionSchema.statics.ANCHORS = ANCHORS;

module.exports = mongoose.model('Section', sectionSchema);
