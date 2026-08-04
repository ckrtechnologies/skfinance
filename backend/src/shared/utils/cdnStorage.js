'use strict';
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const { CDN_BASE_URL, CDN_LOCAL_PATH } = require('../../config/secrets');

/**
 * saveToCdn — writes an uploaded file buffer to the CDN directory.
 * Returns { cdn_path, cdn_url } for storage in the DB.
 *
 * @param {object} file   multer file object (buffer, originalname, mimetype)
 * @param {string} applicationNo  e.g. 'SF-2026-00001'
 * @param {string} party   applicant | co_applicant | guarantor
 * @param {string} docType e.g. 'aadhaar'
 */
function saveToCdn(file, applicationNo, party, docType) {
  const ext        = path.extname(file.originalname) || '.bin';
  const filename   = `${uuidv4()}${ext}`;
  const relDir     = path.join('loans', applicationNo, party, docType);
  const absDir     = path.join(CDN_LOCAL_PATH, relDir);
  const cdnPath    = path.join(relDir, filename).replace(/\\/g, '/');
  const cdnUrl     = `${CDN_BASE_URL}/${cdnPath}`;

  fs.mkdirSync(absDir, { recursive: true });
  fs.writeFileSync(path.join(absDir, filename), file.buffer);

  return { cdn_path: cdnPath, cdn_url: cdnUrl };
}

module.exports = { saveToCdn };
