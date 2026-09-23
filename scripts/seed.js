#!/usr/bin/env node
// Imports the original hardcoded Octavisual content into MongoDB and uploads
// its images to Cloudinary.
//
// Safe to run repeatedly:
//   - every record is matched on a stable key (seedKey / slug / key) and
//     created only if missing, so there are never duplicates;
//   - existing records keep any edits made in the admin, except that local
//     /images/... paths are upgraded to Cloudinary URLs once Cloudinary works;
//   - Cloudinary uploads use fixed public IDs with overwrite disabled.
//
// Usage: npm run seed            (create missing content, upgrade media)
//        npm run seed -- --force (also reset seeded records to the original copy)
require('dotenv').config();

const path = require('path');
const { connectDB, mongoose } = require('../lib/db');
const media = require('../lib/media');
const youtube = require('../lib/youtube');
const Section = require('../models/Section');
const Category = require('../models/Category');
const WorkItem = require('../models/WorkItem');
const HeroSlide = require('../models/HeroSlide');
const Service = require('../models/Service');
const TeamMember = require('../models/TeamMember');
const Settings = require('../models/Settings');

const FORCE = process.argv.includes('--force');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const stats = { created: 0, updated: 0, unchanged: 0, uploads: 0, warnings: [] };

// ---------------------------------------------------------------------------
// Original content (previously hardcoded in app.js, home.ejs and partials)
// ---------------------------------------------------------------------------
const sections = [
  {
    key: 'hero', type: 'hero', title: 'Home', navLabel: 'Home', order: 0,
    fields: {
      kicker: 'Kigali / Rwanda',
      stamp: 'OctaVisual · 2026',
      headline: 'Stories that',
      headlineEmphasis: 'stay with you.',
      lede: 'We turn people, places and ideas into cinematic images with clarity, restraint and feeling.',
      ctaLabel: 'Explore work',
      cue: 'Turn the page'
    }
  },
  {
    key: 'about', type: 'about', title: 'About the studio', navLabel: 'About', order: 1,
    fields: {
      meta: 'Since 2017 · Kigali, RW',
      introLines: [
        'Every story we shoot, we shoot like it\'s the only one that matters.',
        'Because to whoever\'s in it, it is.'
      ],
      emotionalLines: [
        'Since 2017, in Kigali — film, photography, direction.',
        'Quiet portraits. Full productions. NGOs, brands, places worth remembering.'
      ],
      imageUrl: '/images/about-cinematic.jpg',
      imageAlt: 'People weighing a harvested sack in a field in Rwanda',
      footnoteLeft: 'Octavisual / Kigali',
      footnoteRight: 'Scroll to unfold · scroll back to rewind'
    }
  },
  {
    key: 'work', type: 'work', title: 'Selected work', navLabel: 'Selected work', order: 2,
    fields: { intro: 'A selection of commercial, documentary and editorial work.' }
  },
  {
    key: 'team', type: 'team', title: 'People', navLabel: 'People', order: 3,
    fields: {
      meta: 'Small team · big stories',
      kicker: 'Small team,',
      titleStrong: 'big',
      titleEmphasis: 'stories.',
      footerLeft: 'Click a portrait to meet the person',
      footerRight: 'Scroll to compose · scroll back to rewind',
      emptyLinks: 'CV & social links coming soon.'
    }
  },
  {
    key: 'contact', type: 'contact', title: 'Contact', navLabel: 'Contact', order: 4,
    fields: {
      meta: 'Available for select projects',
      statement: 'Let\'s make something',
      statementEmphasis: 'worth remembering.'
    }
  }
];

const settings = {
  contactEmail: 'hello@octavisual.com',
  locationLines: ['Kigali, Rwanda', 'Available worldwide'],
  phones: [{ label: '', number: '+250 700 000 000' }, { label: '', number: '+250 780 000 000' }],
  socials: {
    instagram: 'https://www.instagram.com/',
    youtube: 'https://www.youtube.com/',
    linkedin: 'https://www.linkedin.com/'
  },
  footer: {
    copyright: 'Octavisual.',
    tagline: 'Film · Photography · Visual storytelling',
    backToTop: 'Back to top ↑'
  }
};

const services = [
  { seedKey: 'service:film', name: 'Film', order: 0 },
  { seedKey: 'service:photography', name: 'Photography', order: 1 },
  { seedKey: 'service:direction', name: 'Direction', order: 2 }
];

const heroSlides = [
  { file: 'images/slide1.jpg', alt: 'Misty green hills rising above the clouds in Rwanda' },
  { file: 'images/slide2.jpg', alt: 'Corporate team gathering photographed outdoors in Rwanda' },
  { file: 'images/slide3.jpg', alt: 'Team portrait at an outdoor event in Kigali' },
  { file: 'images/slide4.jpg', alt: 'Farmer working in a green potato field in Rwanda' },
  { file: 'images/slide5.jpg', alt: 'Farmer holding freshly harvested potatoes in Rwanda' }
];

