import { Response } from "express";
import { AnnouncementService } from "../services/announcement.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class AnnouncementController {
  private announcementService: AnnouncementService;

  constructor() {
    this.announcementService = new AnnouncementService();
  }

  getAnnouncements = async (req: AuthRequest, res: Response) => {
    const announcements = await this.announcementService.getAllAnnouncements();
    res.json(announcements);
  };

  createAnnouncement = async (req: AuthRequest, res: Response) => {
    const { title, message } = req.body;
    const announcement = await this.announcementService.createAnnouncement(
      title,
      message
    );
    res.status(201).json(announcement);
  };

  deleteAnnouncement = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (id) {
      const result = await this.announcementService.deleteAnnouncement(id);
      res.json(result);
    }
  };
}
