import { Request, Response, NextFunction } from "express";
import { AppError } from "./error.middleware";

export const validateRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    throw new AppError("All fields are required", 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError("Invalid email format", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  next();
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  next();
};

export const validatePasswordChange = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new AppError("Old password and new password are required", 400);
  }

  if (newPassword.length < 6) {
    throw new AppError("New password must be at least 6 characters", 400);
  }

  if (oldPassword === newPassword) {
    throw new AppError("New password must be different from old password", 400);
  }

  next();
};

export const validateBooking = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { turfId, date, startTime, endTime } = req.body;

  if (!turfId) {
    throw new AppError("Turf ID is required", 400);
  }

  if (!date || !startTime || !endTime) {
    throw new AppError(
      "Missing required fields: date, startTime, endTime",
      400
    );
  }

  // Ensure date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new AppError("Invalid date format. Expected YYYY-MM-DD", 400);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError(
      "Invalid datetime format. Use ISO 8601 (e.g. 2025-10-05T10:00:00Z)",
      400
    );
  }

  // Check that both times fall on the given date
  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];
  if (startDate !== date || endDate !== date) {
    throw new AppError(
      "startTime and endTime must match the provided date",
      400
    );
  }

  // End must be after start
  if (start >= end) {
    throw new AppError("endTime must be after startTime", 400);
  }

  // Must be in the future
  const now = new Date();
  if (start <= now) {
    throw new AppError("Booking time must be in the future", 400);
  }

  // Maximum one week ahead
  const oneWeekLater = new Date();
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);
  if (start > oneWeekLater) {
    throw new AppError(
      "Bookings are allowed only up to 7 days in advance",
      400
    );
  }

  next();
};

export const validateReview = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { bookingId, rating } = req.body;

  if (!bookingId || !rating) {
    throw new AppError("Booking ID and rating are required", 400);
  }

  if (rating < 1 || rating > 5) {
    throw new AppError("Rating must be between 1 and 5", 400);
  }

  next();
};

export const validateAnnouncement = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, message, type } = req.body;

  if (!title || !message) {
    throw new AppError("Title and message are required", 400);
  }

  if (
    type &&
    !["general", "maintenance", "promotion", "closure"].includes(type)
  ) {
    throw new AppError("Invalid announcement type", 400);
  }

  next();
};

export const validateTurf = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, address } = req.body;

  if (!name || !address) {
    throw new AppError("Name and address are required", 400);
  }

  if (name.length < 3) {
    throw new AppError("Turf name must be at least 3 characters", 400);
  }

  next();
};

export const validatePricing = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { turfId, dayType, timeSlot, price } = req.body;

  if (!turfId || !dayType || !timeSlot || price === undefined) {
    throw new AppError("All pricing fields are required", 400);
  }

  if (!["weekday", "weekend"].includes(dayType)) {
    throw new AppError("Invalid day type. Must be 'weekday' or 'weekend'", 400);
  }

  if (!["morning", "afternoon", "evening"].includes(timeSlot)) {
    throw new AppError(
      "Invalid time slot. Must be 'morning', 'afternoon', or 'evening'",
      400
    );
  }

  if (price < 0) {
    throw new AppError("Price must be a positive number", 400);
  }

  next();
};

export const validateSetting = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { turfId, key, value } = req.body;

  if (!turfId || !key || !value) {
    throw new AppError("Turf ID, key, and value are required", 400);
  }

  if (key.length < 2) {
    throw new AppError("Setting key must be at least 2 characters", 400);
  }

  next();
};
