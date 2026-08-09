const FormData = require('form-data');
const { wa, WABA } = require('./waClient');
const { supabase } = require('../../config/database');
const { CDN_LOCAL_PATH, CDN_BASE_URL } = require('../../config/secrets');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const ALLOWED = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/3gpp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/amr', 'audio/mp4'],
  sticker: ['image/webp'],
};

function kindOf(mime) {
  return Object.keys(ALLOWED).find((k) => ALLOWED[k].includes(mime)) || null;
}

/**
 * Upload media to local CDN and WhatsApp, then save to DB.
 * 
 * @param {Object} file - The file object from Multer (req.file)
 * @param {Number} userId - ID of the admin uploading
 * @returns {Object} Saved media record
 */
async function uploadMedia(file, userId = null) {
  const kind = kindOf(file.mimetype);
  if (!kind) {
    throw new Error(`Unsupported mime type: ${file.mimetype}`);
  }

  // 1. Save to local CDN folder
  const ext = file.originalname.split('.').pop();
  const filename = `${crypto.randomUUID()}.${ext}`;
  
  // Ensure whatsapp folder exists in CDN
  const waDir = path.join(CDN_LOCAL_PATH, 'whatsapp');
  await fs.mkdir(waDir, { recursive: true });
  
  const destPath = path.join(waDir, filename);
  await fs.writeFile(destPath, file.buffer);
  
  const publicUrl = `${CDN_BASE_URL}/whatsapp/${filename}`;

  // 2. Upload to WhatsApp Cloud API via MultiChannel
  const form = new FormData();
  form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
  form.append('messaging_product', 'whatsapp');
  form.append('type', file.mimetype);

  const { data: waData } = await wa.post(`/whatsapp/${WABA}/media`, form, {
    headers: form.getHeaders()
  });
  
  const mediaId = waData.id;

  // 3. Save to Database
  const { data: dbData, error: dbError } = await supabase
    .from('wa_media')
    .insert([{
      file_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      kind: kind,
      media_id: mediaId,
      public_url: publicUrl,
      uploaded_by: userId
    }])
    .select()
    .single();

  if (dbError) {
    throw new Error(`Failed to save media record to DB: ${dbError.message}`);
  }

  return dbData;
}

/**
 * Fetch media records with pagination
 */
async function getMediaList(page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  const { data, error, count } = await supabase
    .from('wa_media')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) throw error;
  
  return {
    data,
    total: count,
    page,
    limit
  };
}

module.exports = {
  uploadMedia,
  getMediaList,
  kindOf
};
