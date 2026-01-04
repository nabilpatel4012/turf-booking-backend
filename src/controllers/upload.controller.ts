import { Request, Response } from "express";
import { CloudflareService } from "../services/cloudflare.service";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

export class UploadController {
  private cloudflareService: CloudflareService;

  constructor() {
    this.cloudflareService = new CloudflareService();
  }

  // Middleware getter
  get uploadMiddleware() {
    return upload.single("file");
  }

  get uploadMiddlewareMultiple() {
      return upload.array("files", 10); // Max 10 files at once
  }

  uploadImage = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const imageUrl = await this.cloudflareService.uploadImage(
        file.buffer,
        file.originalname
      );

      return res.status(200).json({
        success: true,
        url: imageUrl,
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to upload image",
      });
    }
  };
  
    uploadMultipleImages = async (req: Request, res: Response) => {
    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const files = req.files as Express.Multer.File[];
      const uploadPromises = files.map(file => 
          this.cloudflareService.uploadImage(file.buffer, file.originalname)
      );

      const imageUrls = await Promise.all(uploadPromises);

      return res.status(200).json({
        success: true,
        urls: imageUrls,
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to upload images",
      });
    }
  };
}
