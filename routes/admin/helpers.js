// Shared route helpers for admin CRUD pages.
const mongoose = require('mongoose');

function flash(req, type, text) {
  req.session.flash = { type, text };
}

function isId(value) {
  return mongoose.isValidObjectId(value) && /^[a-f0-9]{24}$/i.test(String(value));
}

// Wraps async handlers so rejections reach the error middleware.
const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

// POST { ids: [...] } (JSON) -> sets `order` to each id's index.
function reorderHandler(Model, scope = () => ({})) {
  return wrap(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(isId) : [];
    if (!ids.length) return res.status(400).json({ error: 'Nothing to reorder.' });
    await Model.bulkWrite(ids.map((id, order) => ({
      updateOne: { filter: { _id: id, ...scope(req) }, update: { $set: { order } } }
    })));
    return res.json({ ok: true });
  });
}

// POST /:id/toggle/:field  -> flips a boolean field from an allowlist.
function toggleHandler(Model, allowedFields, redirectTo) {
  return wrap(async (req, res) => {
    const { id, field } = req.params;
    if (!isId(id) || !allowedFields.includes(field)) return res.status(400).send('Bad request');
    const doc = await Model.findById(id);
    if (!doc) return res.status(404).send('Not found');
    doc.set(field, !doc.get(field));
    await doc.save();
    if (req.get('accept')?.includes('application/json')) return res.json({ ok: true, value: doc.get(field) });
    flash(req, 'success', 'Saved.');
    return res.redirect(typeof redirectTo === 'function' ? redirectTo(req, doc) : redirectTo);
  });
}

function deleteHandler(Model, redirectTo, { label = 'Item', beforeDelete } = {}) {
  return wrap(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).send('Bad request');
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).send('Not found');
    if (beforeDelete) await beforeDelete(doc);
    await doc.deleteOne();
    flash(req, 'success', `${label} deleted.`);
    return res.redirect(typeof redirectTo === 'function' ? redirectTo(req, doc) : redirectTo);
  });
}

async function nextOrder(Model, filter = {}) {
  const last = await Model.findOne(filter).sort({ order: -1 }).select('order').lean();
  return last ? (last.order || 0) + 1 : 0;
}

module.exports = { flash, isId, wrap, reorderHandler, toggleHandler, deleteHandler, nextOrder };
