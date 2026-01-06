import { Request, Response } from "express";
import { R2Service } from "../services/r2.service";
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
  private r2Service: R2Service;

  constructor() {
    this.r2Service = new R2Service();
  }

  // Middleware getter
  get uploadMiddleware() {
    return upload.single("file");
  }

  get uploadMiddlewareMultiple() {
      return upload.array("files", 10); // Max 10 files at once
  }

  // Generic upload (legacy support or non-venue specific)
  uploadImage = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const imageUrl = await this.r2Service.uploadImage({
        file: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype
      });

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
          this.r2Service.uploadImage({
            file: file.buffer,
            fileName: file.originalname,
            contentType: file.mimetype
          })
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

  // New method for Venue specific uploads
  uploadVenueImage = async (req: Request, res: Response) => {
    try {
      const { venueId } = req.params;
      const { isLogo } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const file = req.file;
      const imageUrl = await this.r2Service.uploadImage({
        venueId,
        file: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
        isLogo: isLogo === 'true',
      });

      return res.status(200).json({
        success: true,
        url: imageUrl,
      });
    } catch (error) {
       console.error("Venue Upload error:", error);
       return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to upload venue image",
      });
    }
  }
}
