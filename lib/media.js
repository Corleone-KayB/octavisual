// Cloudinary storage + delivery helpers.
// Uploads always go from memory/disk straight to Cloudinary: nothing is
// written to the server's filesystem (Render's disk is ephemeral).
const cloudinary = require('cloudinary').v2;

const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const DEFAULT_WIDTHS = [480, 800, 1200, 1600, 2200];

function isConfigured() {
  return configured;
}

function folderPath(sub) {
  const root = (process.env.CLOUDINARY_FOLDER || 'octavisual').replace(/^\/+|\/+$/g, '');
  return sub ? `${root}/${sub}` : root;
}

function describeError(error) {
  return error?.error?.message || error?.message || 'Unknown Cloudinary error';
}

function assertConfigured() {
  if (!configured) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
  }
}

function uploadBuffer(buffer, { folder, publicId } = {}) {
  assertConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: folderPath(folder),
      public_id: publicId,
      resource_type: 'image',
      overwrite: false,
      unique_filename: !publicId
    }, (error, result) => (error ? reject(new Error(describeError(error))) : resolve(result)));
    stream.end(buffer);
  });
}

async function uploadFile(filePath, { folder, publicId } = {}) {
  assertConfigured();
  try {
    return await cloudinary.uploader.upload(filePath, {
      folder: folderPath(folder),
      public_id: publicId,
      resource_type: 'image',
      overwrite: false,
      unique_filename: false
    });
  } catch (error) {
    throw new Error(describeError(error));
  }
}

async function destroy(publicId) {
  if (!configured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.warn(`Cloudinary delete failed for ${publicId}: ${describeError(error)}`);
  }
}

function isCloudinaryUrl(url) {
  return typeof url === 'string' && /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url);
}

// Insert a transformation right after /upload/ in a Cloudinary delivery URL.
function transform(url, transformation) {
  if (!isCloudinaryUrl(url)) return url;
  return url.replace('/image/upload/', `/image/upload/${transformation}/`);
}

function sized(url, width) {
  return transform(url, `f_auto,q_auto,c_limit,w_${width}`);
}

// Returns { src, srcset } for an <img>. Local paths are returned untouched.
function responsive(url, { widths = DEFAULT_WIDTHS, fallbackWidth = 1200 } = {}) {
  if (!url) return { src: '', srcset: '' };
  if (!isCloudinaryUrl(url)) return { src: url, srcset: '' };
  return {
    src: sized(url, fallbackWidth),
    srcset: widths.map(width => `${sized(url, width)} ${width}w`).join(', ')
  };
}

module.exports = {
  cloudinary,
  isConfigured,
  folderPath,
  uploadBuffer,
  uploadFile,
  destroy,
  isCloudinaryUrl,
  transform,
  sized,
  responsive
};
