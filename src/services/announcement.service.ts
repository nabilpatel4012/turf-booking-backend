import { Repository, In } from "typeorm";
import { Announcement } from "../entities/announcement.entity";
import { Turf } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import {
  CreateAnnouncementDto,
  GetAnnouncementsQueryDto,
  UpdateAnnouncementDto,
} from "../dtos/announcement.dto";
import { AppError } from "../middleware/error.middleware";
import { ErrorCode, ErrorMessages, ErrorStatusCodes } from "../utils/error-codes";

export class AnnouncementService {
  private announcementRepository: Repository<Announcement>;
  private turfRepository: Repository<Turf>;

  constructor() {
    this.announcementRepository = AppDataSource.getRepository(Announcement);
    this.turfRepository = AppDataSource.getRepository(Turf);
  }

  /**
   * Get turf IDs owned by an admin
   */
  private async getAdminTurfIds(adminId: string): Promise<string[]> {
    const turfs = await this.turfRepository.find({
      where: { ownerId: adminId },
      select: ["id"],
    });
    return turfs.map(t => t.id);
  }

  /**
   * Verify admin owns the turf
   */
  private async verifyTurfOwnership(adminId: string, turfId: string): Promise<void> {
    const turf = await this.turfRepository.findOne({
      where: { id: turfId, ownerId: adminId },
    });
    if (!turf) {
      throw new AppError("You don't have permission to manage this turf's announcements", 403, ErrorCode.AUTH_UNAUTHORIZED);
    }
  }

  // Create announcement - with ownership verification
  async createAnnouncement(data: CreateAnnouncementDto, adminId: string): Promise<Announcement> {
    // Verify admin owns the turf (if turfId is provided)
    if (data.turfId) {
      await this.verifyTurfOwnership(adminId, data.turfId);
    }
    
    const announcement = this.announcementRepository.create(data);
    return this.announcementRepository.save(announcement);
  }

  // Get all announcements - filtered by admin's turfs
  async getAllAnnouncements(
    query: GetAnnouncementsQueryDto,
    adminId?: string
  ): Promise<Announcement[]> {
    const { turfId, isActive } = query;
    
    const queryBuilder = this.announcementRepository
      .createQueryBuilder("announcement")
      .leftJoinAndSelect("announcement.turf", "turf")
      .orderBy("announcement.createdAt", "DESC");

    // If adminId is provided, filter by admin's turfs
    if (adminId) {
      const adminTurfIds = await this.getAdminTurfIds(adminId);
      if (adminTurfIds.length === 0) {
        return []; // Admin has no turfs, return empty
      }
      queryBuilder.andWhere("announcement.turfId IN (:...adminTurfIds)", { adminTurfIds });
    }

    if (turfId) {
      queryBuilder.andWhere("announcement.turfId = :turfId", { turfId });
    }
    
    if (isActive !== undefined) {
      queryBuilder.andWhere("announcement.isActive = :isActive", { isActive });
    }

    return queryBuilder.getMany();
  }

  // Get announcement by ID - with ownership verification
  async getAnnouncementById(id: string, adminId?: string): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
      relations: ["turf"],
    });

    if (!announcement) {
      throw new AppError(ErrorMessages[ErrorCode.NOT_ANNOUNCEMENT], ErrorStatusCodes[ErrorCode.NOT_ANNOUNCEMENT], ErrorCode.NOT_ANNOUNCEMENT);
    }

    // If adminId provided, verify ownership
    if (adminId && announcement.turfId) {
      await this.verifyTurfOwnership(adminId, announcement.turfId);
    }

    return announcement;
  }

  // Update announcement - with ownership verification
  async updateAnnouncement(
    id: string,
    data: UpdateAnnouncementDto,
    adminId: string
  ): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
    });

    if (!announcement) {
      throw new AppError(ErrorMessages[ErrorCode.NOT_ANNOUNCEMENT], ErrorStatusCodes[ErrorCode.NOT_ANNOUNCEMENT], ErrorCode.NOT_ANNOUNCEMENT);
    }

    // Verify admin owns the turf this announcement belongs to
    if (announcement.turfId) {
      await this.verifyTurfOwnership(adminId, announcement.turfId);
    }

    // If changing turfId, verify ownership of new turf too
    if (data.turfId && data.turfId !== announcement.turfId) {
      await this.verifyTurfOwnership(adminId, data.turfId);
    }

    const updated = await this.announcementRepository.preload({
      id,
      ...data,
    });

    if (!updated) {
      throw new AppError(ErrorMessages[ErrorCode.NOT_ANNOUNCEMENT], ErrorStatusCodes[ErrorCode.NOT_ANNOUNCEMENT], ErrorCode.NOT_ANNOUNCEMENT);
    }

    return this.announcementRepository.save(updated);
  }

  // Delete announcement - with ownership verification
  async deleteAnnouncement(id: string, adminId: string): Promise<{ message: string }> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
    });

    if (!announcement) {
      throw new AppError(ErrorMessages[ErrorCode.NOT_ANNOUNCEMENT], ErrorStatusCodes[ErrorCode.NOT_ANNOUNCEMENT], ErrorCode.NOT_ANNOUNCEMENT);
    }

    // Verify admin owns the turf
    if (announcement.turfId) {
      await this.verifyTurfOwnership(adminId, announcement.turfId);
    }

    await this.announcementRepository.delete(id);

    return { message: "Announcement deleted successfully" };
  }
}
