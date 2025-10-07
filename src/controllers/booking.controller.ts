import { Response } from "express";
import { BookingService } from "../services/booking.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { AuthRole } from "../services/auth.service";
import { BookingStatus } from "../entities/booking.entity";

export class BookingController {
  private bookingService: BookingService;

  constructor() {
    this.bookingService = new BookingService();
  }

  // Create booking (Both User and Admin)
  createBooking = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { turfId, date, startTime, endTime } = req.body;

    const booking = await this.bookingService.createBooking({
      turfId,
      userId,
      date,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      creatorId: userId, // MODIFIED
      createdByRole: role,
    });

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
    const { status, turfId, date } = req.query;

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
        ownerId: userId,
      });
    }

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  };

  // Get single booking by ID
  getBookingById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    const booking = await this.bookingService.getBookingById(id, userId, role);

    res.json({
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

    res.json({
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
    const adminId = req.user!.id;
    const { userId, turfId, date, startTime, endTime } = req.body;

    const booking = await this.bookingService.createBooking({
      turfId,
      userId,
      date,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      creatorId: adminId, // MODIFIED
      createdByRole: AuthRole.ADMIN,
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully for user",
      data: booking,
    });
  };
}
