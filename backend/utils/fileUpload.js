const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

/**
 * Save a Base64 image/document string as a physical file or upload to Cloudinary.
 * @param {string} base64Str - The Base64 string (including data URI prefix)
 * @param {string} subFolder - The subfolder name (e.g. 'profile', 'screenshots', 'documents')
 * @param {string} prefix - The filename prefix
 * @returns {Promise<string|null>} The relative URL path or Cloudinary URL of the saved file
 */
const saveBase64Image = async (base64Str, subFolder, prefix) => {
  try {
    if (!base64Str) return null;
    
    // If it's already a relative path, return it as is
    if (base64Str.startsWith('/uploads/')) {
      return base64Str;
    }
    
    // Check if it's already a URL
    if (base64Str.startsWith('http://') || base64Str.startsWith('https://')) {
      return base64Str;
    }
    
    if (!base64Str.startsWith('data:')) {
      return null;
    }
    
    // Attempt Cloudinary upload first with a strict 8s timeout to avoid hanging requests
    try {
      if (process.env.CLOUDINARY_URL) {
        const cloudinaryPromise = cloudinary.uploader.upload(base64Str, {
          folder: `hrm/${subFolder}`,
          resource_type: 'auto'
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cloudinary upload timed out after 8s')), 8000)
        );
        const uploadRes = await Promise.race([cloudinaryPromise, timeoutPromise]);
        return uploadRes.secure_url;
      }
    } catch (cloudErr) {
      console.warn('Cloudinary upload skipped or timed out, falling back to local storage:', cloudErr.message || cloudErr);
    }
    
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    
    const mimeType = matches[1];
    const dataBuffer = Buffer.from(matches[2], 'base64');
    
    // Determine extension
    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('pdf')) ext = 'pdf';
    
    const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
    const destDir = path.join(__dirname, '../uploads', subFolder);
    
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    const filePath = path.join(destDir, filename);
    fs.writeFileSync(filePath, dataBuffer);
    
    return `/uploads/${subFolder}/${filename}`;
  } catch (err) {
    console.error('Error saving base64 image:', err);
    return null;
  }
};

module.exports = { saveBase64Image };
