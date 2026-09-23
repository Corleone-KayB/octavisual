// Small server-side validation helpers for admin forms. Each helper returns a
// cleaned value and pushes a message into `errors` when the input is invalid.
const { safeUrl } = require('./view-helpers');

function text(body, name, { label = name, max = 200, required = false } = {}, errors = []) {
  const value = String(body?.[name] ?? '').replace(/\r\n/g, '\n').trim();
  if (required && !value) errors.push(`${label} is required.`);
  if (value.length > max) errors.push(`${label} must be ${max} characters or fewer.`);
  return value.slice(0, max);
}

function lines(body, name, options = {}, errors = []) {
  const { maxLines = 20 } = options;
  return text(body, name, { max: 4000, ...options }, errors)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

function url(body, name, { label = name, required = false, allowRelative = false } = {}, errors = []) {
  const value = String(body?.[name] ?? '').trim();
  if (!value) {
    if (required) errors.push(`${label} is required.`);
    return '';
  }
  const safe = safeUrl(value);
  const isRelative = value.startsWith('/') && !value.startsWith('//');
  if (!safe || safe.startsWith('#') || (isRelative && !allowRelative) || /^(mailto|tel):/i.test(safe)) {
    errors.push(`${label} must be a full http(s) link${allowRelative ? ' or a /path on this site' : ''}.`);
    return '';
  }
  return value.slice(0, 500);
}

function email(body, name, { label = name, required = false } = {}, errors = []) {
  const value = String(body?.[name] ?? '').trim().toLowerCase();
  if (!value) {
    if (required) errors.push(`${label} is required.`);
    return '';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 200) errors.push(`${label} must be a valid email address.`);
  return value;
}

function bool(body, name) {
  const value = body?.[name];
  const last = Array.isArray(value) ? value[value.length - 1] : value;
  return last === 'on' || last === 'true' || last === '1' || last === true;
}

function year(body, name, errors = []) {
  const value = String(body?.[name] ?? '').trim();
  if (value && !/^(19|20)\d{2}$/.test(value)) errors.push('Year must be four digits, e.g. 2026.');
  return value;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Tags arrive as a comma-separated string (or repeated fields).
function tags(body, name = 'tags') {
  const raw = Array.isArray(body?.[name]) ? body[name].join(',') : String(body?.[name] ?? '');
  const seen = new Set();
  return raw.split(',')
    .map(tag => tag.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 40))
    .filter(tag => tag && !seen.has(tag) && seen.add(tag))
    .slice(0, 30);
}

function ids(body, name) {
  const raw = body?.[name];
  const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  return list.map(String).filter(id => /^[a-f0-9]{24}$/i.test(id));
}

module.exports = { text, lines, url, email, bool, year, slugify, tags, ids };
