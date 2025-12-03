import { Repository, MoreThan, Between, EntityManager } from "typeorm";
import { Booking, BookingStatus } from "../entities/booking.entity";
import { Turf } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import { PricingService } from "./pricing.service";
import { SettingService } from "./setting.service";
import { AppError } from "../middleware/error.middleware";
import { AuthRole } from "./auth.service";
import { User } from "../entities/user.entity";
import { Admin } from "../entities/admin.entity";
import { PaymentService } from "./payment.service";
import { BookingView } from "../entities/booking-view.entity";
import * as bcrypt from "bcryptjs";
import { TurfSettingService } from "./turf-setting.service";
import { toZonedTime } from "date-fns-tz";

export interface CreateBookingDto {
  turfId: string;
  userId: string;
  date: string;
  startTime: Date;
  endTime: Date;
  creatorId: string;
  createdByRole: AuthRole;
}

export interface CreateAdminBookingDto {
  phone: string;
  name?: string;
  turfId: string;
  date: string;
  startTime: Date;
  endTime: Date;
  adminId: string;
}

export class BookingService {
  private bookingRepository: Repository<Booking>;
  private bookingViewRepository: Repository<BookingView>;
  private turfRepository: Repository<Turf>;
  private userRepository: Repository<User>;
  private adminRepository: Repository<Admin>;
  private pricingService: PricingService;
  private settingService: SettingService;
  private paymentService: PaymentService;
  private readonly minBookingHours: number = 1;
  private readonly cancelHoursThreshold: number = 24;

  private turfSettingService: TurfSettingService;

  constructor() {
    this.bookingRepository = AppDataSource.getRepository(Booking);
    this.bookingViewRepository = AppDataSource.getRepository(BookingView);
    this.turfRepository = AppDataSource.getRepository(Turf);
    this.pricingService = new PricingService();
    this.settingService = new SettingService();
    this.turfSettingService = new TurfSettingService();
    this.userRepository = AppDataSource.getRepository(User);
    this.adminRepository = AppDataSource.getRepository(Admin);
    this.paymentService = new PaymentService();
  }

  // Internal method to handle core booking logic within a transaction
  private async _createBookingInternal(
    data: CreateBookingDto,
    transactionalEntityManager: EntityManager,
    status: BookingStatus = BookingStatus.PENDING
  ) {
    const {
      turfId,
      userId,
      date,
      startTime,
      endTime,
      creatorId,
      createdByRole,
    } = data;

    // 1. Acquire Lock on Turf
    const turf = await transactionalEntityManager.findOne(Turf, {
      where: { id: turfId },
      lock: { mode: "pessimistic_write" },
    });

    if (!turf) {
      throw new AppError("Turf not found", 404);
    }

    if (turf.status !== "active" && createdByRole !== AuthRole.ADMIN) {
      throw new AppError("This turf is not available for booking", 400);
    }

    // 2. Check if bookings are disabled (skip for admin)
    const turfSettings = await this.turfSettingService.getTurfSettings(turfId);
    const timezone = turfSettings.timezone || "Asia/Kolkata";

    if (createdByRole !== AuthRole.ADMIN) {
      const allowed = await this.turfSettingService.isBookingAllowed(turfId);
      if (!allowed.allowed) {
        throw new AppError(
          `Bookings are currently disabled: ${allowed.reason}`,
          400
        );
      }
    }

    // 3. Validate booking duration
    const hours =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const minHours = turfSettings.minBookingHours || this.minBookingHours;
    
    if (hours < minHours) {
      throw new AppError(
        `Minimum booking duration is ${minHours} hour(s)`,
        400
      );
    }

    // 4. Validate operating hours
    this.validateOperatingHours(startTime, endTime, turf, timezone);

    // 5. Check for overlaps
    const overlapCount = await transactionalEntityManager
      .createQueryBuilder(Booking, "booking")
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

    if (overlapCount > 0) {
      throw new AppError("Time slot already booked", 409);
    }

    // 6. Calculate price
    const price = await this.pricingService.calculatePrice(
      turfId,
      startTime,
      endTime,
      date,
      timezone
    );

    // 7. Get Creator Name
    let creatorName = "Unknown";
    if (createdByRole === AuthRole.ADMIN) {
      const admin = await transactionalEntityManager.findOne(Admin, {
        where: { id: creatorId },
      });
      if (!admin) throw new AppError("Creating admin not found", 404);
      creatorName = admin.name;
    } else {
      const user = await transactionalEntityManager.findOne(User, {
        where: { id: creatorId },
      });
      if (!user) throw new AppError("Creating user not found", 404);
      creatorName = user.name;
    }

    // 8. Create Booking Entity
    const booking = transactionalEntityManager.create(Booking, {
      turfId,
      userId,
      date,
      startTime,
      endTime,
      price,
      status,
      createdBy: creatorName,
    });

    // 9. Save Booking
    return await transactionalEntityManager.save(Booking, booking);
  }

