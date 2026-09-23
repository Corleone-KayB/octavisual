// YouTube URL parsing, oEmbed title lookup and thumbnail resolution.
const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be'
]);

function isValidId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id);
}

// Accepts watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/ URLs (with any
// extra params), URLs without a protocol, or a bare 11-character video ID.
function parseYouTubeId(input) {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  if (isValidId(raw)) return raw;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  let candidate = null;
  if (host.endsWith('youtu.be')) {
    candidate = url.pathname.split('/')[1];
  } else if (url.searchParams.has('v')) {
    candidate = url.searchParams.get('v');
  } else {
    const match = url.pathname.match(/^\/(?:shorts|embed|live|v|e)\/([^/?#]+)/);
    candidate = match ? match[1] : null;
  }

  return isValidId(candidate) ? candidate : null;
}

function watchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

function embedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

function thumbnailUrl(id, quality = 'hqdefault') {
  return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

// Returns { title, author } or throws with a user-facing message.
async function fetchOEmbed(id) {
  if (!isValidId(id)) throw new Error('Invalid YouTube video ID.');
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id))}`;
  let response;
  try {
    response = await fetchWithTimeout(endpoint);
  } catch {
    throw new Error('Could not reach YouTube. Check the connection and try again.');
  }
  if (response.status === 404 || response.status === 400) throw new Error('That YouTube video does not exist.');
  if (response.status === 401 || response.status === 403) throw new Error('That video is private or does not allow embedding.');
  if (!response.ok) throw new Error(`YouTube returned an error (${response.status}).`);
  const data = await response.json();
  return { title: String(data.title || '').slice(0, 140), author: String(data.author_name || '') };
}

// maxresdefault only exists for HD uploads; YouTube answers 404 otherwise.
async function resolveThumbnail(id) {
  const maxres = thumbnailUrl(id, 'maxresdefault');
  try {
    const response = await fetchWithTimeout(maxres, { method: 'HEAD' }, 6000);
    if (response.ok) return maxres;
  } catch {
    // Fall through to hqdefault, which exists for every public video.
  }
  return thumbnailUrl(id, 'hqdefault');
}

// Full server-side lookup used by the admin: validates the URL, fetches the
// title and picks the best thumbnail.
async function lookup(input) {
  const id = parseYouTubeId(input);
  if (!id) throw new Error('That does not look like a YouTube link.');
  const [meta, thumbnail] = await Promise.all([fetchOEmbed(id), resolveThumbnail(id)]);
  return { id, url: watchUrl(id), title: meta.title, author: meta.author, thumbnailUrl: thumbnail };
}

module.exports = { isValidId, parseYouTubeId, watchUrl, embedUrl, thumbnailUrl, fetchOEmbed, resolveThumbnail, lookup };
