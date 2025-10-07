import { Repository } from "typeorm";
import { Announcement } from "../entities/announcement.entity";
import { AppDataSource } from "../db/data.source";
import {
  CreateAnnouncementDto,
  GetAnnouncementsQueryDto,
  UpdateAnnouncementDto,
} from "../dtos/announcement.dto";

export class AnnouncementService {
  private announcementRepository: Repository<Announcement>;

  constructor() {
    this.announcementRepository = AppDataSource.getRepository(Announcement);
  }

  // IMPROVED: Uses a DTO for cleaner, more scalable data handling
  async createAnnouncement(data: CreateAnnouncementDto): Promise<Announcement> {
    const announcement = this.announcementRepository.create(data);
    return this.announcementRepository.save(announcement);
  }

  // IMPROVED: Now supports filtering via a query DTO
  async getAllAnnouncements(
    query: GetAnnouncementsQueryDto
  ): Promise<Announcement[]> {
    const { turfId, isActive } = query;
    const whereClause: { [key: string]: any } = {};

    if (turfId) {
      whereClause.turfId = turfId;
    }
    // TypeORM can handle `undefined` for booleans, but checking explicitly is safer
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    return this.announcementRepository.find({
      where: whereClause,
      order: { createdAt: "DESC" },
      relations: ["turf"], // Optionally load the related turf info
    });
  }

  // NEW: Added method to get a single announcement by its ID
  async getAnnouncementById(id: string): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
      relations: ["turf"],
    });

    if (!announcement) {
      throw new Error("Announcement not found");
    }
    return announcement;
  }

  // NEW: Added method to update an existing announcement
  async updateAnnouncement(
    id: string,
    data: UpdateAnnouncementDto
  ): Promise<Announcement> {
    // 'preload' finds the entity and merges new data onto it.
    // This is safer than a blind update as it ensures the entity exists first.
    const announcement = await this.announcementRepository.preload({
      id,
      ...data,
    });

    if (!announcement) {
      throw new Error("Announcement not found");
    }
    return this.announcementRepository.save(announcement);
  }

  async deleteAnnouncement(id: string): Promise<{ message: string }> {
    const result = await this.announcementRepository.delete(id);

    if (result.affected === 0) {
      throw new Error("Announcement not found");
    }

    return { message: "Announcement deleted successfully" };
  }
}
