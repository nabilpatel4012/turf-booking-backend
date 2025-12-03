import { Response } from "express";
import { BookingService } from "../services/booking.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { AuthRole } from "../services/auth.service";
import { BookingStatus } from "../entities/booking.entity";
import { AppDataSource } from "../db/data.source";
import { User } from "../entities/user.entity";
import { Admin } from "../entities/admin.entity";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";

export class BookingController {
  private bookingService: BookingService;
  private userRepository: Repository<User>;
  private adminRepository: Repository<Admin>;

  constructor() {
    this.bookingService = new BookingService();
    this.userRepository = AppDataSource.getRepository(User);
    this.adminRepository = AppDataSource.getRepository(Admin);
  }

  createBooking = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { turfId, date, startTime, endTime } = req.body;

    let booking;

    if (role === AuthRole.ADMIN) {
      // If Admin is booking, ensure they have a User account (Shadow User)
      const admin = await this.adminRepository.findOne({ where: { id: userId } });
      if (!admin) {
        throw new Error("Admin not found");
      }

      let user = await this.userRepository.findOne({ where: { email: admin.email } });

      if (!user) {
        // Create shadow user for admin
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        user = this.userRepository.create({
          email: admin.email,
          name: admin.name,
          phone: admin.phone || undefined,
          password: hashedPassword,
          isActive: true,
        });
        await this.userRepository.save(user);
      }
      const bookingUserId = user.id;

      booking = await this.bookingService.createBookingForAdmin({
        turfId,
        userId: bookingUserId,
        date,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        creatorId: userId,
        createdByRole: role,
      });
    } else {
      // User booking
      booking = await this.bookingService.createBookingForUser({
        turfId,
        userId,
        date,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        creatorId: userId,
        createdByRole: role,
      });
    }

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  };

  // Get bookings (User: their own, Admin: all for their turfs)
  getBookings = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { status, turfId, date, ownerId } = req.query;

    let bookings;

    if (role === AuthRole.USER) {
      // Users see only their bookings
      bookings = await this.bookingService.getUserBookings(userId, {
        status: status as BookingStatus,
        turfId: turfId as string,
      });
    } else {
      // Admins see bookings for their turfs
      bookings = await this.bookingService.getAllBookings({
        status: status as BookingStatus,
        turfId: turfId as string,
        date: date as string,
        ownerId: ownerId as string,
      });
    }

    res.status(200).json({
      success: true,
      data: bookings,
    });
  };

  // Get single booking by ID
  getBookingById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    const booking = await this.bookingService.getBookingById(id, userId, role);

    res.status(200).json({
      success: true,
      data: booking,
    });
  };

  // Cancel booking (Both User and Admin)
  cancelBooking = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    const { reason } = req.body;

    const booking = await this.bookingService.cancelBooking(
      id,
      userId,
      role,
      reason
    );

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  };

  // Confirm booking (Admin only)
  confirmBooking = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    const booking = await this.bookingService.confirmBooking(id, adminId);

    res.json({
      success: true,
      message: "Booking confirmed successfully",
      data: booking,
    });
  };

  // Complete booking (Admin only)
  completeBooking = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    const booking = await this.bookingService.completeBooking(id, adminId);

    res.json({
      success: true,
      message: "Booking completed successfully",
      data: booking,
    });
  };

  // Admin create booking for user
  createBookingForUser = async (req: AuthRequest, res: Response) => {
    const { userId, turfId, date, startTime, endTime } = req.body;
    const creatorId = req.user!.id;
    const role = req.user!.role; // Should be ADMIN

    const booking = await this.bookingService.createBookingForAdmin({
        turfId,
        userId,
        date,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        creatorId,
        createdByRole: role,
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  };

  // Admin create booking by phone (New)
  createAdminBooking = async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { phone, name, turfId, date, startTime, endTime } = req.body;

    const booking = await this.bookingService.createGuestBooking({
      phone,
      name,
      turfId,
      date,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      adminId,
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  };

  // Verify payment
  verifyPayment = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { paymentId, signature } = req.body;

    const booking = await this.bookingService.verifyBookingPayment(
      id,
      paymentId,
      signature
    );

    res.json({
      success: true,
      message: "Payment verified and booking confirmed",
      data: booking,
    });
  };
}
