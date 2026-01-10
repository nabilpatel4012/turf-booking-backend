import { Response } from "express";
import { AnnouncementService } from "../services/announcement.service";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  CreateAnnouncementDto,
  GetAnnouncementsQueryDto,
  UpdateAnnouncementDto,
} from "../dtos/announcement.dto";
import { AppError } from "../middleware/error.middleware";

export class AnnouncementController {
  private announcementService: AnnouncementService;

  constructor() {
    this.announcementService = new AnnouncementService();
  }

  // Get announcements - filters by admin's turfs when authenticated admin
  getAnnouncements = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id; // Will be available if authenticated admin
    const query: GetAnnouncementsQueryDto = req.query;
    
    const announcements = await this.announcementService.getAllAnnouncements(
      query,
      adminId // Pass adminId for ownership filtering
    );
    
    res.status(200).json({
      success: true,
      data: announcements,
    });
  };

  // Get single announcement
  getOneAnnouncement = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user?.id;
    
    const announcement = await this.announcementService.getAnnouncementById(
      id,
      adminId
    );
    
    res.status(200).json({
      success: true,
      data: announcement,
    });
  };

  // Create announcement - requires admin authentication
  createAnnouncement = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    
    if (!adminId) {
      throw new AppError("Unauthorized", 401);
    }

    const createDto: CreateAnnouncementDto = req.body;
    const announcement = await this.announcementService.createAnnouncement(
      createDto,
      adminId
    );
    
    res.status(201).json({
      success: true,
      data: announcement,
    });
  };

  // Update announcement - requires ownership verification
  updateAnnouncement = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user?.id;
    
    if (!adminId) {
      throw new AppError("Unauthorized", 401);
    }

    const updateDto: UpdateAnnouncementDto = req.body;
    const updatedAnnouncement = await this.announcementService.updateAnnouncement(
      id,
      updateDto,
      adminId
    );
    
    res.status(200).json({
      success: true,
      data: updatedAnnouncement,
    });
  };

  // Delete announcement - requires ownership verification
  deleteAnnouncement = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user?.id;
    
    if (!adminId) {
      throw new AppError("Unauthorized", 401);
    }

    await this.announcementService.deleteAnnouncement(id, adminId);
    
    res.status(204).send();
  };
}
