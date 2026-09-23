const express = require('express');
const Section = require('../../models/Section');
const media = require('../../lib/media');
const { fieldsFor } = require('../../lib/section-fields');
const { storeImage } = require('./upload-helper');
const { flash, wrap } = require('./helpers');

const router = express.Router();

router.get('/', wrap(async (req, res) => {
  const section = await Section.findOne({ type: 'about' }).lean();
  res.render('admin/about', {
    title: 'About', section, fields: fieldsFor('about'),
    preview: section?.fields?.imageUrl ? media.sized(section.fields.imageUrl, 900) : ''
  });
}));

router.post('/image', wrap(async (req, res) => {
  const section = await Section.findOne({ type: 'about' });
  if (!section) return res.redirect('/admin/about');
  if (req.uploadError || !req.file) {
    flash(req, 'error', req.uploadError || 'Choose an image to upload.');
    return res.redirect('/admin/about');
  }
  try {
    const image = await storeImage(req.file, 'about');
    const previous = section.fields?.imagePublicId;
    section.fields = { ...section.fields, imageUrl: image.url, imagePublicId: image.publicId };
    section.markModified('fields');
    await section.save();
    await media.destroy(previous);
    flash(req, 'success', 'Background image replaced.');
  } catch (error) {
    flash(req, 'error', error.message);
  }
  return res.redirect('/admin/about');
}));

module.exports = router;
