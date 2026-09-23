// Image validation by magic bytes and SSRF-safe downloading of remote images.
const dns = require('dns');
const http = require('http');
const https = require('https');
const net = require('net');

const MAX_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 15) * 1024 * 1024;
const ALLOWED_TYPES = ['jpeg', 'png', 'webp', 'avif'];
const MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };

// Identify the real file type from its first bytes, ignoring name/extension.
function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const boxSize = Math.min(buffer.readUInt32BE(0), buffer.length);
    for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
      if (offset === 12) continue; // minor version, not a brand
      const brand = buffer.toString('ascii', offset, offset + 4);
      if (brand === 'avif' || brand === 'avis') return 'avif';
    }
  }
  return null;
}

// ---------- SSRF protection ----------
function isPrivateAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19));
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7));
    return lower === '::' || lower === '::1' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith('ff');
  }
  return true;
}

// DNS lookup that refuses private/loopback/link-local targets. Used as the
// socket's lookup, so the address checked is the address connected to.
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family }];
    const blocked = list.find(entry => isPrivateAddress(entry.address));
    if (blocked || !list.length) return callback(new Error('That address is not allowed.'));
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

function download(urlString, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(urlString);
    } catch {
      return reject(new Error('Invalid URL.'));
    }
    if (!['http:', 'https:'].includes(url.protocol)) return reject(new Error('Only http(s) links are allowed.'));
    if (url.username || url.password) return reject(new Error('Links with credentials are not allowed.'));
    if (net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && isPrivateAddress(url.hostname.replace(/^\[|\]$/g, ''))) {
      return reject(new Error('That address is not allowed.'));
    }

    const client = url.protocol === 'https:' ? https : http;
    const request = client.get(url, {
      lookup: safeLookup,
      timeout: 15000,
      headers: { 'User-Agent': 'OctavisualCMS/1.0 (+image import)', Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.5' }
    }, response => {
      const { statusCode } = response;
      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects.'));
        return resolve(download(new URL(response.headers.location, url).toString(), redirectsLeft - 1));
      }
      if (statusCode !== 200) {
        response.resume();
        return reject(new Error(`The link returned HTTP ${statusCode}.`));
      }
      const declared = Number(response.headers['content-length'] || 0);
      if (declared > MAX_BYTES) {
        response.destroy();
        return reject(new Error(`Image is larger than ${MAX_BYTES / 1024 / 1024}MB.`));
      }
      const chunks = [];
      let total = 0;
      response.on('data', chunk => {
        total += chunk.length;
        if (total > MAX_BYTES) {
          response.destroy();
          reject(new Error(`Image is larger than ${MAX_BYTES / 1024 / 1024}MB.`));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), finalUrl: url.toString() }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('The download timed out.')));
    request.on('error', error => reject(new Error(error.message || 'Download failed.')));
  });
}

// Download a remote image and confirm it really is an allowed image type.
async function fetchRemoteImage(urlString) {
  const { buffer, finalUrl } = await download(String(urlString || '').trim());
  const type = detectImageType(buffer);
  if (!type) throw new Error('The link did not return a JPG, PNG, WebP or AVIF image.');
  return { buffer, type, mime: MIME[type], finalUrl };
}

module.exports = { MAX_BYTES, ALLOWED_TYPES, MIME, detectImageType, isPrivateAddress, fetchRemoteImage };
