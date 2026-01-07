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
    const userId = req.user!.id;
    const role = req.user!.role;
    const { turfId, date, startTime, endTime } = req.body;

    console.log("[BookingController] createBooking request received", { userId, role, body: req.body });

    let booking;

    if (role === AuthRole.ADMIN) {
      console.log("[BookingController] Processing Admin booking");
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
      console.log("[BookingController] Processing User booking");
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
  // Get bookings (User: their own, Admin: all for their turfs)
  getBookings = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { status, turfId, date, ownerId, turfName, page, limit } = req.query;

    let result;

    if (role === AuthRole.USER) {
      // Users see only their bookings
      result = await this.bookingService.getUserBookings(userId, {
        status: status as BookingStatus,
        turfId: turfId as string,
        turfName: turfName as string,
        date: date as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      });
    } else {
      // Admins see bookings for their turfs
      result = await this.bookingService.getAllBookings({
        status: status as BookingStatus,
        turfId: turfId as string,
        date: date as string,
        ownerId: ownerId as string,
        turfName: turfName as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      });
    }

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
      // For user, currently reusing getUserBookings (V1 behavior) or should we allow V2 for them too?
      // Assuming V2 allows advanced filtering for users too if they use this endpoint.
      // But service.getUserBookings uses queryBuilder manually.
      // Let's keep V2 restricted to admins or just mirror V1 for users for now to be safe, 
      // OR implement getUserBookingsV2 if needed. 
      // The user request was "apply ... to some user faced and some admin faced".
      // Let's implement getAllBookingsV2 logic but constrained by user ID if it's a user.
      // But BookingService doesn't have getUserBookingsV2. 
      // Let's fallback to V1 for User in V2 endpoint for now, or throw "Not Implemented for User" if not requested.
      // However, the request implies availability.
      // Simplest: V2 endpoint calls V1 logic for users, and V2 logic for admins (since we refactored Admin side primarily).
      
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
      // Admin V2
      const { ownerId } = req.query; // Explicitly extract if passed, though usually implied.
      // Wait, passing req.query to service which parses it. 
      // But we need to enforce owner filter if it's an admin viewing "all bookings".
      // Actually, for admin: `getAllBookingsV2(queryString, ownerId)`.
      // We should pass `ownerId` from query if they want to filter specific owner? 
      // No, `ownerId` usually means "bookings for turfs owned by X".
      // If `req.query` contains `ownerId`, `getAllBookingsV2` will use it if we pass `undefined` as second arg?
      // No, look at service: `if (ownerId)` block is independent of `queryString`.
      // So passed arg `ownerId` is the constraint. `queryString` is the filter.
      // If we want to allow admin to filter by ownerId via query string, we should let `APIFeatures` handle `ownerId` if it's in query?
      // But `getAllBookingsV2` uses `ownerId` arg to enforce join.
      // Let's stick to: we pass `req.query.ownerId` as 2nd arg? 
      // In V1 controller: `ownerId: ownerId as string`.
      
      const ownerIdParam = req.query.ownerId as string;
      result = await this.bookingService.getAllBookingsV2(req.query, ownerIdParam);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  };

  // Get bookings by Turf ID (Public/Protected based on requirement, assuming protected for now)
  getBookingsByTurfId = async (req: AuthRequest, res: Response) => {
    const { turfId } = req.params;
    const { status, date, page, limit } = req.query;

    const result = await this.bookingService.getBookingsByTurfId(turfId, {
      status: status as BookingStatus,
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
