const express = require('express');
const Section = require('../../models/Section');
const TeamMember = require('../../models/TeamMember');
const media = require('../../lib/media');
const validate = require('../../lib/validate');
const { fieldsFor } = require('../../lib/section-fields');
const { storeImage } = require('./upload-helper');
const { flash, isId, wrap, reorderHandler, toggleHandler, deleteHandler, nextOrder } = require('./helpers');

const router = express.Router();

router.get('/', wrap(async (req, res) => {
  const [section, members] = await Promise.all([
    Section.findOne({ type: 'team' }).lean(),
    TeamMember.find().sort({ order: 1 }).lean()
  ]);
  res.render('admin/team/index', {
    title: 'Team', section, fields: fieldsFor('team'),
    members: members.map(m => ({ ...m, thumb: media.sized(m.imageUrl, 240) }))
  });
}));

router.post('/reorder', reorderHandler(TeamMember));
router.post('/:id/toggle/:field', toggleHandler(TeamMember, ['visible'], '/admin/team'));
router.post('/:id/delete', deleteHandler(TeamMember, '/admin/team', {
  label: 'Team member',
  beforeDelete: member => media.destroy(member.imagePublicId)
}));

function parse(req, errors) {
  return {
    name: validate.text(req.body, 'name', { label: 'Name', max: 80, required: true }, errors),
    role: validate.text(req.body, 'role', { label: 'Role', max: 80 }, errors),
    bio: validate.text(req.body, 'bio', { label: 'Bio', max: 2000 }, errors),
    cv: validate.url(req.body, 'cv', { label: 'CV link', allowRelative: true }, errors),
    instagram: validate.url(req.body, 'instagram', { label: 'Instagram' }, errors),
    linkedin: validate.url(req.body, 'linkedin', { label: 'LinkedIn' }, errors),
    vimeo: validate.url(req.body, 'vimeo', { label: 'Vimeo' }, errors),
    website: validate.url(req.body, 'website', { label: 'Website' }, errors),
    visible: validate.bool(req.body, 'visible')
  };
}

function renderForm(res, status, member, errors = []) {
  return res.status(status).render('admin/team/form', {
    title: member._id ? `Edit ${member.name}` : 'Add team member',
    member, errors, preview: media.sized(member.imageUrl, 480)
  });
}

router.get('/new', (req, res) => renderForm(res, 200, { name: '', visible: true }));

router.get('/:id/edit', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).render('admin/error', { title: 'Not found', message: 'Team member not found.' });
  const member = await TeamMember.findById(req.params.id).lean();
  if (!member) return res.status(404).render('admin/error', { title: 'Not found', message: 'Team member not found.' });
  return renderForm(res, 200, member);
}));

async function save(req, res, existing) {
  const errors = [];
  const data = parse(req, errors);
  if (req.uploadError) errors.push(req.uploadError);
  if (!existing && !req.file) errors.push('Add a portrait image.');
  if (errors.length) return renderForm(res, 400, { ...(existing ? existing.toObject() : {}), ...data }, errors);

  const member = existing || new TeamMember({ order: await nextOrder(TeamMember) });
  member.set(data);
  if (!existing) {
    const base = validate.slugify(data.name) || 'member';
    let slug = base;
    for (let n = 2; await TeamMember.exists({ slug }); n += 1) slug = `${base}-${n}`;
    member.slug = slug;
  }

  const previous = member.imagePublicId;
  if (req.file) {
    try {
      const image = await storeImage(req.file, 'team');
      member.imageUrl = image.url;
      member.imagePublicId = image.publicId;
    } catch (error) {
      return renderForm(res, 400, { ...member.toObject() }, [error.message]);
    }
  }
  await member.save();
  if (req.file && previous) await media.destroy(previous);
  flash(req, 'success', existing ? 'Team member saved.' : 'Team member added.');
  return res.redirect('/admin/team');
}

router.post('/', wrap(async (req, res) => save(req, res, null)));

router.post('/:id', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).render('admin/error', { title: 'Not found', message: 'Team member not found.' });
  const existing = await TeamMember.findById(req.params.id);
  if (!existing) return res.status(404).render('admin/error', { title: 'Not found', message: 'Team member not found.' });
  return save(req, res, existing);
}));

module.exports = router;
