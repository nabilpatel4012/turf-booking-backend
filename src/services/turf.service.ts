import { Repository } from "typeorm";
import { Turf, TurfStatus, VenueShape, VenueType } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import { AppError } from "../middleware/error.middleware";
import { VenueTheme } from "../entities/venue-theme.entity";
import { UpdateVenueThemeDto } from "../dtos/venue-theme.dto";

export interface CreateTurfDto {
  name: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  googleMapUrl?: string; // New field
  latitude?: number;
  longitude?: number;
  phone?: string;
  images?: string[];
  amenities?: string[];
  openingTime?: string;
  closingTime?: string;
  venueType?: VenueType;
  shape?: VenueShape;
  size?: string;
}

export interface UpdateTurfDto {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  googleMapUrl?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  images?: string[];
  amenities?: string[];
  status?: TurfStatus;
  openingTime?: string;
  closingTime?: string;
  venueType?: VenueType;
  shape?: VenueShape;
  size?: string;
  theme?: Partial<VenueTheme>;
}

export class TurfService {
  private turfRepository: Repository<Turf>;
  private themeRepository: Repository<VenueTheme>;

  constructor() {
    this.turfRepository = AppDataSource.getRepository(Turf);
    this.themeRepository = AppDataSource.getRepository(VenueTheme);
  }

  async getAllTurfs(filters?: {
    status?: TurfStatus;
    city?: string;
    state?: string;
  }) {
    const queryBuilder = this.turfRepository
      .createQueryBuilder("turf")
      .leftJoinAndSelect("turf.owner", "owner")
      .leftJoinAndSelect("turf.theme", "theme")
      .select([
        "turf.id",
        "turf.name",
        "turf.description",
        "turf.address",
        "turf.city",
        "turf.state",
        "turf.zipCode",
        "turf.latitude",
        "turf.longitude",
        "turf.phone",
        "turf.images",
        "turf.amenities",
        "turf.status",
        "turf.openingTime",
        "turf.closingTime",
        "turf.venueType",
        "turf.shape",
        "turf.size",
        "turf.createdAt",
        "owner.id",
        "owner.name",
        "theme",
      ]);

    // Apply filters
    if (filters?.status) {
      queryBuilder.andWhere("turf.status = :status", {
        status: filters.status,
      });
    } else {
      // By default, only show active turfs to users
      queryBuilder.andWhere("turf.status = :status", {
        status: TurfStatus.ACTIVE,
      });
    }

    if (filters?.city) {
      queryBuilder.andWhere("LOWER(turf.city) = LOWER(:city)", {
        city: filters.city,
      });
    }

    if (filters?.state) {
      queryBuilder.andWhere("LOWER(turf.state) = LOWER(:state)", {
        state: filters.state,
      });
    }

    const turfs = await queryBuilder.getMany();

    return turfs;
  }

  async getTurfById(id: string, includeInactive = false) {
    const queryBuilder = this.turfRepository
      .createQueryBuilder("turf")
      .leftJoinAndSelect("turf.owner", "owner")
      .leftJoinAndSelect("turf.theme", "theme")
      .select([
        "turf.id",
        "turf.name",
        "turf.description",
        "turf.address",
        "turf.city",
        "turf.state",
        "turf.zipCode",
        "turf.latitude",
        "turf.longitude",
        "turf.phone",
        "turf.images",
        "turf.amenities",
        "turf.status",
        "turf.openingTime",
        "turf.closingTime",
        "turf.venueType",
        "turf.shape",
        "turf.size",
        "turf.createdAt",
        "turf.updatedAt",
        "owner.id",
        "owner.name",
        "owner.email",
        "owner.phone",
        "theme",
      ])
      .where("turf.id = :id", { id });

    if (!includeInactive) {
      queryBuilder.andWhere("turf.status = :status", {
        status: TurfStatus.ACTIVE,
      });
    }

    const turf = await queryBuilder.getOne();

    if (!turf) {
      throw new AppError("Turf not found", 404);
    }

    return turf;
  }

  async getTurfsByOwnerId(ownerId: string) {
    const turfs = await this.turfRepository.find({
      where: { ownerId },
      relations: ["theme"],
      order: { createdAt: "DESC" },
    });

    return turfs;
  }

  async createTurf(ownerId: string, data: CreateTurfDto) {
    const turf = this.turfRepository.create({
      ...data,
      ownerId,
      status: TurfStatus.ACTIVE,
    });

    await this.turfRepository.save(turf);

    return turf;
  }

  async updateTurf(id: string, ownerId: string, data: UpdateTurfDto) {
    const turf = await this.turfRepository.findOne({
      where: { id, ownerId },
      relations: ["theme"],
    });

    if (!turf) {
      throw new AppError(
        "Turf not found or you don't have permission to update it",
        404
      );
    }

    // Handle Theme update
    if (data.theme) {
      if (turf.theme) {
        // Update existing theme
        await this.themeRepository.update(turf.theme.id, data.theme);
      } else {
        // Create new theme
        const newTheme = this.themeRepository.create({
          ...data.theme,
          turf: turf,
        });
        await this.themeRepository.save(newTheme);
      }
      delete data.theme; // Remove from data to avoid overwriting turf properties
    }

    // Update only provided fields
    Object.keys(data).forEach((key) => {
      if (data[key as keyof UpdateTurfDto] !== undefined) {
        (turf as any)[key] = data[key as keyof UpdateTurfDto];
      }
    });

    await this.turfRepository.save(turf);

    // Return refreshed entity
    return this.getTurfById(id, true);
  }

  async deleteTurf(id: string, ownerId: string) {
    const turf = await this.turfRepository.findOne({
      where: { id, ownerId },
    });

    if (!turf) {
      throw new AppError(
        "Turf not found or you don't have permission to delete it",
        404
      );
    }

    // Soft delete by setting status to inactive
    turf.status = TurfStatus.INACTIVE;
    await this.turfRepository.save(turf);

    return { message: "Turf deleted successfully" };
  }

  async hardDeleteTurf(id: string, ownerId: string) {
    const turf = await this.turfRepository.findOne({
      where: { id, ownerId },
    });

    if (!turf) {
      throw new AppError(
        "Turf not found or you don't have permission to delete it",
        404
      );
    }

    // This will cascade delete all related bookings, reviews, pricing, etc.
    await this.turfRepository.remove(turf);

    return { message: "Turf permanently deleted" };
  }

  async updateTurfStatus(id: string, ownerId: string, status: TurfStatus) {
    const turf = await this.turfRepository.findOne({
      where: { id, ownerId },
    });

    if (!turf) {
      throw new AppError(
        "Turf not found or you don't have permission to update it",
        404
      );
    }

    turf.status = status;
    await this.turfRepository.save(turf);

    return turf;
  }

  async getTurfTheme(turfId: string) {
    const theme = await this.themeRepository.findOne({
      where: { turfId },
    });
    
    // Return default or null if not found, or create a default structure
    // For now, let's return what we found or null
    return theme;
  }

  async updateTurfTheme(turfId: string, ownerId: string, data: UpdateVenueThemeDto) {
    // Verify ownership first
    const turf = await this.turfRepository.findOne({
        where: { id: turfId, ownerId }
    });

    if (!turf) {
        throw new AppError("Venue not found or unauthorized", 404);
    }

    let theme = await this.themeRepository.findOne({
        where: { turfId }
    });

    if (theme) {
        await this.themeRepository.update(theme.id, data);
    } else {
        theme = this.themeRepository.create({
            ...data,
            turf: turf
        });
        await this.themeRepository.save(theme);
    }

    return this.themeRepository.findOne({ where: { turfId } });
  }
}
