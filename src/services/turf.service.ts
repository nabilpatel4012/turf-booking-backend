import { Repository } from "typeorm";
import { Turf, TurfStatus } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import { AppError } from "../middleware/error.middleware";

export interface CreateTurfDto {
  name: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  images?: string[];
  amenities?: string[];
  openingTime?: string;
  closingTime?: string;
}

export interface UpdateTurfDto {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  images?: string[];
  amenities?: string[];
  status?: TurfStatus;
  openingTime?: string;
  closingTime?: string;
}

export class TurfService {
  private turfRepository: Repository<Turf>;

  constructor() {
    this.turfRepository = AppDataSource.getRepository(Turf);
  }

  async getAllTurfs(filters?: {
    status?: TurfStatus;
    city?: string;
    state?: string;
  }) {
    const queryBuilder = this.turfRepository
      .createQueryBuilder("turf")
      .leftJoinAndSelect("turf.owner", "owner")
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
        "turf.createdAt",
        "owner.id",
        "owner.name",
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
        "turf.createdAt",
        "turf.updatedAt",
        "owner.id",
        "owner.name",
        "owner.email",
        "owner.phone",
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
    });

    if (!turf) {
      throw new AppError(
        "Turf not found or you don't have permission to update it",
        404
      );
    }

    // Update only provided fields
    Object.keys(data).forEach((key) => {
      if (data[key as keyof UpdateTurfDto] !== undefined) {
        (turf as any)[key] = data[key as keyof UpdateTurfDto];
      }
    });

    await this.turfRepository.save(turf);

    return turf;
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
}
