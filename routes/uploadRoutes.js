import { Router } from "express";
import { upload, processImageToWebP, deleteImage, getImageUrl } from "../config/imageUpload.js";

const router = Router();

// POST /upload/image - Upload and convert to WebP
router.post("/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const outputFilename = `${path.parse(req.file.filename).name}.webp`;
    const processedPath = await processImageToWebP(req.file.path, outputFilename, {
      quality: 80,
      width: 1200,
      height: 1200,
    });

    const imageUrl = getImageUrl(outputFilename);

    res.status(201).json({
      success: true,
      filename: outputFilename,
      url: imageUrl,
      originalName: req.file.originalname,
      size: (await import("fs/promises")).then(fs => fs.stat(processedPath)).then(stat => stat.size),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Image processing failed" });
  }
});

// POST /upload/images - Multiple images
router.post("/images", upload.array("images", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files provided" });
    }

    const results = await Promise.all(
      req.files.map(async (file) => {
        const outputFilename = `${path.parse(file.filename).name}.webp`;
        await processImageToWebP(file.path, outputFilename, {
          quality: 80,
          width: 1200,
          height: 1200,
        });
        return {
          filename: outputFilename,
          url: getImageUrl(outputFilename),
          originalName: file.originalname,
        };
      })
    );

    res.status(201).json({ success: true, images: results });
  } catch (err) {
    console.error("Multi-upload error:", err);
    res.status(500).json({ error: "Image processing failed" });
  }
});

// DELETE /upload/image/:filename - Delete processed image
router.delete("/image/:filename", async (req, res) => {
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

import path from "path";

export default router;