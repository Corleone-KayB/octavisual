const express = require('express');
const Service = require('../../models/Service');
const validate = require('../../lib/validate');
const { flash, isId, wrap, reorderHandler, toggleHandler, deleteHandler, nextOrder } = require('./helpers');

const router = express.Router();

router.get('/', wrap(async (req, res) => {
  const services = await Service.find().sort({ order: 1 }).lean();
  res.render('admin/services', { title: 'Services', services });
}));

router.post('/reorder', reorderHandler(Service));
router.post('/:id/toggle/:field', toggleHandler(Service, ['visible'], '/admin/services'));
router.post('/:id/delete', deleteHandler(Service, '/admin/services', { label: 'Service' }));

function parse(req, errors) {
  return {
    name: validate.text(req.body, 'name', { label: 'Name', max: 60, required: true }, errors),
    description: validate.text(req.body, 'description', { label: 'Description', max: 500 }, errors)
  };
}

router.post('/', wrap(async (req, res) => {
  const errors = [];
  const data = parse(req, errors);
  if (errors.length) flash(req, 'error', errors.join(' '));
  else {
    await Service.create({ ...data, order: await nextOrder(Service), visible: true });
    flash(req, 'success', 'Service added.');
  }
  res.redirect('/admin/services');
}));

router.post('/:id', wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).send('Not found');
  const errors = [];
  const data = parse(req, errors);
  if (errors.length) flash(req, 'error', errors.join(' '));
  else {
    await Service.updateOne({ _id: req.params.id }, { $set: data }, { runValidators: true });
    flash(req, 'success', 'Service saved.');
  }
  return res.redirect('/admin/services');
}));

module.exports = router;
