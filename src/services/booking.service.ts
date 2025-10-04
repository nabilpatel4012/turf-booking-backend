import { Repository, LessThan, MoreThan } from "typeorm";
import { Booking, BookingStatus } from "../entities/booking.entity";
import { AppDataSource } from "../db/data.source";
import { PricingService } from "./pricing.service";
import { SettingService } from "./setting.service";

export class BookingService {
  private bookingRepository: Repository<Booking>;
  private pricingService: PricingService;
  private settingService: SettingService;
  private readonly minBookingHours: number = 1;
  private readonly cancelHoursThreshold: number = 24;

  constructor() {
    this.bookingRepository = AppDataSource.getRepository(Booking);
    this.pricingService = new PricingService();
    this.settingService = new SettingService();
  }

  async createBooking(
    userId: string,
    date: string,
    startTime: Date,
    endTime: Date,
    isAdmin: boolean = false,
    createdBy?: string
  ) {
    // Check if bookings are disabled (skip for admin)
    if (!isAdmin) {
      const isDisabled = await this.settingService.isBookingDisabled();
      if (isDisabled.disabled) {
        throw new Error(
          `Bookings are currently disabled: ${isDisabled.reason}`
        );
      }
    }

    // Validate booking duration
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (hours < this.minBookingHours) {
      throw new Error(
        `Minimum booking duration is ${this.minBookingHours} hour(s)`
      );
    }

    // Check for overlaps
    const hasOverlap = await this.checkOverlap(date, startTime, endTime);
    if (hasOverlap) {
      throw new Error("Time slot already booked");
    }

    // Calculate price
    const price = await this.pricingService.calculatePrice(
      startTime,
      endTime,
      date
    );

    const booking = this.bookingRepository.create({
      userId,
      date,
      startTime,
      endTime,
      price,
      status: BookingStatus.ACTIVE,
      createdBy,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Fetch with user relation (password will be excluded due to select: false)
    const bookingWithUser = await this.bookingRepository.findOne({
      where: { id: savedBooking.id },
      relations: ["user"],
    });

    return bookingWithUser;
  }

  async getUserBookings(userId: string) {
    // Since password has select: false, it won't be included in the query
    return await this.bookingRepository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.user", "user")
      .where("booking.userId = :userId", { userId })
      .orderBy("booking.createdAt", "DESC")
      .getMany();
  }

  async getAllBookings() {
    // Since password has select: false, it won't be included in the query
    return await this.bookingRepository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.user", "user")
      .orderBy("booking.createdAt", "DESC")
      .getMany();
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    isAdmin: boolean = false
  ) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ["user"],
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (!isAdmin && booking.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Check cancellation time threshold (skip for admin)
    if (!isAdmin) {
      const hoursDiff =
        (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursDiff < this.cancelHoursThreshold) {
        throw new Error(
          `Cannot cancel booking within ${this.cancelHoursThreshold} hours`
        );
      }
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();

    return await this.bookingRepository.save(booking);
  }

  private async checkOverlap(
    date: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const count = await this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.status = :status", { status: BookingStatus.ACTIVE })
      .andWhere("booking.date = :date", { date })
      .andWhere("booking.startTime < :endTime", { endTime })
      .andWhere("booking.endTime > :startTime", { startTime })
      .getCount();

    return count > 0;
  }

  async getActiveBookingsCount(): Promise<number> {
    return await this.bookingRepository.count({
      where: {
        status: BookingStatus.ACTIVE,
        startTime: MoreThan(new Date()),
      },
    });
  }

  async getBookingsForDateRange(startDate: Date, endDate: Date) {
    return await this.bookingRepository
      .createQueryBuilder("booking")
      .where("booking.createdAt >= :startDate", { startDate })
      .andWhere("booking.createdAt <= :endDate", { endDate })
      .andWhere("booking.status = :status", { status: BookingStatus.ACTIVE })
      .getMany();
  }

  async getTotalEarnings(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.bookingRepository
      .createQueryBuilder("booking")
      .select("COALESCE(SUM(booking.price), 0)", "total")
      .where("booking.createdAt >= :startDate", { startDate })
      .andWhere("booking.createdAt <= :endDate", { endDate })
      .andWhere("booking.status = :status", { status: BookingStatus.ACTIVE })
      .getRawOne();

    return parseFloat(result.total);
  }

  async getCancelledBookingsCount(): Promise<number> {
    return await this.bookingRepository.count({
      where: { status: BookingStatus.CANCELLED },
    });
  }
}
