import { Repository, MoreThan, Between } from "typeorm";
import { Booking, BookingStatus } from "../entities/booking.entity";
import { Turf } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import { PricingService } from "./pricing.service";
import { SettingService } from "./setting.service";
import { AppError } from "../middleware/error.middleware";
import { AuthRole } from "./auth.service";
import { User } from "../entities/user.entity";
import { Admin } from "../entities/admin.entity";

export interface CreateBookingDto {
  turfId: string;
  userId: string;
  date: string;
  startTime: Date;
  endTime: Date;
  creatorId: string; // Renamed from createdBy for clarity
  createdByRole: AuthRole;
}

export class BookingService {
  private bookingRepository: Repository<Booking>;
  private turfRepository: Repository<Turf>;
  private userRepository: Repository<User>;
  private adminRepository: Repository<Admin>;
  private pricingService: PricingService;
  private settingService: SettingService;
  private readonly minBookingHours: number = 1;
  private readonly cancelHoursThreshold: number = 24;

  constructor() {
    this.bookingRepository = AppDataSource.getRepository(Booking);
    this.turfRepository = AppDataSource.getRepository(Turf);
    this.pricingService = new PricingService();
    this.settingService = new SettingService();
    this.userRepository = AppDataSource.getRepository(User);
    this.adminRepository = AppDataSource.getRepository(Admin);
  }

  async createBooking(data: CreateBookingDto) {
    const {
      turfId,
      userId,
      date,
      startTime,
      endTime,
      creatorId,
      createdByRole,
    } = data;

    // Verify turf exists and is active
    const turf = await this.turfRepository.findOne({ where: { id: turfId } });
    if (!turf) {
      throw new AppError("Turf not found", 404);
    }
    if (turf.status !== "active" && createdByRole !== AuthRole.ADMIN) {
      throw new AppError("This turf is not available for booking", 400);
    }

    // Check if bookings are disabled for this turf (skip for admin)
    if (createdByRole !== AuthRole.ADMIN) {
      const isDisabled = await this.settingService.isBookingDisabled(turfId);
      if (isDisabled.disabled) {
        throw new AppError(
          `Bookings are currently disabled: ${isDisabled.reason}`,
          400
        );
      }
    }

    // Validate booking duration
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (hours < this.minBookingHours) {
      throw new AppError(
        `Minimum booking duration is ${this.minBookingHours} hour(s)`,
        400
      );
    }

    // Validate booking time is within turf operating hours
    this.validateOperatingHours(startTime, endTime, turf);

    // Check for overlaps
    const hasOverlap = await this.checkOverlap(
      turfId,
      date,
      startTime,
      endTime
    );
    if (hasOverlap) {
      throw new AppError("Time slot already booked", 409);
    }

    // Calculate price
    const price = await this.pricingService.calculatePrice(
      turfId,
      startTime,
      endTime,
      date
    );

    // Find the name of the creator
    let creatorName = "Unknown";
    if (createdByRole === AuthRole.ADMIN) {
      const admin = await this.adminRepository.findOne({
        where: { id: creatorId },
      });
      if (!admin) throw new AppError("Creating admin not found", 404);
      creatorName = admin.name;
    } else {
      const user = await this.userRepository.findOne({
        where: { id: creatorId },
      });
      if (!user) throw new AppError("Creating user not found", 404);
      creatorName = user.name;
    }

    const booking = this.bookingRepository.create({
      turfId,
      userId,
      date,
      startTime,
      endTime,
      price,
      status:
        createdByRole === AuthRole.ADMIN
          ? BookingStatus.CONFIRMED
          : BookingStatus.PENDING,
      createdBy: creatorName, // Store the fetched name
    });

    const savedBooking = await this.bookingRepository.save(booking);
    return savedBooking;
  }

  async getUserBookings(
    userId: string,
    filters?: { status?: BookingStatus; turfId?: string }
  ) {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.userId = :userId", { userId });

    if (filters?.status) {
      queryBuilder.andWhere("booking.status = :status", {
        status: filters.status,
      });
    }

    if (filters?.turfId) {
      queryBuilder.andWhere("booking.turfId = :turfId", {
        turfId: filters.turfId,
      });
    }

    return await queryBuilder.orderBy("booking.createdAt", "DESC").getMany();
  }

  async getAllBookings(filters?: {
    status?: BookingStatus;
    turfId?: string;
    date?: string;
    ownerId?: string;
  }) {
    const queryBuilder = this.bookingRepository.createQueryBuilder("booking");

    if (filters?.status) {
      queryBuilder.andWhere("booking.status = :status", {
        status: filters.status,
      });
    }

    if (filters?.turfId) {
      queryBuilder.andWhere("booking.turfId = :turfId", {
        turfId: filters.turfId,
      });
    }

    if (filters?.date) {
      queryBuilder.andWhere("booking.date = :date", { date: filters.date });
    }

    if (filters?.ownerId) {
      queryBuilder
        .leftJoin("booking.turf", "turf")
        .andWhere("turf.ownerId = :ownerId", {
          ownerId: filters.ownerId,
        });
    }

    return await queryBuilder.orderBy("booking.createdAt", "DESC").getMany();
  }

