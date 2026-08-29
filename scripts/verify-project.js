const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'app.js',
  'package.json',
  'views/home.ejs',
  'views/partials/header.ejs',
  'views/partials/footer.ejs',
  'public/css/style.css',
  'public/js/app-ui.js',
  'public/js/animations.js',
  'public/images/optimized/slide1.webp',
  'public/images/optimized/slide2.webp',
  'public/images/optimized/slide3.webp',
  'public/images/optimized/slide4.webp',
  'public/images/optimized/slide5.webp',
  'public/images/about-cinematic.jpg'
];

let failed = false;
function fail(message) {
  failed = true;
  console.error(`FAIL: ${message}`);
}
function pass(message) {
  console.log(`PASS: ${message}`);
}

for (const relative of required) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) fail(`Missing ${relative}`);
}
if (!failed) pass('Required project files and five hero images exist.');

const home = fs.readFileSync(path.join(root, 'views/home.ejs'), 'utf8');
for (const token of ['id="home"', 'id="heroBook"', 'id="heroPrev"', 'id="heroNext"', 'hero-page-edge', 'heroSlideStatus']) {
  if (!home.includes(token)) fail(`home.ejs missing ${token}`);
}
pass('Hero book markup is present.');

for (const token of ['id="about"', 'about-scroll-stage', 'about-cinematic-frame', 'about-cinematic-image', 'about-emotional', 'Since 2017, in Kigali', "Every story we shoot"]) {
  if (!home.includes(token)) fail(`home.ejs missing cinematic About token ${token}`);
}
pass('Cinematic About markup and copy are present.');

const ui = fs.readFileSync(path.join(root, 'public/js/app-ui.js'), 'utf8');
const animations = fs.readFileSync(path.join(root, 'public/js/animations.js'), 'utf8');
try { new Function(ui); pass('app-ui.js parses successfully.'); } catch (error) { fail(`app-ui.js syntax error: ${error.message}`); }
try { new Function(animations); pass('animations.js parses successfully.'); } catch (error) { fail(`animations.js syntax error: ${error.message}`); }

for (const token of ['Element.prototype.animate', 'turnForward', 'turnBackward', 'pointerdown', 'ArrowRight', 'autoplayDelay']) {
  if (!ui.includes(token)) fail(`Book interaction code missing ${token}`);
}
pass('Manual page-turn, swipe, keyboard and autoplay logic is present.');

const css = fs.readFileSync(path.join(root, 'public/css/style.css'), 'utf8');
for (const token of ['HERO BOOK / MANUAL PAGE STACK', 'perspective: 1900px', '.hero-page-button', '.hero-page-edge', 'prefers-reduced-motion']) {
  if (!css.includes(token)) fail(`Hero book CSS missing ${token}`);
}
pass('3D page-stack and responsive CSS is present.');

for (const token of ['ABOUT CINEMATIC SCROLL CHAPTER', '.about-scroll-stage', '.about-cinematic-frame', '.about-emotional', 'position: sticky']) {
  if (!css.includes(token)) fail(`Cinematic About CSS missing ${token}`);
}
for (const token of ['About cinematic scroll chapter', 'scrub: 1.05', 'compactScaleX', 'about-cinematic-copy']) {
  if (!animations.includes(token)) fail(`Cinematic About animation missing ${token}`);
}
pass('Reversible scrubbed About animation is present.');

if (failed) process.exit(1);
console.log('\nOctavisual project verification completed successfully.');
