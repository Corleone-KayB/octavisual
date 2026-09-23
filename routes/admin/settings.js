// Contact & Socials and Footer pages (site-wide Settings document).
const express = require('express');
const Settings = require('../../models/Settings');
const Section = require('../../models/Section');
const validate = require('../../lib/validate');
const { fieldsFor } = require('../../lib/section-fields');
const { flash, wrap } = require('./helpers');

const router = express.Router();

// "Label | number" per line, or just a number.
function parsePhones(body, errors) {
  return validate.lines(body, 'phones', { label: 'Phone numbers', maxLines: 6 }, errors).map(line => {
    const [first, second] = line.split('|').map(part => part.trim());
    const phone = second === undefined ? { label: '', number: first } : { label: first.slice(0, 40), number: second };
    if (!/^\+?[\d\s().-]{6,24}$/.test(phone.number)) errors.push(`"${phone.number}" is not a valid phone number.`);
    return phone;
  });
}

router.get('/contact', wrap(async (req, res) => {
  const [settings, section] = await Promise.all([Settings.getSite(), Section.findOne({ type: 'contact' }).lean()]);
  res.render('admin/contact', { title: 'Contact & socials', settings: settings.toObject(), section, fields: fieldsFor('contact'), errors: [] });
}));

router.post('/contact', wrap(async (req, res) => {
  const settings = await Settings.getSite();
  const errors = [];
  const data = {
    contactEmail: validate.email(req.body, 'contactEmail', { label: 'Contact email' }, errors),
    locationLines: validate.lines(req.body, 'locationLines', { label: 'Location', maxLines: 4, max: 200 }, errors),
    phones: parsePhones(req.body, errors),
    socials: {
      instagram: validate.url(req.body, 'instagram', { label: 'Instagram' }, errors),
      youtube: validate.url(req.body, 'youtube', { label: 'YouTube' }, errors),
      linkedin: validate.url(req.body, 'linkedin', { label: 'LinkedIn' }, errors)
    }
  };
  if (errors.length) {
    const section = await Section.findOne({ type: 'contact' }).lean();
    return res.status(400).render('admin/contact', {
      title: 'Contact & socials', settings: { ...settings.toObject(), ...data }, section, fields: fieldsFor('contact'), errors
    });
  }
  settings.set(data);
  await settings.save();
  flash(req, 'success', 'Contact details saved.');
  return res.redirect('/admin/contact');
}));

router.get('/footer', wrap(async (req, res) => {
  const settings = await Settings.getSite();
  res.render('admin/footer', { title: 'Footer', footer: settings.footer || {}, errors: [] });
}));

router.post('/footer', wrap(async (req, res) => {
  const settings = await Settings.getSite();
  const errors = [];
  const footer = {
    copyright: validate.text(req.body, 'copyright', { label: 'Copyright', max: 80, required: true }, errors),
    tagline: validate.text(req.body, 'tagline', { label: 'Tagline', max: 120 }, errors),
    backToTop: validate.text(req.body, 'backToTop', { label: 'Back to top label', max: 40 }, errors)
  };
  if (errors.length) return res.status(400).render('admin/footer', { title: 'Footer', footer, errors });
  settings.footer = footer;
  await settings.save();
  flash(req, 'success', 'Footer saved.');
  return res.redirect('/admin/footer');
}));

module.exports = router;