const categories = [
  { mediaType: 'film', name: 'Film', slug: 'film', order: 0 },
  { mediaType: 'film', name: 'Documentary', slug: 'documentary', order: 1 },
  { mediaType: 'film', name: 'Commercial', slug: 'commercial', order: 2 },
  { mediaType: 'film', name: 'Event Film', slug: 'event-film', order: 3 },
  { mediaType: 'photography', name: 'Photography', slug: 'photography', order: 0 },
  { mediaType: 'photography', name: 'Portrait', slug: 'portrait', order: 1 },
  { mediaType: 'photography', name: 'Event', slug: 'event', order: 2 }
];

// The original interleaved portfolio order is kept as each item's order.
const portfolio = [
  { key: 'video1', type: 'film', thumb: 'images/portfolio/video1.jpg', youtube: 'https://www.youtube.com/watch?v=1q-AeSbV-nE', title: '10 Years of Maj Andersen', category: 'film', year: '2026' },
  { key: 'photo1', type: 'photography', thumb: 'images/portfolio/photo1.jpg', title: 'Golf Balls', category: 'photography', year: '2026' },
  { key: 'video2', type: 'film', thumb: 'images/portfolio/video2.jpg', youtube: null, title: 'Container Wall', category: 'film', year: '2026' },
  { key: 'photo2', type: 'photography', thumb: 'images/portfolio/photo2.jpg', title: 'Podium Speaker', category: 'photography', year: '2025' },
  { key: 'video3', type: 'film', thumb: 'images/portfolio/video3.jpg', youtube: null, title: 'Virunga Silver', category: 'documentary', year: '2025' },
  { key: 'photo3', type: 'photography', thumb: 'images/portfolio/photo3.jpg', title: 'Blue Tree Light', category: 'photography', year: '2025' },
  { key: 'video4', type: 'film', thumb: 'images/portfolio/video4.jpg', youtube: null, title: 'Hard Work Tastes Different', category: 'commercial', year: '2025' },
  { key: 'photo4', type: 'photography', thumb: 'images/portfolio/photo4.jpg', title: 'Studio Interview', category: 'portrait', year: '2024' },
  { key: 'video5', type: 'film', thumb: 'images/portfolio/video5.jpg', youtube: null, title: 'Greenhouse Story', category: 'documentary', year: '2024' },
  { key: 'photo5', type: 'photography', thumb: 'images/portfolio/photo5.jpg', title: 'Child Portrait', category: 'portrait', year: '2024' },
  { key: 'video6', type: 'film', thumb: 'images/portfolio/video6.jpg', youtube: null, title: 'Summit Stage', category: 'event-film', year: '2024' },
  { key: 'photo6', type: 'photography', thumb: 'images/portfolio/photo6.jpg', title: 'Panel Talk', category: 'event', year: '2024' }
];

