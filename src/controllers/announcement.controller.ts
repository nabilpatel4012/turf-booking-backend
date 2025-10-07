import { Response } from "express";
import { AnnouncementService } from "../services/announcement.service";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  CreateAnnouncementDto,
  GetAnnouncementsQueryDto,
  UpdateAnnouncementDto,
} from "../dtos/announcement.dto";

export class AnnouncementController {
  private announcementService: AnnouncementService;

  constructor() {
    this.announcementService = new AnnouncementService();
  }

  // IMPROVED: Handles query parameters for filtering
  getAnnouncements = async (req: AuthRequest, res: Response) => {
    try {
      // Assuming query parameters are parsed into a DTO
      const query: GetAnnouncementsQueryDto = req.query;
      const announcements = await this.announcementService.getAllAnnouncements(
        query
      );
      res.status(200).json(announcements);
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve announcements",
        error: error.message,
      });
    }
  };

  // NEW: Handles getting a single announcement
  getOneAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const announcement = await this.announcementService.getAnnouncementById(
        id
      );
      res.status(200).json(announcement);
    } catch (error: any) {
      // Check for specific error message to return 404
      if (error.message === "Announcement not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Failed to retrieve announcement",
        error: error.message,
      });
    }
  };

  // IMPROVED: Uses the full DTO from the request body
  createAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
      // Validate req.body with a library like class-validator before this step
      const createDto: CreateAnnouncementDto = req.body;
      const announcement = await this.announcementService.createAnnouncement(
        createDto
      );
      res.status(201).json(announcement);
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to create announcement",
        error: error.message,
      });
    }
  };

  // NEW: Handles updating an announcement
  updateAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateDto: UpdateAnnouncementDto = req.body;
      const updatedAnnouncement =
        await this.announcementService.updateAnnouncement(id, updateDto);
      res.status(200).json(updatedAnnouncement);
    } catch (error: any) {
      if (error.message === "Announcement not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Failed to update announcement",
        error: error.message,
      });
    }
  };

  // IMPROVED: Better error handling and status code
  deleteAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.announcementService.deleteAnnouncement(id);
      res.status(204).send(); // 204 No Content is standard for successful deletion
    } catch (error: any) {
      if (error.message === "Announcement not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Failed to delete announcement",
        error: error.message,
      });
    }
  };
}
