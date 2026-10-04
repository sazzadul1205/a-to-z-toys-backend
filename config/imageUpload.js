import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const TEMP_DIR = path.join(UPLOAD_DIR, "temp");
const PROCESSED_DIR = path.join(UPLOAD_DIR, "processed");

let dirsInitialized = false;

async function ensureDirs() {
  if (dirsInitialized) return;
  await fs.mkdir(TEMP_DIR, { recursive: true });
  await fs.mkdir(PROCESSED_DIR, { recursive: true });
  dirsInitialized = true;
}

// Multer config - store in temp first
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureDirs();
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, WebP, GIF, AVIF allowed."), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Caps decoded pixels so a small, highly compressed file cannot force a huge
// allocation. 25 MP is far above any real product photo.
const MAX_INPUT_PIXELS = 25_000_000;

export async function processImageToWebP(inputPath, outputFilename, options = {}) {
  const {
    quality = 80,
    width = 1200,
    height = 1200,
    fit = "inside",
  } = options;

  await ensureDirs();

  const outputPath = path.join(PROCESSED_DIR, outputFilename);

  try {
    await sharp(inputPath, { limitInputPixels: MAX_INPUT_PIXELS })
      .resize(width, height, { fit, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toFile(outputPath);
  } finally {
    // Always clear the upload, even when sharp rejects the file, so a bad
    // upload cannot fill uploads/temp.
    try {
      await fs.unlink(inputPath);
    } catch {
      // Already gone or never created.
    }
  }

  return outputPath;
}

export async function deleteImage(filename) {
  await ensureDirs();
  const filePath = path.join(PROCESSED_DIR, filename);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    return false;
  }
}

export function getImageUrl(filename) {
  return `/uploads/${filename}`;
}

export function getImagePath(filename) {
  return path.join(PROCESSED_DIR, filename);
}