const team = [
  { slug: 'fiette', file: 'images/team/fiette.webp', name: 'Fiette' },
  { slug: 'serge', file: 'images/team/serge.webp', name: 'Serge' },
  { slug: 'octave', file: 'images/team/octave-placeholder.svg', name: 'Octave' },
  { slug: 'innocent', file: 'images/team/innocent.webp', name: 'Innocent' },
  { slug: 'ice', file: 'images/team/ice.webp', name: 'Ice', cv: '/cv/cedric-cv.pdf' }
].map((member, order) => ({
  role: 'Team member', bio: 'Profile details coming soon.', cv: '', instagram: '', linkedin: '', vimeo: '', website: '',
  ...member, order
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let cloudinaryReady = false;

async function checkCloudinary() {
  if (!media.isConfigured()) {
    stats.warnings.push('Cloudinary is not configured: images keep their local /images paths.');
    return;
  }
  try {
    await media.cloudinary.api.ping();
    cloudinaryReady = true;
  } catch (error) {
    stats.warnings.push(`Cloudinary rejected the credentials (${error?.error?.message || error.message}); images keep their local /images paths. Fix .env and re-run the seed to move them to Cloudinary.`);
  }
}

// Upload a file from public/ under a fixed public ID. Falls back to a local
// path (the web-sized derivative when given) when Cloudinary is unavailable
// so the site still renders.
async function asset(relativePath, publicId, localFallback = relativePath) {
  const local = { url: `/${localFallback}`, publicId: '' };
  if (!cloudinaryReady) return local;
  try {
    const result = await media.uploadFile(path.join(PUBLIC_DIR, relativePath), { folder: 'seed', publicId });
    stats.uploads += 1;
    return { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height };
  } catch (error) {
    stats.warnings.push(`Upload failed for ${relativePath}: ${error.message}`);
    return local;
  }
}

const isLocal = value => typeof value === 'string' && value.startsWith('/images/');

// Create when missing. With --force, reset to the seed values. Otherwise only
// replace media fields that still point at a local /images path.
async function upsert(Model, filter, doc, mediaFields = []) {
  const existing = await Model.findOne(filter);
  if (!existing) {
    await Model.create({ ...filter, ...doc });
    stats.created += 1;
    return;
  }
  if (FORCE) {
    existing.set(doc);
  } else {
    for (const [field, companion] of mediaFields) {
      if (isLocal(existing.get(field)) && doc[field] && !isLocal(doc[field])) {
        existing.set(field, doc[field]);
        if (companion) existing.set(companion, doc[companion]);
      }
    }
  }
  if (existing.isModified()) {
    await existing.save();
    stats.updated += 1;
  } else {
    stats.unchanged += 1;
  }
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seed() {
  await connectDB();
  await Promise.all([Section, Category, WorkItem, HeroSlide, Service, TeamMember, Settings].map(Model => Model.init()));
  await checkCloudinary();

  // Sections (the About background image lives in the section's fields).
  for (const section of sections) {
    const fields = { ...section.fields };
    if (section.type === 'about') {
      const image = await asset('images/about-cinematic.jpg', 'about-cinematic');
      fields.imageUrl = image.url;
      fields.imagePublicId = image.publicId;
    }
    const existing = await Section.findOne({ key: section.key });
    if (existing && !FORCE && existing.type === 'about' && isLocal(existing.fields?.imageUrl) && !isLocal(fields.imageUrl)) {
      existing.fields = { ...existing.fields, imageUrl: fields.imageUrl, imagePublicId: fields.imagePublicId };
      existing.markModified('fields');
      await existing.save();
      stats.updated += 1;
    } else {
      await upsert(Section, { key: section.key }, { ...section, fields });
    }
  }

  const existingSettings = await Settings.findOne({ key: 'site' });
  if (!existingSettings) {
    await Settings.create({ key: 'site', ...settings });
    stats.created += 1;
  } else if (FORCE) {
    existingSettings.set(settings);
    await existingSettings.save();
    stats.updated += 1;
  } else {
    stats.unchanged += 1;
  }

  for (const service of services) {
    await upsert(Service, { seedKey: service.seedKey }, service);
  }

  for (const [index, slide] of heroSlides.entries()) {
    const image = await asset(slide.file, `hero-slide-${index + 1}`, `images/optimized/slide${index + 1}.webp`);
    await upsert(HeroSlide, { seedKey: `hero:${index + 1}` }, {
      imageUrl: image.url, imagePublicId: image.publicId, alt: slide.alt, order: index, visible: true
    }, [['imageUrl', 'imagePublicId']]);
  }

  const categoryIds = {};
  for (const category of categories) {
    await upsert(Category, { mediaType: category.mediaType, slug: category.slug }, { name: category.name, order: category.order });
    const saved = await Category.findOne({ mediaType: category.mediaType, slug: category.slug });
    categoryIds[`${category.mediaType}:${category.slug}`] = saved._id;
  }

  for (const [order, item] of portfolio.entries()) {
    const image = await asset(item.thumb, `portfolio-${item.key}`);
    const category = categoryIds[`${item.type}:${item.category}`];
    const base = {
      mediaType: item.type, title: item.title, year: item.year, order,
      categories: category ? [category] : [], published: true
    };

    if (item.type === 'film') {
      const youtubeId = youtube.parseYouTubeId(item.youtube || '') || '';
      const thumbnailUrl = youtubeId ? await youtube.resolveThumbnail(youtubeId) : '';
      await upsert(WorkItem, { seedKey: `work:${item.key}` }, {
        ...base,
        youtubeUrl: youtubeId ? youtube.watchUrl(youtubeId) : '',
        youtubeId,
        thumbnailUrl,
        // The original site used its own stills as thumbnails; keep them.
        customThumbnailUrl: image.url,
        customThumbnailPublicId: image.publicId
      }, [['customThumbnailUrl', 'customThumbnailPublicId']]);
    } else {
      await upsert(WorkItem, { seedKey: `work:${item.key}` }, {
        ...base,
        imageUrl: image.url,
        imagePublicId: image.publicId,
        width: image.width,
        height: image.height,
        source: 'upload',
        alt: item.title
      }, [['imageUrl', 'imagePublicId']]);
    }
  }

  for (const member of team) {
    const { file, ...rest } = member;
    const image = await asset(file, `team-${member.slug}`);
    await upsert(TeamMember, { slug: member.slug }, { ...rest, imageUrl: image.url, imagePublicId: image.publicId }, [['imageUrl', 'imagePublicId']]);
  }

  console.log(`Seed complete${FORCE ? ' (--force)' : ''}: ${stats.created} created, ${stats.updated} updated, ${stats.unchanged} unchanged, ${stats.uploads} Cloudinary uploads checked.`);
  for (const warning of [...new Set(stats.warnings)]) console.warn(`WARNING: ${warning}`);
}

seed()
  .catch(error => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