  async createBookingForUser(data: CreateBookingDto) {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      // Create booking with PENDING status
      const booking = await this._createBookingInternal(
        data,
        transactionalEntityManager,
        BookingStatus.PENDING
      );

      // Check Turf Settings for Payment
      const turfSettings = await this.turfSettingService.getTurfSettings(data.turfId);

      if (turfSettings.requireAdvancePayment) {
        const advanceAmount = (booking.price * turfSettings.advancePaymentPercentage) / 100;
        
        if (advanceAmount > 0) {
          try {
            const razorpayOrder = await this.paymentService.createOrder(
              advanceAmount,
              booking.id
            );
            booking.orderId = razorpayOrder.id;
            await transactionalEntityManager.save(Booking, booking);
            return { ...booking, razorpayOrder, advanceAmount };
          } catch (error) {
            throw new AppError("Failed to initiate payment", 500);
          }
        }
      }

      // If no payment required, return booking (it stays PENDING until confirmed manually or auto-confirmed?)
      // Usually if no payment, it might be auto-confirmed or stay pending.
      // For now, leaving as PENDING unless auto-confirm is on?
      // Let's check autoConfirmBooking setting
      if (turfSettings.autoConfirmBooking && !turfSettings.requireAdvancePayment) {
          booking.status = BookingStatus.CONFIRMED;
          await transactionalEntityManager.save(Booking, booking);
      }

      return booking;
    });
  }

  async createGuestBooking(data: CreateAdminBookingDto) {
    const { phone, name, turfId, date, startTime, endTime, adminId } = data;

    // 1. Find or Create User
    let user = await this.userRepository.findOne({ where: { phone } });

    if (!user) {
      // Create new user
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      const email = `guest_${phone}_${Date.now()}@gomyturf.com`;

      user = this.userRepository.create({
        phone,
        name: name || "Guest User",
        email,
        password: hashedPassword,
        isActive: true,
      });
      await this.userRepository.save(user);
    }

    // 2. Create Booking (Confirmed immediately, no payment)
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      return await this._createBookingInternal(
        {
          turfId,
          userId: user!.id,
          date,
          startTime,
          endTime,
          creatorId: adminId,
          createdByRole: AuthRole.ADMIN,
        },
        transactionalEntityManager,
        BookingStatus.CONFIRMED
      );
    });
  }

  async createBookingForAdmin(data: CreateBookingDto) {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      return await this._createBookingInternal(
        data,
        transactionalEntityManager,
        BookingStatus.CONFIRMED
      );
    });
  }

  async verifyBookingPayment(bookingId: string, paymentId: string, signature: string) {
      const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
      if (!booking) {
          throw new AppError("Booking not found", 404);
      }

      if (!booking.orderId) {
          throw new AppError("No payment order associated with this booking", 400);
      }

      const isValid = this.paymentService.verifyPayment(booking.orderId, paymentId, signature);
      if (!isValid) {
          throw new AppError("Invalid payment signature", 400);
      }

      booking.status = BookingStatus.CONFIRMED;
      booking.paymentId = paymentId;
      return await this.bookingRepository.save(booking);
  }

  async updateBookingPaymentStatus(orderId: string, paymentId: string) {
    const booking = await this.bookingRepository.findOne({ where: { orderId } });

    if (!booking) {
      throw new AppError("Booking with this order ID not found", 404);
    }

    if (booking.status === BookingStatus.PENDING) {
      booking.status = BookingStatus.CONFIRMED;
      booking.paymentId = paymentId;
      return await this.bookingRepository.save(booking);
    }

    return booking;
  }

  async getUserBookings(
    userId: string,
    filters?: {
      status?: BookingStatus;
      turfId?: string;
      turfName?: string;
      date?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bookingViewRepository
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

    if (filters?.turfName) {
      queryBuilder.andWhere("booking.turfName ILIKE :turfName", {
        turfName: `%${filters.turfName}%`,
      });
    }

    if (filters?.date) {
      queryBuilder.andWhere("booking.date = :date", { date: filters.date });
    }

    const [data, total] = await queryBuilder
      .orderBy("booking.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllBookings(filters?: {
    status?: BookingStatus;
    turfId?: string;
    date?: string;
    ownerId?: string;
    turfName?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bookingViewRepository.createQueryBuilder("booking");

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

    if (filters?.turfName) {
      queryBuilder.andWhere("booking.turfName ILIKE :turfName", {
        turfName: `%${filters.turfName}%`,
      });
    }

    if (filters?.ownerId) {
      queryBuilder
        .leftJoin(Turf, "turf", "booking.turfId = turf.id")
        .andWhere("turf.ownerId = :ownerId", {
          ownerId: filters.ownerId,
        });
    }

    const [data, total] = await queryBuilder
      .orderBy("booking.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingsByTurfId(
    turfId: string,
    filters?: {
      status?: BookingStatus;
      date?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 100;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bookingViewRepository
      .createQueryBuilder("booking")
      .where("booking.turfId = :turfId", { turfId });

    if (filters?.status) {
      queryBuilder.andWhere("booking.status = :status", {
        status: filters.status,
      });
    }

    if (filters?.date) {
      queryBuilder.andWhere("booking.date = :date", { date: filters.date });
    }

    const [data, total] = await queryBuilder
      .orderBy("booking.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingById(bookingId: string, userId?: string, role?: AuthRole) {
    const booking = await this.bookingViewRepository // Use View
      .createQueryBuilder("booking")
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
      const turfSettings = await this.turfSettingService.getTurfSettings(booking.turfId);
      const cancelThreshold = turfSettings.cancellationDeadlineHours || this.cancelHoursThreshold;
      
      const hoursDiff =
        (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursDiff < cancelThreshold) {
        throw new AppError(
          `Cannot cancel booking within ${cancelThreshold} hours of start time`,
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

  private validateOperatingHours(startTime: Date, endTime: Date, turf: Turf, timezone: string) {
    // Convert UTC times to Turf's timezone
    const zonedStart = toZonedTime(startTime, timezone);
    const zonedEnd = toZonedTime(endTime, timezone);

    const startHour = zonedStart.getHours();
    const startMinute = zonedStart.getMinutes();
    const endHour = zonedEnd.getHours();
    const endMinute = zonedEnd.getMinutes();

    const [openHour, openMinute] = turf.openingTime.split(":").map(Number);
    const [closeHour, closeMinute] = turf.closingTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    // Handle overnight closing (e.g., closes at 02:00 next day)
    // If close time is smaller than open time, it means it crosses midnight
    if (closeMinutes < openMinutes) {
        // If start time is before close time (e.g. 01:00), it's valid (next day)
        // If start time is after open time (e.g. 23:00), it's valid (same day)
        // But we need to check the full range.
        // Simplest check: if endMinutes > closeMinutes AND startMinutes < openMinutes, then invalid
        // Wait, this logic is tricky.
        // Let's assume standard operating hours for now, or simple midnight crossing.
        // If crossing midnight, we can say:
        // Valid if (start >= open) OR (end <= close)
        // But a booking can span across midnight?
        // Let's stick to simple logic: if start < open AND start > close (assuming close < open), then invalid.
        
        // Actually, if close < open, then the closed period is between close and open.
        if (startMinutes > closeMinutes && startMinutes < openMinutes) {
             throw new AppError(
                `Booking must be within operating hours: ${turf.openingTime} - ${turf.closingTime}`,
                400
            );
        }
        
        // Also check end time
        if (endMinutes > closeMinutes && endMinutes < openMinutes) {
             throw new AppError(
                `Booking must be within operating hours: ${turf.openingTime} - ${turf.closingTime}`,
                400
            );
        }
    } else {
        // Standard day hours
        if (startMinutes < openMinutes || endMinutes > closeMinutes) {
            throw new AppError(
                `Booking must be within operating hours: ${turf.openingTime} - ${turf.closingTime}`,
                400
            );
        }
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
