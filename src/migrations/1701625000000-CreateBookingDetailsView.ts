import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBookingDetailsView1701625000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW "booking_details_view" AS
      SELECT
        b.id,
        b.turf_id,
        b.user_id,
        b.date,
        b.start_time,
        b.end_time,
        b.price,
        b.status,
        b.created_by,
        b.cancelled_at,
        b.cancellation_reason,
        b.payment_id,
        b.order_id,
        b.created_at,
        b.updated_at,
        t.name AS turf_name,
        u.name AS user_name,
        u.phone AS user_phone,
        u.email AS user_email
      FROM bookings b
      LEFT JOIN turfs t ON b.turf_id = t.id
      LEFT JOIN users u ON b.user_id = u.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW "booking_details_view"`);
  }
}
