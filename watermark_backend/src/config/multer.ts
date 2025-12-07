import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB

// Ensure upload directories exist
const dirs = ['images', 'logos', 'processed'];
dirs.forEach((dir) => {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Storage configuration for images
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(UPLOAD_DIR, 'images'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// Storage configuration for logos
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(UPLOAD_DIR, 'logos'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter for images
const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG and PNG files are allowed'));
  }
};

// Multer instances
export const uploadImages = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export const UPLOAD_PATHS = {
  images: path.join(UPLOAD_DIR, 'images'),
  logos: path.join(UPLOAD_DIR, 'logos'),
  processed: path.join(UPLOAD_DIR, 'processed'),
};
