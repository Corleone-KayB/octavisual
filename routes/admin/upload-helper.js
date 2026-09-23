const media = require('../../lib/media');

// Sends a validated in-memory upload to Cloudinary.
// Returns { url, publicId, width, height } or throws an Error with a
// message that can be shown to the admin.
async function storeImage(file, folder) {
  if (!media.isConfigured()) {
    throw new Error('Image storage (Cloudinary) is not configured, so images cannot be uploaded yet.');
  }
  try {
    const result = await media.uploadBuffer(file.buffer, { folder });
    return { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height };
  } catch (error) {
    console.error('Cloudinary upload failed:', error.message);
    if (/signature|api_secret|api key|401/i.test(error.message)) {
      throw new Error('Cloudinary rejected the credentials. Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the server.');
    }
    throw new Error('The image could not be stored in Cloudinary. Please try again.');
  }
}

module.exports = { storeImage };
