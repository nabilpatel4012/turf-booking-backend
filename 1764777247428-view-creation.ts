import { MigrationInterface, QueryRunner } from "typeorm";

export class ViewCreation1764777247428 implements MigrationInterface {
    name = 'ViewCreation1764777247428'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE VIEW "booking_details_view" AS 
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
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","booking_details_view","SELECT\n      b.id,\n      b.turf_id,\n      b.user_id,\n      b.date,\n      b.start_time,\n      b.end_time,\n      b.price,\n      b.status,\n      b.created_by,\n      b.cancelled_at,\n      b.cancellation_reason,\n      b.payment_id,\n      b.order_id,\n      b.created_at,\n      b.updated_at,\n      t.name AS turf_name,\n      u.name AS user_name,\n      u.phone AS user_phone,\n      u.email AS user_email\n    FROM bookings b\n    LEFT JOIN turfs t ON b.turf_id = t.id\n    LEFT JOIN users u ON b.user_id = u.id"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","booking_details_view","public"]);
        await queryRunner.query(`DROP VIEW "booking_details_view"`);
    }

}
