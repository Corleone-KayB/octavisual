const express = require('express');
const Category = require('../../models/Category');
const WorkItem = require('../../models/WorkItem');
const validate = require('../../lib/validate');
const { flash, isId, wrap, reorderHandler, nextOrder } = require('./helpers');

const router = express.Router();

async function uniqueSlug(mediaType, source, excludeId) {
  const base = validate.slugify(source) || 'category';
  let slug = base;
  for (let n = 2; await Category.exists({ mediaType, slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); n += 1) {
    slug = `${base}-${n}`;
  }
  return slug;
}

function wantsJson(req) {
  return req.is('application/json') || req.get('accept')?.includes('application/json');
}

router.get('/', wrap(async (req, res) => {
  const [categories, usage] = await Promise.all([
    Category.find().sort({ mediaType: 1, order: 1, name: 1 }).lean(),
    WorkItem.aggregate([{ $unwind: '$categories' }, { $group: { _id: '$categories', count: { $sum: 1 } } }])
  ]);
  const counts = Object.fromEntries(usage.map(u => [String(u._id), u.count]));
  res.render('admin/categories', {
    title: 'Categories',
    groups: Category.MEDIA_TYPES.map(mediaType => ({
      mediaType,
      label: mediaType === 'film' ? 'Film' : 'Photography',
      items: categories.filter(c => c.mediaType === mediaType).map(c => ({ ...c, count: counts[String(c._id)] || 0 }))
    }))
  });
}));

router.post('/reorder', reorderHandler(Category));

// Also used by the inline "create new category" control (JSON).
router.post('/', wrap(async (req, res) => {
  const errors = [];
  const name = validate.text(req.body, 'name', { label: 'Name', max: 60, required: true }, errors);
  const mediaType = String(req.body.mediaType || '');
  if (!Category.MEDIA_TYPES.includes(mediaType)) errors.push('Choose Film or Photography.');

  if (!errors.length) {
    const existing = await Category.findOne({ mediaType, name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean();
    if (existing) {
      if (wantsJson(req)) return res.json({ category: { id: String(existing._id), name: existing.name, slug: existing.slug }, existed: true });
      errors.push(`"${existing.name}" already exists.`);
    }
  }

  if (errors.length) {
    if (wantsJson(req)) return res.status(400).json({ error: errors.join(' ') });
    flash(req, 'error', errors.join(' '));
    return res.redirect('/admin/categories');
  }

  const category = await Category.create({
    name, mediaType,
    slug: await uniqueSlug(mediaType, name),
    order: await nextOrder(Category, { mediaType })
  });
  if (wantsJson(req)) return res.status(201).json({ category: { id: String(category._id), name: category.name, slug: category.slug } });
  flash(req, 'success', `Category "${name}" added.`);
  return res.redirect('/admin/categories');
}));

router.post('/:id', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).send('Not found');
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).send('Not found');
  const errors = [];
  const name = validate.text(req.body, 'name', { label: 'Name', max: 60, required: true }, errors);
  const slugInput = validate.slugify(req.body.slug || name);
  if (errors.length) {
    flash(req, 'error', errors.join(' '));
    return res.redirect('/admin/categories');
  }
  category.name = name;
  category.slug = await uniqueSlug(category.mediaType, slugInput, category._id);
  await category.save();
  flash(req, 'success', 'Category saved.');
  return res.redirect('/admin/categories');
}));

router.post('/:id/delete', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).send('Not found');
  const category = await Category.findById(req.params.id);
  if (category) {
    await WorkItem.updateMany({ categories: category._id }, { $pull: { categories: category._id } });
    await category.deleteOne();
    flash(req, 'success', `Category "${category.name}" deleted and removed from its items.`);
  }
  return res.redirect('/admin/categories');
}));

module.exports = router;
