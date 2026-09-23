// Editable copy fields for each section type. Drives both the admin form
// (views/admin/partials/section-fields.ejs) and server-side validation.
// kind: 'text' (single line), 'textarea' (free text), 'lines' (one item per line)
const validate = require('./validate');

const FIELDS = {
  hero: [
    { name: 'kicker', label: 'Top-left label', kind: 'text', max: 60 },
    { name: 'stamp', label: 'Top-right label', kind: 'text', max: 60 },
    { name: 'headline', label: 'Headline', kind: 'text', max: 80, required: true },
    { name: 'headlineEmphasis', label: 'Headline (italic accent line)', kind: 'text', max: 80 },
    { name: 'lede', label: 'Intro sentence', kind: 'textarea', max: 300 },
    { name: 'ctaLabel', label: 'Button label', kind: 'text', max: 40 },
    { name: 'cue', label: 'Page-turn cue', kind: 'text', max: 40 }
  ],
  about: [
    { name: 'meta', label: 'Header meta', kind: 'text', max: 80 },
    { name: 'introLines', label: 'Intro statement (one line per row)', kind: 'lines', max: 600, maxLines: 4 },
    { name: 'emotionalLines', label: 'Accent statement in serif italic (one line per row)', kind: 'lines', max: 600, maxLines: 4 },
    { name: 'imageAlt', label: 'Background image alt text', kind: 'text', max: 300 },
    { name: 'footnoteLeft', label: 'Footnote left', kind: 'text', max: 80 },
    { name: 'footnoteRight', label: 'Footnote right', kind: 'text', max: 80 }
  ],
  work: [
    { name: 'intro', label: 'Intro sentence', kind: 'textarea', max: 200 }
  ],
  team: [
    { name: 'meta', label: 'Header meta', kind: 'text', max: 80 },
    { name: 'kicker', label: 'Stage kicker', kind: 'text', max: 40 },
    { name: 'titleStrong', label: 'Stage title (bold)', kind: 'text', max: 30 },
    { name: 'titleEmphasis', label: 'Stage title (italic)', kind: 'text', max: 30 },
    { name: 'footerLeft', label: 'Footer left', kind: 'text', max: 80 },
    { name: 'footerRight', label: 'Footer right', kind: 'text', max: 80 },
    { name: 'emptyLinks', label: 'Profile text when no links', kind: 'text', max: 80 }
  ],
  contact: [
    { name: 'meta', label: 'Availability note', kind: 'text', max: 80 },
    { name: 'statement', label: 'Statement', kind: 'text', max: 80 },
    { name: 'statementEmphasis', label: 'Statement (italic accent line)', kind: 'text', max: 80 }
  ],
  text: [
    { name: 'meta', label: 'Header meta', kind: 'text', max: 80 },
    { name: 'statement', label: 'Statement', kind: 'text', max: 120 },
    { name: 'statementEmphasis', label: 'Statement (italic accent line)', kind: 'text', max: 120 },
    { name: 'body', label: 'Body (blank line between paragraphs)', kind: 'textarea', max: 4000 }
  ]
};

function fieldsFor(type) {
  return FIELDS[type] || [];
}

// Returns a cleaned copy of the fields for `type`, preserving keys that are
// not edited through this form (e.g. the About image URL).
function parseFields(type, body, existing = {}, errors = []) {
  const fields = { ...existing };
  for (const field of fieldsFor(type)) {
    const options = { label: field.label, max: field.max, required: field.required, maxLines: field.maxLines };
    fields[field.name] = field.kind === 'lines'
      ? validate.lines(body, `fields_${field.name}`, options, errors)
      : validate.text(body, `fields_${field.name}`, options, errors);
  }
  return fields;
}

function displayValue(field, value) {
  if (field.kind === 'lines') return (Array.isArray(value) ? value : []).join('\n');
  return value ?? '';
}

module.exports = { FIELDS, fieldsFor, parseFields, displayValue };
