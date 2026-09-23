const express = require('express');
const nodemailer = require('nodemailer');
const { loadHomeContent } = require('../lib/content');

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

// Header values must not contain line breaks (header injection).
function singleLine(value, max) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

router.get('/', async (req, res, next) => {
  try {
    const content = await loadHomeContent();
    res.render('home', {
      title: 'Octavisual — Visual Stories',
      ...content,
      success: req.query.success === 'true',
      error: req.query.error === 'true'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/contact', async (req, res) => {
  const name = singleLine(req.body.name, 120);
  const email = singleLine(req.body.email, 200);
  const subject = singleLine(req.body.subject, 200);
  const message = String(req.body.message ?? '').slice(0, 5000);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !subject || !message.trim()) {
    return res.redirect('/?error=true#contact');
  }

  try {
    await transporter.sendMail({
      from: `"${name.replace(/"/g, '')}" <${process.env.SMTP_USER}>`,
      replyTo: email,
      to: process.env.CONTACT_TO_EMAIL,
      subject: `New message from ${name}: ${subject}`,
      text: message,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Subject:</strong> ${escapeHtml(subject)}</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
    });
    res.redirect('/?success=true#contact');
  } catch (err) {
    console.error('Contact form email failed:', err);
    res.redirect('/?error=true#contact');
  }
});

module.exports = router;
