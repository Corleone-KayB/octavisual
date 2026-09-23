const express = require('express');
const Section = require('../../models/Section');
const HeroSlide = require('../../models/HeroSlide');
const media = require('../../lib/media');
const validate = require('../../lib/validate');
const { fieldsFor } = require('../../lib/section-fields');
const { storeImage } = require('./upload-helper');
const { flash, isId, wrap, reorderHandler, toggleHandler, deleteHandler, nextOrder } = require('./helpers');

const router = express.Router();

router.get('/', wrap(async (req, res) => {
  const [section, slides] = await Promise.all([
    Section.findOne({ type: 'hero' }).lean(),
    HeroSlide.find().sort({ order: 1 }).lean()
  ]);
  res.render('admin/hero', { title: 'Hero', section, fields: fieldsFor('hero'), slides, thumb: url => media.sized(url, 480) });
}));

router.post('/slides/reorder', reorderHandler(HeroSlide));
router.post('/slides/:id/toggle/:field', toggleHandler(HeroSlide, ['visible'], '/admin/hero'));
router.post('/slides/:id/delete', deleteHandler(HeroSlide, '/admin/hero', {
  label: 'Slide',
  beforeDelete: slide => media.destroy(slide.imagePublicId)
}));

router.post('/slides', wrap(async (req, res) => {
  const errors = [];
  const alt = validate.text(req.body, 'alt', { label: 'Alt text', max: 300, required: true }, errors);
  if (req.uploadError) errors.push(req.uploadError);
  else if (!req.file) errors.push('Choose an image to upload.');
  if (errors.length) {
    flash(req, 'error', errors.join(' '));
    return res.redirect('/admin/hero');
  }
  try {
    const image = await storeImage(req.file, 'hero');
    await HeroSlide.create({ imageUrl: image.url, imagePublicId: image.publicId, alt, order: await nextOrder(HeroSlide), visible: true });
    flash(req, 'success', 'Slide added.');
  } catch (error) {
    flash(req, 'error', error.message);
  }
  return res.redirect('/admin/hero');
}));

router.post('/slides/:id', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).send('Not found');
  const slide = await HeroSlide.findById(req.params.id);
  if (!slide) return res.status(404).send('Not found');
  const errors = [];
  const alt = validate.text(req.body, 'alt', { label: 'Alt text', max: 300, required: true }, errors);
  if (req.uploadError) errors.push(req.uploadError);
  if (errors.length) {
    flash(req, 'error', errors.join(' '));
    return res.redirect('/admin/hero');
  }
  slide.alt = alt;
  if (req.file) {
    try {
      const image = await storeImage(req.file, 'hero');
      const previous = slide.imagePublicId;
      slide.imageUrl = image.url;
      slide.imagePublicId = image.publicId;
      await slide.save();
      await media.destroy(previous);
    } catch (error) {
      flash(req, 'error', error.message);
      return res.redirect('/admin/hero');
    }
  } else {
    await slide.save();
  }
  flash(req, 'success', 'Slide saved.');
  return res.redirect('/admin/hero');
}));

module.exports = router;
