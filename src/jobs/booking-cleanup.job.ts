import cron from "node-cron";
import { AppDataSource } from "../db/data.source";
import { Booking, BookingStatus } from "../entities/booking.entity";
import { LessThanOrEqual, IsNull, Not } from "typeorm";
import { toZonedTime } from "date-fns-tz";

export const initBookingCleanupJob = () => {
    // Run every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        console.log("[BookingCleanupJob] Running...");
        try {
            const bookingRepo = AppDataSource.getRepository(Booking);
            
            // Get current time in IST (Asia/Kolkata)
            const now = new Date();
            const istTime = toZonedTime(now, "Asia/Kolkata");

            // 1. Mark CONFIRMED bookings as COMPLETED if end time is in the past
            const completedResult = await bookingRepo.update(
                {
                    status: BookingStatus.CONFIRMED,
                    endTime: LessThanOrEqual(istTime),
                },
                {
                    status: BookingStatus.COMPLETED,
                }
            );

            if (completedResult.affected && completedResult.affected > 0) {
                console.log(`[BookingCleanupJob] Marked ${completedResult.affected} bookings as COMPLETED.`);
            }

            // 2. Cancel expired PENDING bookings (slot lock expired)
            const expiredPendingResult = await bookingRepo
                .createQueryBuilder()
                .update(Booking)
                .set({
                    status: BookingStatus.CANCELLED,
                    cancellationReason: "Payment timeout - slot lock expired",
                    cancelledAt: now,
                    paidAmount: () => "NULL",
                    orderId: () => "NULL",
                    lockedUntil: () => "NULL",
                })
                .where("status = :status", { status: BookingStatus.PENDING })
                .andWhere("locked_until IS NOT NULL")
                .andWhere("locked_until <= :now", { now })
                .execute();

            if (expiredPendingResult.affected && expiredPendingResult.affected > 0) {
                console.log(`[BookingCleanupJob] Cancelled ${expiredPendingResult.affected} expired pending bookings.`);
            }

        } catch (error) {
            console.error("[BookingCleanupJob] Error:", error);
        }
    });

    console.log("[BookingCleanupJob] Initialized - runs every 5 minutes");
};
