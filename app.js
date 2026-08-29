require('dotenv').config();

const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
  { type: 'video', thumb: '/images/portfolio/video1.jpg', youtube: 'https://www.youtube.com/watch?v=1q-AeSbV-nE', title: '10 Years of Maj Andersen', category: 'Film', year: '2026' },
  { type: 'picture', thumb: '/images/portfolio/photo1.jpg', title: 'Golf Balls', category: 'Photography', year: '2026' },
  { type: 'video', thumb: '/images/portfolio/video2.jpg', youtube: null, title: 'Container Wall', category: 'Film', year: '2026' },
  { type: 'picture', thumb: '/images/portfolio/photo2.jpg', title: 'Podium Speaker', category: 'Photography', year: '2025' },
  { type: 'video', thumb: '/images/portfolio/video3.jpg', youtube: null, title: 'Virunga Silver', category: 'Documentary', year: '2025' },
  { type: 'picture', thumb: '/images/portfolio/photo3.jpg', title: 'Blue Tree Light', category: 'Photography', year: '2025' },
  { type: 'video', thumb: '/images/portfolio/video4.jpg', youtube: null, title: 'Hard Work Tastes Different', category: 'Commercial', year: '2025' },
  { type: 'picture', thumb: '/images/portfolio/photo4.jpg', title: 'Studio Interview', category: 'Portrait', year: '2024' },
  { type: 'video', thumb: '/images/portfolio/video5.jpg', youtube: null, title: 'Greenhouse Story', category: 'Documentary', year: '2024' },
  { type: 'picture', thumb: '/images/portfolio/photo5.jpg', title: 'Child Portrait', category: 'Portrait', year: '2024' },
  { type: 'video', thumb: '/images/portfolio/video6.jpg', youtube: null, title: 'Summit Stage', category: 'Event Film', year: '2024' },
  { type: 'picture', thumb: '/images/portfolio/photo6.jpg', title: 'Panel Talk', category: 'Event', year: '2024' }
];

const teamMembers = [
  { image: '/images/team/member1.jpg', name: 'Amara Diallo', role: 'Creative Director', bio: "Shapes the studio's visual voice, from first concept to final cut." },
  { image: '/images/team/member2.jpg', name: 'Jonas Muller', role: 'Lead Cinematographer', bio: 'Finds the light in every scene, no matter the location.' },
  { image: '/images/team/member3.jpg', name: 'Octavisual', role: 'Photographer', bio: 'Turns quiet, unplanned moments into lasting images.' },
  { image: '/images/team/member4.jpg', name: 'Studio Editor', role: 'Editor', bio: 'Builds rhythm and pace out of hours of raw footage.' },
  { image: '/images/team/member5.jpg', name: 'Production Lead', role: 'Producer', bio: 'Keeps every production grounded, on time, and on budget.' },
  { image: '/images/team/member6.jpg', name: 'Portrait Unit', role: 'Photographer', bio: 'Specializes in portraits that feel candid, never posed.' }
];

app.get('/', (req, res) => {
  res.render('home', {
    title: 'Octavisual — Visual Stories',
    items: portfolioItems,
    team: teamMembers,
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
  console.log(`Octavisual running at http://localhost:${PORT}`);
});
