import path from "path";
import fs from "fs/promises";
import { Router } from "express";
import {
  upload,
  processImageToWebP,
  deleteImage,
  getImageUrl,
} from "../config/imageUpload.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const adminOnly = [requireAuth, requireAdmin];

async function toWebP(file, quality = 80) {
  const outputFilename = `${path.parse(file.filename).name}.webp`;
  const processedPath = await processImageToWebP(file.path, outputFilename, {
    quality,
    width: 1200,
    height: 1200,
  });
  const { size } = await fs.stat(processedPath);
  return { filename: outputFilename, size };
}

// POST /upload/image - Upload and convert to WebP
router.post("/image", ...adminOnly, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const { filename, size } = await toWebP(req.file);

    res.status(201).json({
      success: true,
      filename,
      url: getImageUrl(filename),
      originalName: req.file.originalname,
      size,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Image processing failed" });
  }
});

// POST /upload/images - Multiple images
router.post("/images", ...adminOnly, upload.array("images", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files provided" });
    }

    // Sequential on purpose: running every sharp pipeline at once multiplied
    // memory use by the file count.
    const results = [];
    const written = [];
    try {
      for (const file of req.files) {
        const { filename, size } = await toWebP(file);
        written.push(filename);
        results.push({
          filename,
          url: getImageUrl(filename),
          originalName: file.originalname,
          size,
        });
      }
    } catch (err) {
      // Do not leave half-converted files behind.
      await Promise.all(written.map((name) => deleteImage(name).catch(() => {})));
      throw err;
    }

    res.status(201).json({ success: true, images: results });
  } catch (err) {
    console.error("Multi-upload error:", err);
    res.status(500).json({ error: "Image processing failed" });
  }
});

// DELETE /upload/image/:filename - Delete processed image
router.delete("/image/:filename", ...adminOnly, async (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "");

    if (!safeFilename.endsWith(".webp")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const deleted = await deleteImage(safeFilename);
    if (!deleted) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
