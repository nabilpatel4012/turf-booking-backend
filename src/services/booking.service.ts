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
import { APIFeatures } from "../utils/api.features";


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

    console.log("[BookingService] _createBookingInternal started", { turfId, date, startTime, endTime });

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
    console.log("[BookingService] got the turf settings in _createBookingInternal", { turfSettings });
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



    // 5. Check for overlaps
    const overlapCount = await transactionalEntityManager
      .createQueryBuilder(Booking, "booking")
      .where("booking.turfId = :turfId", { turfId })
      .andWhere(
        "(booking.status IN (:...activeStatuses) OR (booking.status = :pendingStatus AND booking.createdAt > :expirationTime))",
        {
          activeStatuses: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE],
          pendingStatus: BookingStatus.PENDING,
          expirationTime: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes expiration
        }
      )
      .andWhere("booking.date = :date", { date })
      .andWhere("booking.startTime < :endTime", { endTime })
      .andWhere("booking.endTime > :startTime", { startTime })
      .getCount();

    if (overlapCount > 0) {
      console.log("[BookingService] Overlap found!", overlapCount);
      throw new AppError("Time slot already booked", 409);
    }
    console.log("[BookingService] Overlap check passed");

    // 6. Calculate total amount
    const totalAmount = await this.pricingService.calculatePrice(
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
      totalAmount,
      status,
      createdBy: creatorName,
    });

    // 9. Save Booking
    return await transactionalEntityManager.save(Booking, booking);
  }

  async createBookingForUser(data: CreateBookingDto) {
    console.log("[BookingService] createBookingForUser called", data);
    // 1. Create Booking in Transaction
    const result = await AppDataSource.transaction(async (transactionalEntityManager) => {
      // Create booking with PENDING status
      const booking = await this._createBookingInternal(
        data,
        transactionalEntityManager,
        BookingStatus.PENDING
      );

      // Check Turf Settings for Payment
      const turfSettings = await this.turfSettingService.getTurfSettings(data.turfId);
      console.log("[BookingService] Turf Settings:", { 
          requireAdvance: turfSettings.requireAdvancePayment, 
          advanceAmount: turfSettings.advancePaymentAmount 
      });
      let razorpayOrder = undefined;
      let advanceAmount = 0;

      if (turfSettings.requireAdvancePayment) {
        advanceAmount = turfSettings.advancePaymentAmount;
        
        // Add 2.5% Platform Fee
        const platformFee = Math.ceil(advanceAmount * 0.025);
        const totalPayable = advanceAmount + platformFee;
        
        if (totalPayable > 0) {
          console.log("[BookingService] Creating Razorpay Order for amount:", totalPayable);
          try {
             // Generate Unique Receipt ID
             const receiptId = `R_${data.turfId.slice(0, 8)}_${Date.now()}`;
             
             razorpayOrder = await this.paymentService.createOrder(
              totalPayable,
              receiptId,
              {
                turfId: data.turfId,
                bookingId: booking.id,
                advanceAmount: advanceAmount,
                platformFee: platformFee,
                "App Name": "NexSports",
                "App ID": data.turfId
              }
            );
             console.log("[BookingService] Razorpay Order Created:", razorpayOrder.id);
            booking.orderId = razorpayOrder.id;
            
            // Populate Payment & Metadata Fields
            booking.invoiceId = receiptId; // Use the generated receipt ID as invoice ID
            booking.appId = data.turfId;   // Turf ID as App ID
            booking.appName = "NexSports";
            // We can store the expected paid amount here, or strictly only on success.
            // Let's store what we *expect* to be paid.
            booking.paidAmount = totalPayable; 
            
            await transactionalEntityManager.save(Booking, booking);
          } catch (error) {
            throw new AppError("Failed to initiate payment", 500);
          }
        }
      }

      // Auto Confirm Logic
      let confirmed = false;
      if (turfSettings.autoConfirmBooking && !turfSettings.requireAdvancePayment) {
          booking.status = BookingStatus.CONFIRMED;
          await transactionalEntityManager.save(Booking, booking);
          confirmed = true;
      }
      
      return { booking, razorpayOrder, advanceAmount, confirmed, turfSettings };
    });

    // 2. Post-Transaction Notifications (Robustness: Failure here won't rollback booking)
    const { booking, confirmed } = result;

    /* WhatsApp removed as per request
    if (confirmed) {
         // Send User Confirmation
         try {
             const user = await this.userRepository.findOne({ where: { id: data.userId } });
             const turf = await this.turfRepository.findOne({ where: { id: data.turfId } });
             
             if (user?.phone && turf) {
                 await this.whatsAppService.sendBookingConfirmation(user.phone, {
                     userName: user.name,
                     turfName: turf.name,
                     date: data.date,
                     time: `${data.startTime.getHours()}:${data.startTime.getMinutes()}`,
                     bookingId: booking.id
                 });
             }
         } catch (e) {
             console.error("Failed to send user confirmation whatsapp", e);
         }
    } else if (!result.razorpayOrder) {
        // Send Admin Notification for new pending request (if not waiting for payment)
        try {
            const turf = await this.turfRepository.findOne({ where: { id: data.turfId } });
            const user = await this.userRepository.findOne({ where: { id: data.userId } });
            const admin = await this.adminRepository.findOne({ where: { id: turf?.ownerId } });

            if (admin?.phone && turf && user) {
                 await this.whatsAppService.sendAdminNotification(admin.phone, {
                     turfName: turf.name,
                     userName: user.name,
                     date: data.date,
                     time: `${data.startTime.getHours()}:${data.startTime.getMinutes()}`,
                 });
            }
        } catch (e) {
             console.error("Failed to send admin notification whatsapp", e);
        }
    }
    */

    if (result.razorpayOrder) {
        return { 
          ...booking, 
          razorpayOrder: result.razorpayOrder, 
          advanceAmount: result.advanceAmount,
          // We can optionally return the breakdown here if needed by frontend immediately,
          // though usually frontend calculates it for display before calling createBooking.
        };
    }
    return booking;
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
      
      // We can infer the paid amount from the order if we had it, but for now we can rely on what we expected
      // better yet, we can fetch the order details if we want to be 100% sure, but that requires an extra API call.
      // For now, let's assume the payment was for the full required advance amount which we likely calculated before.
      // However, we didn't store the *expected* advance amount on the booking entity itself, only calculated it dynamically.
      // Let's at least store the paymentId and perhaps the raw signature as info.
      
      booking.paymentInfo = {
        paymentId,
        orderId: booking.orderId,
        signature,
        verifiedAt: new Date()
      };
      
      // If we want paidAmount, we might need to store `advanceAmount` on the booking during creation or fetch it.
      // Since we don't have it on the entity, we might skip `paidAmount` update here OR fetch turf settings again?
      // Actually, let's leave paidAmount null if we aren't sure, or better:
      // The user wants `paidAmount`. We can populate it if we add `advanceAmount` to the booking entity or recalculate.
      // Let's store the `paymentId` as key.
      
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

  async getAllBookingsV2(queryString: any, ownerId?: string) {
    let queryBuilder = this.bookingViewRepository.createQueryBuilder("booking");

    if (ownerId) {
       queryBuilder
        .leftJoin(Turf, "turf", "booking.turfId = turf.id")
        .andWhere("turf.ownerId = :ownerId", { ownerId });
    }

    // Initialize API Features
    const features = new APIFeatures(queryBuilder, queryString)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const [data, total] = await features.query.getManyAndCount();
    
    // Calculate page and limit fro meta
    const page = (queryString.page * 1) || 1;
    const limit = (queryString.limit * 1) || 100;

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
    const saveResult = await this.bookingRepository.save(booking);

    // Send WhatsApp Confirmation to User
    /* WhatsApp removed
    const user = await this.userRepository.findOne({ where: { id: booking.userId } });
    const turfInfo = await this.turfRepository.findOne({ where: { id: booking.turfId } });

    if (user && user.phone && turfInfo) {
        await this.whatsAppService.sendBookingConfirmation(user.phone, {
            userName: user.name,
            turfName: turfInfo.name,
            date: booking.date,
            time: `${booking.startTime.getHours()}:${booking.startTime.getMinutes()}`,
            bookingId: booking.id
        });
    }
    */

    return saveResult;
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



  private async checkOverlap(
    turfId: string,
    date: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const count = await this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.turfId = :turfId", { turfId })
      .andWhere(
        "(booking.status IN (:...activeStatuses) OR (booking.status = :pendingStatus AND booking.createdAt > :expirationTime))",
        {
          activeStatuses: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE],
          pendingStatus: BookingStatus.PENDING,
          expirationTime: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes expiration
        }
      )
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
  async verifyQR(
    adminId: string,
    params: {
      bookingId?: string;
      turfId: string;
      orderId?: string;
      paymentId?: string;
    }
  ) {
    const { bookingId, turfId, orderId, paymentId } = params;

    // 1. Verify Turf Ownership
    const turf = await this.turfRepository.findOne({
      where: { id: turfId },
      select: ["ownerId", "name", "openingTime", "closingTime"],
    });

    if (!turf) {
      throw new AppError("Turf not found", 404);
    }

    if (turf.ownerId !== adminId) {
      throw new AppError("Unauthorized: You do not own this turf", 403);
    }

    // 2. Find Booking
    let booking: Booking | null = null;

    if (bookingId) {
      booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ["user"],
      });
    } else if (orderId) {
      booking = await this.bookingRepository.findOne({
        where: { orderId },
        relations: ["user"],
      });
    }

    if (!booking) {
      return {
        valid: false,
        message: "Booking not found",
        booking: null,
      };
    }

    // 3. Validate Booking Details
    if (booking.turfId !== turfId) {
      return {
        valid: false,
        message: "Invalid Turf: Booking does not belong to this turf",
        booking: { ...booking, user: { name: booking.user?.name, phone: booking.user?.phone } },
      };
    }

    // Check Date (Must be today)
    const today = new Date();
    const bookingDate = new Date(booking.date);
    const turfSettings = await this.turfSettingService.getTurfSettings(turfId);
    const timezone = turfSettings.timezone || "Asia/Kolkata";
    
    // Convert both to turf's timezone to compare dates
    const zonedToday = toZonedTime(today, timezone);
    const zonedBookingDate = toZonedTime(bookingDate, timezone);

    // Compare YYYY-MM-DD
    const isToday = zonedToday.toISOString().split('T')[0] === booking.date; // booking.date is string YYYY-MM-DD
    
    // Note: booking.date is stored as string YYYY-MM-DD. 
    // If we want to be strict, we should compare it with today's date in turf's timezone.
    const todayString = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
    
    if (booking.date !== todayString) {
         return {
            valid: false,
            message: `Invalid Date: Booking is for ${booking.date}, today is ${todayString}`,
            booking: { ...booking, user: { name: booking.user?.name, phone: booking.user?.phone } },
        };
    }

    // Check Status
    if (booking.status === BookingStatus.CANCELLED) {
      return {
        valid: false,
        message: "Booking is Cancelled",
        booking: { ...booking, user: { name: booking.user?.name, phone: booking.user?.phone } },
      };
    }

    // 4. Payment Check
    let paymentStatus = "Paid";
    if (turfSettings.requireAdvancePayment) {
        if (booking.status !== BookingStatus.CONFIRMED) {
             paymentStatus = "Payment Pending";
             // If payment is required but not confirmed, it's invalid for entry?
             // Or just warn? User said "return Payment pending for all the cases it should work"
             // So we return valid: true (or false?) but with message?
             // "verify that... return Payment pending"
             // Let's return valid: false if payment pending? Or valid: true but message says pending?
             // Usually entry is denied if not paid.
             // But maybe they pay at venue?
             // "Payment pending for all the cases it should work" -> implies we should return this status.
             
             return {
                 valid: true, // Allow them to scan, but show payment pending
                 message: "Payment Pending",
                 booking: { ...booking, user: { name: booking.user?.name, phone: booking.user?.phone } },
                 paymentStatus: "Pending"
             };
        }
    }

    return {
      valid: true,
      message: "Access Granted",
      booking: { ...booking, user: { name: booking.user?.name, phone: booking.user?.phone } },
      paymentStatus
    };
  }
}

// Helper for date formatting if needed, or import from date-fns-tz
import { formatInTimeZone } from "date-fns-tz";
