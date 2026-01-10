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
import { AppError } from "../middleware/error.middleware";

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
    const userId = req.user!.id; // Authenticated user
    const role = req.user!.role; // User role
    let booking; // Declare booking variable here

    // Conditional Logic based on Role
    if (role === AuthRole.ADMIN) {
      // Admin creating booking (for themselves or guest)
      // If Admin is booking, ensure they have a User account (Shadow User)
      const admin = await this.adminRepository.findOne({ where: { id: userId } });
      if (!admin) {
        throw new AppError("Admin not found", 404, "NOT_002");
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
      const { turfId, date, startTime, endTime } = req.body;

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
      const { turfId, date, startTime, endTime } = req.body;
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

  // Get bookings (Strictly for USERS now)
  getBookings = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;

    // Safety check: ensure only users access this or redirected correctly
    if (role !== AuthRole.USER) {
       // Typically admins shouldn't use this route anymore, but if they do, 
       // we could either throw 403 or redirect logic. 
       // User requested separate routes. 
       // Let's enforce USERS only here to avoid ambiguity.
       // However, if we want to be nice, we could tell them to use the admin route.
       // But for strictness:
       // throw new AppError("Admins should use /bookings/admin/my-bookings", 400);
       // Or just default to empty if not user?
       // Let's implement User Logic only.
    }

    const { status, turfId, date, turfName, page, limit } = req.query;

    const result = await this.bookingService.getUserBookings(userId, {
      status: status as BookingStatus,
      turfId: turfId as string,
      turfName: turfName as string,
      date: date as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  };

  // Dedicated Admin Route for fetching bookings (Uses Service Level Query)
  getAdminBookings = async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    
    // Strict Role Check
    if (req.user?.role !== AuthRole.ADMIN) {
        throw new AppError("Access denied. Admins only.", 403);
    }

    const { status, turfId, date, turfName, page, limit } = req.query;

    // Use the NEW dedicated service method
    const result = await this.bookingService.getAdminBookings(adminId, {
        status: status as BookingStatus,
        turfId: turfId as string,
        date: date as string,
        turfName: turfName as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
    });

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
    });
  };

  getBookingsV2 = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;

    let result;

    if (role === AuthRole.USER) {
      const { status, turfId, date, turfName, page, limit } = req.query;
      result = await this.bookingService.getUserBookings(userId, {
        status: status as BookingStatus,
        turfId: turfId as string,
        turfName: turfName as string,
        date: date as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      });

    } else {
      // Admin V2 - Enforce ownerId
      result = await this.bookingService.getAllBookingsV2(req.query, userId);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  };

  // Get bookings by Turf ID (Public/Protected based on requirement)
  // Modified to return sanitized data for privacy
  getBookingsByTurfId = async (req: AuthRequest, res: Response) => {
    const { turfId } = req.params;
    const { status, date, page, limit } = req.query;

    const result = await this.bookingService.getBookingsByTurfId(turfId, {
      status: status as BookingStatus,
      date: date as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    // SANITIZE: Only return essential slot info to protect privacy
    // If we wanted to allow admins to see full info here, we'd check req.user and ownership,
    // but typically admins use the dashboard API (getBookings). This endpoint is likely for the slot picker.
    const sanitizedData = result.data.map(b => ({
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      date: b.date,
      status: b.status,
      // Exclude: userId, userName, userPhone, totalAmount, payment info etc.
    }));

    res.status(200).json({
      success: true,
      data: sanitizedData,
      meta: result.meta,
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

  // Update payment status (Simple)
  updatePaymentStatus = async (req: AuthRequest, res: Response) => {
    const { orderId, paymentId } = req.body;

    const booking = await this.bookingService.updateBookingPaymentStatus(
      orderId,
      paymentId
    );

    res.json({
      success: true,
      message: "Payment status updated and booking confirmed",
      data: booking,
    });
  };

  verifyQR = async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { bookingId, turfId, orderId, paymentId } = req.query;

    if (!turfId) {
      throw new AppError("Turf ID is required", 400);
    }

    const result = await this.bookingService.verifyQR(adminId, {
      bookingId: bookingId as string,
      turfId: turfId as string,
      orderId: orderId as string,
      paymentId: paymentId as string,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  };
}
