// Helpers exposed to every EJS view through app.locals.

// Returns the URL if it is safe to put in an href/src (http(s), mailto, tel,
// or a same-site path), otherwise an empty string. Blocks javascript:, data:
// and protocol-relative URLs entered through the admin.
function safeUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (url.startsWith('#')) return url;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? url : '';
  } catch {
    return '';
  }
}

module.exports = { safeUrl };
