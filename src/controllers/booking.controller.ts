import { Response } from "express";
import { BookingService } from "../services/booking.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { UserRole } from "../entities/user.entity";

export class BookingController {
  private bookingService: BookingService;

  constructor() {
    this.bookingService = new BookingService();
  }

  createBooking = async (req: AuthRequest, res: Response) => {
    const { date, startTime, endTime } = req.body;
    const booking = await this.bookingService.createBooking(
      req.user!.id,
      date,
      new Date(startTime),
      new Date(endTime),
      req.user!.role === UserRole.ADMIN
    );
    res.status(201).json(booking);
  };

  getBookings = async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user!.role === UserRole.ADMIN;
    const bookings = isAdmin
      ? await this.bookingService.getAllBookings()
      : await this.bookingService.getUserBookings(req.user!.id);
    res.json(bookings);
  };

  cancelBooking = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (id) {
      const booking = await this.bookingService.cancelBooking(
        id,
        req.user!.id,
        req.user!.role === UserRole.ADMIN
      );
      res.json({ message: "Booking cancelled", booking });
    }
  };

  createAdminBooking = async (req: AuthRequest, res: Response) => {
    const { userId, date, startTime, endTime } = req.body;
    const booking = await this.bookingService.createBooking(
      userId,
      date,
      new Date(startTime),
      new Date(endTime),
      true,
      "admin"
    );
    res.status(201).json(booking);
  };
}
