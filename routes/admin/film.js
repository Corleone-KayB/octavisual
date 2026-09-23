const express = require('express');
const WorkItem = require('../../models/WorkItem');
const Category = require('../../models/Category');
const media = require('../../lib/media');
const youtube = require('../../lib/youtube');
const validate = require('../../lib/validate');
const { storeImage } = require('./upload-helper');
const { flash, isId, wrap, reorderHandler, toggleHandler, deleteHandler, nextOrder } = require('./helpers');

const router = express.Router();
const BULK_LIMIT = 25;

async function formData() {
  const [categories, tags] = await Promise.all([
    Category.find({ mediaType: 'film' }).sort({ order: 1, name: 1 }).lean(),
    WorkItem.distinct('tags')
  ]);
  return { categories, allTags: tags.sort() };
}

function renderForm(res, status, item, extra = {}) {
  return formData().then(data => res.status(status).render('admin/film/form', {
    title: item._id ? `Edit ${item.title || 'film'}` : 'Add film',
    item, errors: [], thumbPreview: media.sized(item.customThumbnailUrl, 640) || item.thumbnailUrl,
    ...data, ...extra
  }));
}

async function filmCategoryIds(req) {
  const requested = validate.ids(req.body, 'categories');
  if (!requested.length) return [];
  const valid = await Category.find({ _id: { $in: requested }, mediaType: 'film' }).select('_id').lean();
  return valid.map(c => c._id);
}

// Validates the YouTube URL and resolves id/title/thumbnail. Returns
// { youtubeId, youtubeUrl, thumbnailUrl, oembedTitle } and pushes errors.
async function resolveVideo(input, existing, errors) {
  const raw = String(input || '').trim();
  if (!raw) return { youtubeId: '', youtubeUrl: '', thumbnailUrl: '', oembedTitle: '' };

  const youtubeId = youtube.parseYouTubeId(raw);
  if (!youtubeId) {
    errors.push('That does not look like a YouTube link. Paste a watch, youtu.be, shorts or embed URL.');
    return null;
  }

  const duplicate = await WorkItem.findOne({ mediaType: 'film', youtubeId, ...(existing?._id ? { _id: { $ne: existing._id } } : {}) }).lean();
  if (duplicate) {
    errors.push(`This video is already in your films as "${duplicate.title}".`);
    return null;
  }

  let oembedTitle = '';
  try {
    oembedTitle = (await youtube.fetchOEmbed(youtubeId)).title;
  } catch (error) {
    // Missing/private videos are rejected; network trouble is not the admin's fault.
    if (!/reach YouTube/.test(error.message)) {
      errors.push(error.message);
      return null;
    }
  }

  const unchanged = existing && existing.youtubeId === youtubeId && existing.thumbnailUrl;
  return {
    youtubeId,
    youtubeUrl: youtube.watchUrl(youtubeId),
    thumbnailUrl: unchanged ? existing.thumbnailUrl : await youtube.resolveThumbnail(youtubeId),
    oembedTitle
  };
}

function parseDetails(req, errors) {
  return {
    title: validate.text(req.body, 'title', { label: 'Title', max: 140 }, errors),
    description: validate.text(req.body, 'description', { label: 'Description', max: 2000 }, errors),
    tags: validate.tags(req.body),
    year: validate.year(req.body, 'year', errors),
    client: validate.text(req.body, 'client', { label: 'Client', max: 120 }, errors),
    featured: validate.bool(req.body, 'featured'),
    published: validate.bool(req.body, 'published')
  };
}

// ---------- List ----------
router.get('/', wrap(async (req, res) => {
  const [items, categories] = await Promise.all([
    WorkItem.find({ mediaType: 'film' }).sort({ order: 1, createdAt: -1 }).lean(),
    Category.find({ mediaType: 'film' }).lean()
  ]);
  const names = Object.fromEntries(categories.map(c => [String(c._id), c.name]));
  res.render('admin/film/index', {
    title: 'Film',
    items: items.map(item => ({
      ...item,
      thumb: media.sized(item.customThumbnailUrl, 320) || item.thumbnailUrl,
      categoryNames: (item.categories || []).map(id => names[String(id)]).filter(Boolean)
    }))
  });
}));

router.post('/reorder', reorderHandler(WorkItem, () => ({ mediaType: 'film' })));
router.post('/:id/toggle/:field', toggleHandler(WorkItem, ['published', 'featured'], '/admin/film', { mediaType: 'film' }));
router.post('/:id/delete', deleteHandler(WorkItem, '/admin/film', {
  label: 'Film',
  scope: { mediaType: 'film' },
  beforeDelete: item => media.destroy(item.customThumbnailPublicId)
}));

