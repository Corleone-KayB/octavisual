const express = require('express');
const WorkItem = require('../../models/WorkItem');
const Category = require('../../models/Category');
const media = require('../../lib/media');
const validate = require('../../lib/validate');
const { fetchRemoteImage, MAX_BYTES } = require('../../lib/images');
const { storeImage } = require('./upload-helper');
const { flash, isId, wrap, reorderHandler, toggleHandler, deleteHandler, nextOrder } = require('./helpers');

const router = express.Router();

async function formData() {
  const [categories, tags] = await Promise.all([
    Category.find({ mediaType: 'photography' }).sort({ order: 1, name: 1 }).lean(),
    WorkItem.distinct('tags')
  ]);
  return { categories, allTags: tags.sort() };
}

async function photoCategoryIds(body) {
  const requested = validate.ids(body, 'categories');
  if (!requested.length) return [];
  const valid = await Category.find({ _id: { $in: requested }, mediaType: 'photography' }).select('_id').lean();
  return valid.map(c => c._id);
}

function parseDetails(body, errors) {
  return {
    title: validate.text(body, 'title', { label: 'Title', max: 140, required: true }, errors),
    alt: validate.text(body, 'alt', { label: 'Alt text', max: 300, required: true }, errors),
    description: validate.text(body, 'description', { label: 'Description', max: 2000 }, errors),
    year: validate.year(body, 'year', errors),
    tags: validate.tags(body),
    featured: validate.bool(body, 'featured'),
    published: validate.bool(body, 'published')
  };
}

// ---------- List ----------
router.get('/', wrap(async (req, res) => {
  const [items, categories] = await Promise.all([
    WorkItem.find({ mediaType: 'photography' }).sort({ order: 1, createdAt: -1 }).lean(),
    Category.find({ mediaType: 'photography' }).lean()
  ]);
  const names = Object.fromEntries(categories.map(c => [String(c._id), c.name]));
  res.render('admin/photography/index', {
    title: 'Photography',
    items: items.map(item => ({
      ...item,
      thumb: media.sized(item.imageUrl, 400),
      categoryNames: (item.categories || []).map(id => names[String(id)]).filter(Boolean)
    }))
  });
}));

router.post('/reorder', reorderHandler(WorkItem, () => ({ mediaType: 'photography' })));
router.post('/:id/toggle/:field', toggleHandler(WorkItem, ['published', 'featured'], '/admin/photography', { mediaType: 'photography' }));
router.post('/:id/delete', deleteHandler(WorkItem, '/admin/photography', {
  label: 'Photo',
  scope: { mediaType: 'photography' },
  beforeDelete: item => media.destroy(item.imagePublicId)
}));

// ---------- Add: upload from disk or import from links ----------
router.get('/add', wrap(async (req, res) => {
  res.render('admin/photography/add', { title: 'Add photos', ...(await formData()), maxMb: MAX_BYTES / 1024 / 1024 });
}));

async function createPhoto(body, image, source, sourceUrl = '') {
  const errors = [];
  const details = parseDetails(body, errors);
  if (errors.length) return { errors };
  const item = await WorkItem.create({
    mediaType: 'photography', ...details,
    categories: await photoCategoryIds(body),
    imageUrl: image.url, imagePublicId: image.publicId, width: image.width, height: image.height,
    source, sourceUrl,
    order: await nextOrder(WorkItem, { mediaType: 'photography' })
  });
  return { item };
}

// One file per request so the browser can report per-file progress.
router.post('/upload', wrap(async (req, res) => {
  const errors = [];
  parseDetails(req.body, errors);
  if (req.uploadError) errors.push(req.uploadError);
  else if (!req.file) errors.push('No image was received.');
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  let image;
  try {
    image = await storeImage(req.file, 'photography');
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
  const result = await createPhoto(req.body, image, 'upload');
  if (result.errors) {
    await media.destroy(image.publicId);
    return res.status(400).json({ error: result.errors.join(' ') });
  }
  return res.status(201).json({ ok: true, id: String(result.item._id), title: result.item.title });
}));

// One link per request: download server-side, validate, re-host on Cloudinary.
router.post('/import', wrap(async (req, res) => {
  const errors = [];
  parseDetails(req.body, errors);
  const sourceUrl = validate.url(req.body, 'url', { label: 'Image link', required: true }, errors);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  let downloaded;
  try {
    downloaded = await fetchRemoteImage(sourceUrl);
  } catch (error) {
    return res.status(422).json({ error: error.message });
  }

  let image;
  try {
    image = await storeImage({ buffer: downloaded.buffer }, 'photography');
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
  const result = await createPhoto(req.body, image, 'link', downloaded.finalUrl);
  if (result.errors) {
    await media.destroy(image.publicId);
    return res.status(400).json({ error: result.errors.join(' ') });
  }
  return res.status(201).json({ ok: true, id: String(result.item._id), title: result.item.title });
}));

// ---------- Edit ----------
router.get('/:id/edit', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).render('admin/error', { title: 'Not found', message: 'Photo not found.' });
  const item = await WorkItem.findOne({ _id: req.params.id, mediaType: 'photography' }).lean();
  if (!item) return res.status(404).render('admin/error', { title: 'Not found', message: 'Photo not found.' });
  return res.render('admin/photography/form', { title: `Edit ${item.title}`, item, errors: [], preview: media.sized(item.imageUrl, 900), ...(await formData()) });
}));

router.post('/:id', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).render('admin/error', { title: 'Not found', message: 'Photo not found.' });
  const item = await WorkItem.findOne({ _id: req.params.id, mediaType: 'photography' });
  if (!item) return res.status(404).render('admin/error', { title: 'Not found', message: 'Photo not found.' });

  const errors = [];
  const details = parseDetails(req.body, errors);
  const categories = await photoCategoryIds(req.body);
  if (req.uploadError) errors.push(req.uploadError);
  if (errors.length) {
    return res.status(400).render('admin/photography/form', {
      title: `Edit ${item.title}`, item: { ...item.toObject(), ...details, categories }, errors,
      preview: media.sized(item.imageUrl, 900), ...(await formData())
    });
  }

  item.set({ ...details, categories });
  const previous = item.imagePublicId;
  if (req.file) {
    try {
      const image = await storeImage(req.file, 'photography');
      item.set({ imageUrl: image.url, imagePublicId: image.publicId, width: image.width, height: image.height, source: 'upload', sourceUrl: '' });
    } catch (error) {
      return res.status(400).render('admin/photography/form', {
        title: `Edit ${item.title}`, item: item.toObject(), errors: [error.message],
        preview: media.sized(item.imageUrl, 900), ...(await formData())
      });
    }
  }
  await item.save();
  if (req.file && previous) await media.destroy(previous);
  flash(req, 'success', 'Photo saved.');
  return res.redirect('/admin/photography');
}));

module.exports = router;
