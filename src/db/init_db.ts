import { DB } from "./db.js";
export const initDatabase = async () => {
  const client = await DB.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
  
        CREATE TABLE IF NOT EXISTS pricing (
          id SERIAL PRIMARY KEY,
          day_type VARCHAR(50) NOT NULL,
          time_slot VARCHAR(50) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          UNIQUE(day_type, time_slot)
        );
  
        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          created_by VARCHAR(50) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          cancelled_at TIMESTAMP
        );
  
        CREATE TABLE IF NOT EXISTS announcements (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
  
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
  
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value TEXT
        );
  
        CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
        CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
        CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(date, status);
        CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);

    // Insert default pricing if not exists
    const { rows: pricingRows } = await client.query(
      "SELECT COUNT(*) FROM pricing"
    );
    if (parseInt(pricingRows[0].count) === 0) {
      await client.query(`
          INSERT INTO pricing (day_type, time_slot, price) VALUES
          ('weekday', 'morning', 500),
          ('weekday', 'afternoon', 700),
          ('weekday', 'evening', 1000),
          ('weekend', 'morning', 700),
          ('weekend', 'afternoon', 1000),
          ('weekend', 'evening', 1500)
        `);
    }

    // Insert default settings if not exists
    const { rows: settingsRows } = await client.query(
      "SELECT COUNT(*) FROM settings"
    );
    if (parseInt(settingsRows[0].count) === 0) {
      await client.query(`
          INSERT INTO settings (key, value) VALUES
          ('booking_disabled', 'false'),
          ('disabled_reason', '')
        `);
    }

    await client.query("COMMIT");
    console.log("✓ Database initialized successfully");
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("✗ Database initialization error:", error.message);
    throw error;
  } finally {
    client.release();
  }
};
