const mongoose = require('mongoose');

// Site-wide values that are not tied to one section: contact details,
// social links and footer copy. Stored as a single document keyed "site".
const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'site', unique: true },
  contactEmail: { type: String, trim: true, default: '' },
  locationLines: [{ type: String, trim: true }],
  phones: [{
    label: { type: String, trim: true, default: '' },
    number: { type: String, trim: true, required: true }
  }],
  socials: {
    instagram: { type: String, trim: true, default: '' },
    youtube: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' }
  },
  footer: {
    copyright: { type: String, trim: true, default: 'Octavisual.' },
    tagline: { type: String, trim: true, default: '' },
    backToTop: { type: String, trim: true, default: 'Back to top ↑' }
  }
}, { timestamps: true });

settingsSchema.statics.getSite = async function getSite() {
  return (await this.findOne({ key: 'site' })) || this.create({ key: 'site' });
};

module.exports = mongoose.model('Settings', settingsSchema);