// ---------- Live preview (JSON) ----------
router.post('/lookup', wrap(async (req, res) => {
  const id = youtube.parseYouTubeId(String(req.body?.url || ''));
  if (!id) return res.status(400).json({ error: 'That does not look like a YouTube link.' });
  const excludeId = isId(req.body?.itemId) ? req.body.itemId : null;
  const duplicate = await WorkItem.findOne({ mediaType: 'film', youtubeId: id, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).select('title').lean();
  try {
    const result = await youtube.lookup(id);
    return res.json({ ...result, duplicate: duplicate ? duplicate.title : null });
  } catch (error) {
    return res.status(422).json({ error: error.message, id, thumbnailUrl: youtube.thumbnailUrl(id) });
  }
}));

// ---------- Bulk add ----------
router.get('/bulk', wrap(async (req, res) => {
  res.render('admin/film/bulk', { title: 'Bulk add films', ...(await formData()), results: null, urls: '' });
}));

router.post('/bulk', wrap(async (req, res) => {
  const urls = String(req.body.urls || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const categories = await filmCategoryIds(req);
  const tags = validate.tags(req.body);
  const results = [];

  if (!urls.length) results.push({ input: '', status: 'error', message: 'Paste at least one YouTube link.' });
  if (urls.length > BULK_LIMIT) results.push({ input: '', status: 'error', message: `Only the first ${BULK_LIMIT} links were processed.` });

  const seen = new Set();
  let order = await nextOrder(WorkItem, { mediaType: 'film' });
  for (const input of urls.slice(0, BULK_LIMIT)) {
    const id = youtube.parseYouTubeId(input);
    if (!id) { results.push({ input, status: 'error', message: 'Not a YouTube link.' }); continue; }
    if (seen.has(id)) { results.push({ input, status: 'skipped', message: 'Duplicate in this list.' }); continue; }
    seen.add(id);
    const existing = await WorkItem.findOne({ mediaType: 'film', youtubeId: id }).select('title').lean();
    if (existing) { results.push({ input, status: 'skipped', message: `Already added as "${existing.title}".` }); continue; }
    try {
      const info = await youtube.lookup(id);
      await WorkItem.create({
        mediaType: 'film', title: info.title || `YouTube ${id}`, youtubeId: id, youtubeUrl: info.url,
        thumbnailUrl: info.thumbnailUrl, categories, tags, order: order++, published: false
      });
      results.push({ input, status: 'created', message: info.title });
    } catch (error) {
      results.push({ input, status: 'error', message: error.message });
    }
  }

  const created = results.filter(r => r.status === 'created').length;
  res.render('admin/film/bulk', {
    title: 'Bulk add films', ...(await formData()), results, urls: '',
    summary: `${created} draft${created === 1 ? '' : 's'} created. Review them in Film and publish when ready.`
  });
}));

// ---------- Create / edit ----------
router.get('/new', wrap(async (req, res) => {
  await renderForm(res, 200, { mediaType: 'film', title: '', categories: [], tags: [], published: true, featured: false });
}));

router.get('/:id/edit', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).render('admin/error', { title: 'Not found', message: 'Film not found.' });
  const item = await WorkItem.findOne({ _id: req.params.id, mediaType: 'film' }).lean();
  if (!item) return res.status(404).render('admin/error', { title: 'Not found', message: 'Film not found.' });
  return renderForm(res, 200, item);
}));

async function saveFilm(req, res, existing) {
  const errors = [];
  const details = parseDetails(req, errors);
  const categories = await filmCategoryIds(req);
  const video = await resolveVideo(req.body.youtubeUrl, existing, errors);
  if (req.uploadError) errors.push(req.uploadError);
  if (video && !details.title) details.title = video.oembedTitle;
  if (!details.title) errors.push('Title is required.');
  if (details.published && video && !video.youtubeId && !existing?.customThumbnailUrl && !req.file) {
    errors.push('A published film without a YouTube link needs a custom thumbnail.');
  }

  const draft = {
    ...(existing ? existing.toObject() : { mediaType: 'film' }),
    ...details, categories, youtubeUrl: String(req.body.youtubeUrl || '').trim()
  };
  if (errors.length) return renderForm(res, 400, draft, { errors });

  const doc = existing || new WorkItem({ mediaType: 'film', order: await nextOrder(WorkItem, { mediaType: 'film' }) });
  doc.set({ ...details, categories, youtubeId: video.youtubeId, youtubeUrl: video.youtubeUrl, thumbnailUrl: video.thumbnailUrl });

  const oldThumbnail = doc.customThumbnailPublicId;
  if (req.file) {
    try {
      const image = await storeImage(req.file, 'film-thumbnails');
      doc.customThumbnailUrl = image.url;
      doc.customThumbnailPublicId = image.publicId;
    } catch (error) {
      return renderForm(res, 400, draft, { errors: [error.message] });
    }
  } else if (validate.bool(req.body, 'removeCustomThumbnail')) {
    doc.customThumbnailUrl = '';
    doc.customThumbnailPublicId = '';
  }

  await doc.save();
  if (oldThumbnail && oldThumbnail !== doc.customThumbnailPublicId) await media.destroy(oldThumbnail);
  flash(req, 'success', existing ? 'Film saved.' : 'Film added.');
  return res.redirect('/admin/film');
}

router.post('/', wrap(async (req, res) => saveFilm(req, res, null)));

router.post('/:id', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).render('admin/error', { title: 'Not found', message: 'Film not found.' });
  const existing = await WorkItem.findOne({ _id: req.params.id, mediaType: 'film' });
  if (!existing) return res.status(404).render('admin/error', { title: 'Not found', message: 'Film not found.' });
  return saveFilm(req, res, existing);
}));

module.exports = router;
