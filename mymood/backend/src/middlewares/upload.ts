import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Resolve to an absolute path relative to the backend root (where package.json lives)
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Auto-create the uploads directory on startup if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    // Double-check at request time in case the folder was deleted while running
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    // Unique filename: timestamp + random hex + original extension
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, name);
  },
});

export const upload = multer({ storage });
