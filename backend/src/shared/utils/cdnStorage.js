'use strict';
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const secrets = require('../../config/secrets');

/**
 * CDN storage engine for multer.
 * Writes files to: CDN_BASE_DIR/loans/<application_no>/<party>/<doc_type>/<uuid>.<ext>
 * Stores only the relative path in DB: loans/<application_no>/<party>/<doc_type>/<uuid>.<ext>
 */
const cdnStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // req.cdnSubDir must be set by the route before multer runs:
    //   req.cdnSubDir = `loans/${applicationNo}/${party}/${docType}`
    const dir = path.join(secrets.cdn.baseDir, req.cdnSubDir ?? 'uploads/misc');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Only JPEG, PNG, HEIC, and PDF files are accepted');
    err.code = 'VALIDATION_ERROR';
    err.status = 422;
    cb(err);
  }
}

/** Multer upload instance — single file field named "file" */
const upload = multer({
  storage: cdnStorage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

/**
 * getCdnRelativePath — returns the DB-stored relative path from a multer file object.
 * @param {Express.Multer.File} file
 * @param {string} subDir - the req.cdnSubDir value used during upload
 * @returns {string} e.g. "loans/SF-2026-00001/applicant/aadhaar/abc.pdf"
 */
function getCdnRelativePath(file, subDir) {
  return `${subDir}/${file.filename}`;
}

/**
 * getCdnUrl — returns the public URL for a stored cdn_path.
 * @param {string} cdnPath - value stored in documents.cdn_path
 * @returns {string}
 */
function getCdnUrl(cdnPath) {
  return `${secrets.cdn.baseUrl}/${cdnPath}`;
}

module.exports = { upload, getCdnRelativePath, getCdnUrl };