  async getBookingById(bookingId: string, userId?: string, role?: AuthRole) {
    const booking = await this.bookingRepository
      .createQueryBuilder("booking")
      .leftJoin("booking.turf", "turf")
      .addSelect("turf.ownerId")
      .where("booking.id = :bookingId", { bookingId })
      .getOne();

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // For authorization, we need to check turf owner
    const turf = await this.turfRepository.findOne({
      where: { id: booking.turfId },
      select: ["ownerId"],
    });

    // Authorization check
    if (role === AuthRole.USER && booking.userId !== userId) {
      throw new AppError("Unauthorized to view this booking", 403);
    }

    if (role === AuthRole.ADMIN && turf?.ownerId !== userId) {
      throw new AppError("Unauthorized to view this booking", 403);
    }

    return booking;
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    role: AuthRole,
    cancellationReason?: string
  ) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // For authorization, we need to check turf owner
    const turf = await this.turfRepository.findOne({
      where: { id: booking.turfId },
      select: ["ownerId"],
    });

    // Authorization check
    if (role === AuthRole.USER && booking.userId !== userId) {
      throw new AppError("Unauthorized to cancel this booking", 403);
    }

    if (role === AuthRole.ADMIN && turf?.ownerId !== userId) {
      throw new AppError("Unauthorized to cancel this booking", 403);
    }

    // Check if already cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError("Booking already cancelled", 400);
    }

    // Check cancellation time threshold (skip for admin)
    if (role === AuthRole.USER) {
      const hoursDiff =
        (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursDiff < this.cancelHoursThreshold) {
        throw new AppError(
          `Cannot cancel booking within ${this.cancelHoursThreshold} hours of start time`,
          400
        );
      }
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    if (cancellationReason) {
      booking.cancellationReason = cancellationReason;
    }

    return await this.bookingRepository.save(booking);
  }

  async confirmBooking(bookingId: string, adminId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // Check turf ownership
    const turf = await this.turfRepository.findOne({
      where: { id: booking.turfId },
      select: ["ownerId"],
    });

    if (turf?.ownerId !== adminId) {
      throw new AppError("Unauthorized to confirm this booking", 403);
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new AppError("Only pending bookings can be confirmed", 400);
    }

    booking.status = BookingStatus.CONFIRMED;
    return await this.bookingRepository.save(booking);
  }

  async completeBooking(bookingId: string, adminId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // Check turf ownership
    const turf = await this.turfRepository.findOne({
      where: { id: booking.turfId },
      select: ["ownerId"],
    });

    if (turf?.ownerId !== adminId) {
      throw new AppError("Unauthorized to complete this booking", 403);
    }

    booking.status = BookingStatus.COMPLETED;
    return await this.bookingRepository.save(booking);
  }

  private validateOperatingHours(startTime: Date, endTime: Date, turf: Turf) {
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    const [openHour, openMinute] = turf.openingTime.split(":").map(Number);
    const [closeHour, closeMinute] = turf.closingTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
      throw new AppError(
        `Booking must be within operating hours: ${turf.openingTime} - ${turf.closingTime}`,
        400
      );
    }
  }

  private async checkOverlap(
    turfId: string,
    date: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const count = await this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.turfId = :turfId", { turfId })
      .andWhere("booking.status IN (:...statuses)", {
        statuses: [
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.ACTIVE,
        ],
      })
      .andWhere("booking.date = :date", { date })
      .andWhere("booking.startTime < :endTime", { endTime })
      .andWhere("booking.endTime > :startTime", { startTime })
      .getCount();

    return count > 0;
  }

  // Statistics methods
  async getActiveBookingsCount(
    turfId?: string,
    ownerId?: string
  ): Promise<number> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.status = :status", { status: BookingStatus.ACTIVE })
      .andWhere("booking.startTime > :now", { now: new Date() });

    if (turfId) {
      queryBuilder.andWhere("booking.turfId = :turfId", { turfId });
    }

    if (ownerId) {
      queryBuilder
        .leftJoin("booking.turf", "turf")
        .andWhere("turf.ownerId = :ownerId", { ownerId });
    }

    return await queryBuilder.getCount();
  }

  async getBookingsForDateRange(
    startDate: Date,
    endDate: Date,
    turfId?: string,
    ownerId?: string
  ) {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.createdAt >= :startDate", { startDate })
      .andWhere("booking.createdAt <= :endDate", { endDate })
      .andWhere("booking.status != :cancelled", {
        cancelled: BookingStatus.CANCELLED,
      });

    if (turfId) {
      queryBuilder.andWhere("booking.turfId = :turfId", { turfId });
    }

    if (ownerId) {
      queryBuilder
        .leftJoin("booking.turf", "turf")
        .andWhere("turf.ownerId = :ownerId", { ownerId });
    }

    return await queryBuilder.getMany();
  }

  async getTotalEarnings(
    startDate: Date,
    endDate: Date,
    turfId?: string,
    ownerId?: string
  ): Promise<number> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder("booking")
      .select("COALESCE(SUM(booking.price), 0)", "total")
      .where("booking.createdAt >= :startDate", { startDate })
      .andWhere("booking.createdAt <= :endDate", { endDate })
      .andWhere("booking.status != :cancelled", {
        cancelled: BookingStatus.CANCELLED,
      });

    if (turfId) {
      queryBuilder.andWhere("booking.turfId = :turfId", { turfId });
    }

    if (ownerId) {
      queryBuilder
        .leftJoin("booking.turf", "turf")
        .andWhere("turf.ownerId = :ownerId", { ownerId });
    }

    const result = await queryBuilder.getRawOne();
    return parseFloat(result.total);
  }

  async getCancelledBookingsCount(
    turfId?: string,
    ownerId?: string
  ): Promise<number> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.status = :status", { status: BookingStatus.CANCELLED });

    if (turfId) {
      queryBuilder.andWhere("booking.turfId = :turfId", { turfId });
    }

    if (ownerId) {
      queryBuilder
        .leftJoin("booking.turf", "turf")
        .andWhere("turf.ownerId = :ownerId", { ownerId });
    }

    return await queryBuilder.getCount();
  }
}
