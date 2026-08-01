
require('dotenv').config();
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files and middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const portfolioItems = [
  { type: 'video',   thumb: '/images/portfolio/video1.jpg', youtube: 'https://www.youtube.com/watch?v=1q-AeSbV-nE', title: '10 years of Maj Andersen' },
  { type: 'picture', thumb: '/images/portfolio/photo1.jpg', title: 'Golf Balls' },
  { type: 'video',   thumb: '/images/portfolio/video2.jpg', youtube: 'https://www.youtube.com/watch?v=VIDEO_ID_2', title: 'Container Wall' },
  { type: 'picture', thumb: '/images/portfolio/photo2.jpg', title: 'Podium Speaker' },
  { type: 'video',   thumb: '/images/portfolio/video3.jpg', youtube: 'https://www.youtube.com/watch?v=VIDEO_ID_3', title: 'Virunga Silver' },
  { type: 'picture', thumb: '/images/portfolio/photo3.jpg', title: 'Blue Tree Light' },
  { type: 'video',   thumb: '/images/portfolio/video4.jpg', youtube: 'https://www.youtube.com/watch?v=VIDEO_ID_4', title: 'Hard Work Tastes Different' },
  { type: 'picture', thumb: '/images/portfolio/photo4.jpg', title: 'Studio Interview' },
  { type: 'video',   thumb: '/images/portfolio/video5.jpg', youtube: 'https://www.youtube.com/watch?v=VIDEO_ID_5', title: 'Greenhouse Story' },
  { type: 'picture', thumb: '/images/portfolio/photo5.jpg', title: 'Child Portrait' },
  { type: 'video',   thumb: '/images/portfolio/video6.jpg', youtube: 'https://www.youtube.com/watch?v=VIDEO_ID_6', title: 'Summit Stage' },
  { type: 'picture', thumb: '/images/portfolio/photo6.jpg', title: 'Panel Talk' }
];
  
// Routes
app.get('/', (req, res) => {
  res.render('home', {
    title: 'Octavisual.',
    items: portfolioItems,
    success: req.query.success === 'true',
    error: req.query.error === 'true'
  });
});

app.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    await transporter.sendMail({
      from: `"${name}" <${process.env.SMTP_USER}>`,
      replyTo: email,
      to: process.env.CONTACT_TO_EMAIL,
      subject: `New message from ${name}: ${subject}`,
      text: message,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><p>${message}</p>`
    });
    res.redirect('/?success=true#contact');
  } catch (err) {
    console.error('Contact form email failed:', err);
    res.redirect('/?error=true#contact');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});