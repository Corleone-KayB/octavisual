// Loads everything the public homepage needs in one pass. Results are cached
// briefly in memory; every admin write calls invalidate() so edits show up
// on the next request.
const Section = require('../models/Section');
const Settings = require('../models/Settings');
const Service = require('../models/Service');
const HeroSlide = require('../models/HeroSlide');
const TeamMember = require('../models/TeamMember');
const Category = require('../models/Category');
const WorkItem = require('../models/WorkItem');
const media = require('./media');
const youtube = require('./youtube');

const TTL_MS = 60 * 1000;
let cache = null;

function invalidate() {
  cache = null;
}

function categoryInfo(item, categoryMap) {
  const categories = (item.categories || [])
    .map(id => categoryMap.get(String(id)))
    .filter(Boolean);
  return {
    categoryNames: categories.map(category => category.name),
    categorySlugs: categories.map(category => category.slug)
  };
}

function presentFilm(item, categoryMap) {
  const thumbnail = item.customThumbnailUrl || item.thumbnailUrl;
  return {
    id: String(item._id),
    mediaType: 'film',
    title: item.title,
    description: item.description,
    year: item.year,
    order: item.order,
    client: item.client,
    featured: item.featured,
    youtubeId: youtube.isValidId(item.youtubeId) ? item.youtubeId : '',
    thumb: media.responsive(thumbnail, { widths: [480, 800, 1200, 1600], fallbackWidth: 1200 }),
    ...categoryInfo(item, categoryMap)
  };
}

function presentPhoto(item, categoryMap) {
  return {
    id: String(item._id),
    mediaType: 'photography',
    title: item.title,
    description: item.description,
    year: item.year,
    order: item.order,
    alt: item.alt || item.title,
    featured: item.featured,
    thumb: media.responsive(item.imageUrl, { widths: [480, 800, 1200, 1600], fallbackWidth: 1200 }),
    full: media.isCloudinaryUrl(item.imageUrl) ? media.sized(item.imageUrl, 2200) : item.imageUrl,
    ...categoryInfo(item, categoryMap)
  };
}

async function build() {
  const [sections, settings, services, heroSlides, team, categories, workItems] = await Promise.all([
    Section.find({ visible: true }).sort({ order: 1, createdAt: 1 }),
    Settings.getSite(),
    Service.find({ visible: true }).sort({ order: 1 }).lean(),
    HeroSlide.find({ visible: true }).sort({ order: 1 }).lean(),
    TeamMember.find({ visible: true }).sort({ order: 1 }).lean(),
    Category.find().sort({ order: 1, name: 1 }).lean(),
    WorkItem.find({ published: true }).sort({ order: 1, createdAt: -1 }).lean()
  ]);

  const categoryMap = new Map(categories.map(category => [String(category._id), category]));
  const film = workItems.filter(item => item.mediaType === 'film').map(item => presentFilm(item, categoryMap));
  const photography = workItems.filter(item => item.mediaType === 'photography').map(item => presentPhoto(item, categoryMap));

  // Only list categories that have at least one published item in that tab.
  const usedSlugs = { film: new Set(film.flatMap(i => i.categorySlugs)), photography: new Set(photography.flatMap(i => i.categorySlugs)) };
  const filters = {
    film: categories.filter(c => c.mediaType === 'film' && usedSlugs.film.has(c.slug)),
    photography: categories.filter(c => c.mediaType === 'photography' && usedSlugs.photography.has(c.slug))
  };

  const numbered = sections.map((section, index) => ({
    key: section.key,
    type: section.type,
    title: section.title,
    navLabel: section.navLabel || section.title,
    anchor: section.anchor,
    number: String(index + 1).padStart(2, '0'),
    fields: section.fields || {},
    image: media.responsive(section.fields?.imageUrl, { widths: [800, 1200, 1600, 2200], fallbackWidth: 1600 })
  }));

  return {
    sections: numbered,
    settings: settings.toObject(),
    services,
    heroSlides: heroSlides.map(slide => ({
      alt: slide.alt,
      ...media.responsive(slide.imageUrl, { widths: [800, 1200, 1600, 2200], fallbackWidth: 1600 })
    })),
    team: team.map(member => ({
      ...member,
      portrait: media.isCloudinaryUrl(member.imageUrl) ? media.transform(member.imageUrl, 'f_auto,q_auto,c_limit,w_720') : member.imageUrl,
      profileImage: media.isCloudinaryUrl(member.imageUrl) ? media.transform(member.imageUrl, 'f_auto,q_auto,c_limit,w_1200') : member.imageUrl
    })),
    work: { film, photography, filters }
  };
}

async function loadHomeContent() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const data = await build();
  cache = { at: Date.now(), data };
  return data;
}

module.exports = { loadHomeContent, invalidate };
