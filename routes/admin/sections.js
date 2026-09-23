const express = require('express');
const Section = require('../../models/Section');
const validate = require('../../lib/validate');
const { fieldsFor, parseFields } = require('../../lib/section-fields');
const { flash, isId, wrap, reorderHandler, toggleHandler, deleteHandler, nextOrder } = require('./helpers');

const router = express.Router();

const TYPE_LABELS = { hero: 'Hero', about: 'About', work: 'Selected work', team: 'Team', contact: 'Contact', text: 'Text block' };

// Forms on other pages (Hero, About, Team, Contact) post here and pass
// _return so the admin lands back where they were.
function returnPath(req, fallback) {
  const value = String(req.body?._return || '');
  return /^\/admin(\/[a-z0-9-]*)*$/.test(value) ? value : fallback;
}

async function availableTypes() {
  const used = new Set((await Section.find().select('type').lean()).map(s => s.type));
  return Section.TYPES.filter(type => type === 'text' || !used.has(type));
}

router.get('/', wrap(async (req, res) => {
  const sections = await Section.find().sort({ order: 1, createdAt: 1 }).lean();
  res.render('admin/sections/index', { title: 'Sections', sections, typeLabels: TYPE_LABELS, canAdd: (await availableTypes()).length > 0 });
}));

router.post('/reorder', reorderHandler(Section));
router.post('/:id/toggle/:field', toggleHandler(Section, ['visible'], '/admin/sections'));
router.post('/:id/delete', deleteHandler(Section, '/admin/sections', { label: 'Section' }));

router.get('/new', wrap(async (req, res) => {
  const types = await availableTypes();
  const type = types.includes(req.query.type) ? req.query.type : types[0] || 'text';
  res.render('admin/sections/form', {
    title: 'Add section', section: { type, title: '', navLabel: '', visible: true, fields: {} },
    types, typeLabels: TYPE_LABELS, fields: fieldsFor(type), errors: [], isNew: true
  });
}));

router.post('/', wrap(async (req, res) => {
  const errors = [];
  const types = await availableTypes();
  const type = String(req.body.type || '');
  if (!types.includes(type)) errors.push('Choose a section type that is not already on the page.');
  const title = validate.text(req.body, 'title', { label: 'Title', max: 80, required: true }, errors);
  const navLabel = validate.text(req.body, 'navLabel', { label: 'Navigation label', max: 40 }, errors);
  const fields = parseFields(type, req.body, {}, errors);

  if (errors.length) {
    return res.status(400).render('admin/sections/form', {
      title: 'Add section', section: { type, title, navLabel, visible: validate.bool(req.body, 'visible'), fields },
      types, typeLabels: TYPE_LABELS, fields: fieldsFor(type), errors, isNew: true
    });
  }

  // Built-in types use their type as key; text blocks get a unique slug.
  let key = type === 'text' ? validate.slugify(title) || 'section' : type;
  if (type === 'text') {
    const base = key;
    for (let n = 2; await Section.exists({ key }); n += 1) key = `${base}-${n}`;
  }

  await Section.create({
    key, type, title, navLabel, fields,
    visible: validate.bool(req.body, 'visible'),
    order: await nextOrder(Section)
  });
  flash(req, 'success', `${TYPE_LABELS[type]} section added.`);
  return res.redirect('/admin/sections');
}));

router.get('/:id/edit', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).render('admin/error', { title: 'Not found', message: 'Section not found.' });
  const section = await Section.findById(req.params.id).lean();
  if (!section) return res.status(404).render('admin/error', { title: 'Not found', message: 'Section not found.' });
  return res.render('admin/sections/form', {
    title: `Edit ${section.title}`, section, types: [section.type], typeLabels: TYPE_LABELS,
    fields: fieldsFor(section.type), errors: [], isNew: false
  });
}));

router.post('/:id', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).render('admin/error', { title: 'Not found', message: 'Section not found.' });
  const section = await Section.findById(req.params.id);
  if (!section) return res.status(404).render('admin/error', { title: 'Not found', message: 'Section not found.' });

  const errors = [];
  // Pages that only edit copy (Hero, About...) omit title/visibility inputs.
  const copyOnly = req.body._copyOnly === '1';
  const title = copyOnly ? section.title : validate.text(req.body, 'title', { label: 'Title', max: 80, required: true }, errors);
  const navLabel = copyOnly ? section.navLabel : validate.text(req.body, 'navLabel', { label: 'Navigation label', max: 40 }, errors);
  const fields = parseFields(section.type, req.body, section.fields || {}, errors);

  if (errors.length) {
    if (copyOnly) {
      flash(req, 'error', errors.join(' '));
      return res.redirect(returnPath(req, `/admin/sections/${section._id}/edit`));
    }
    return res.status(400).render('admin/sections/form', {
      title: `Edit ${section.title}`,
      section: { ...section.toObject(), title, navLabel, fields, visible: validate.bool(req.body, 'visible') },
      types: [section.type], typeLabels: TYPE_LABELS, fields: fieldsFor(section.type), errors, isNew: false
    });
  }

  section.title = title;
  section.navLabel = navLabel;
  section.fields = fields;
  section.markModified('fields');
  if (!copyOnly) section.visible = validate.bool(req.body, 'visible');
  await section.save();
  flash(req, 'success', 'Section saved.');
  return res.redirect(returnPath(req, '/admin/sections'));
}));

module.exports = router;
