import { Repository } from "typeorm";
import { Announcement } from "../entities/announcement.entity";
import { AppDataSource } from "../db/data.source";

export class AnnouncementService {
  private announcementRepository: Repository<Announcement>;

  constructor() {
    this.announcementRepository = AppDataSource.getRepository(Announcement);
  }

  async createAnnouncement(title: string, message: string) {
    const announcement = this.announcementRepository.create({ title, message });
    return await this.announcementRepository.save(announcement);
  }

  async getAllAnnouncements() {
    return await this.announcementRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async deleteAnnouncement(id: string) {
    const result = await this.announcementRepository.delete(id);

    if (result.affected === 0) {
      throw new Error("Announcement not found");
    }

    return { message: "Announcement deleted successfully" };
  }
}
