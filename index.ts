import express, { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { initDatabase } from "./src/db/init_db.js";
import { DB } from "./src/db/db.js";

const app = express();
app.use(express.json());
const pool = DB;
// Configuration
const config = {
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  PORT: process.env.PORT || 3001,
  ADMIN_IP: process.env.ADMIN_IP || "65.0.11.156",
  BCRYPT_ROUNDS: 10,
  MIN_BOOKING_HOURS: 1,
  CANCEL_HOURS_THRESHOLD: 24,
};

// Middleware
const authenticate = (req: any, res: any, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, config.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const restrictToIP = (allowedIP) => (req, res, next) => {
  const clientIP = (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    ""
  )
    .trim()
    .replace("::ffff:", "");

  if (clientIP !== allowedIP) {
    return res
      .status(403)
      .json({ error: "Access denied from this IP address" });
  }
  next();
};

// Optimized helper functions
const calculatePrice = async (startTime, endTime, date) => {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const dateObj = new Date(date);

  const dayOfWeek = dateObj.getDay();
  const dayType = dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday";

  const hours = (endDate - startDate) / (1000 * 60 * 60);
  const startHour = startDate.getHours();

  let timeSlot = "evening";
  if (startHour >= 6 && startHour < 12) timeSlot = "morning";
  else if (startHour >= 12 && startHour < 18) timeSlot = "afternoon";

  const { rows } = await pool.query(
    "SELECT price FROM pricing WHERE day_type = $1 AND time_slot = $2",
    [dayType, timeSlot]
  );

  return parseFloat(rows[0].price) * hours;
};

const checkBookingOverlap = async (date, startTime, endTime, client = pool) => {
  const { rows } = await client.query(
    `SELECT id FROM bookings 
     WHERE status = 'active' 
     AND date = $1 
     AND start_time < $2 
     AND end_time > $3`,
    [date, endTime, startTime]
  );
  return rows.length > 0;
};

const formatPricing = (rows) => {
  const pricing = { weekday: {}, weekend: {} };
  rows.forEach((row) => {
    pricing[row.day_type][row.time_slot] = parseFloat(row.price);
  });
  return pricing;
};

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const { rows: existingUsers } = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const { rows } = await pool.query(
      "INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [email, hashedPassword, name, "user"]
    );

    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post(
  "/api/auth/create-admin",
  restrictToIP(config.ADMIN_IP),
  async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const { rows: existingUsers } = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
      const { rows } = await pool.query(
        "INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
        [email, hashedPassword, name, "admin"]
      );

      res.status(201).json({
        message: "Admin created successfully",
        user: rows[0],
      });
    } catch (error) {
      console.error("Admin creation error:", error);
      res.status(500).json({ error: "Admin creation failed" });
    }
  }
);

// Pricing Routes
app.get("/api/pricing", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM pricing ORDER BY day_type, time_slot"
    );
    res.json(formatPricing(rows));
  } catch (error) {
    console.error("Fetch pricing error:", error);
    res.status(500).json({ error: "Failed to fetch pricing" });
  }
});

app.put("/api/admin/pricing", authenticate, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { weekday, weekend } = req.body;

    await client.query("BEGIN");

    const updates = [];
    for (const [dayType, slots] of Object.entries({ weekday, weekend })) {
      if (slots) {
        for (const [timeSlot, price] of Object.entries(slots)) {
          updates.push(
            client.query(
              "UPDATE pricing SET price = $1 WHERE day_type = $2 AND time_slot = $3",
              [price, dayType, timeSlot]
            )
          );
        }
      }
    }

    await Promise.all(updates);
    await client.query("COMMIT");

    const { rows } = await pool.query(
      "SELECT * FROM pricing ORDER BY day_type, time_slot"
    );

    res.json({ message: "Pricing updated", pricing: formatPricing(rows) });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update pricing error:", error);
    res.status(500).json({ error: "Failed to update pricing" });
  } finally {
    client.release();
  }
});

// Announcements Routes
app.get("/api/announcements", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM announcements ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Fetch announcements error:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.post(
  "/api/admin/announcements",
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: "Title and message required" });
      }

      const { rows } = await pool.query(
        "INSERT INTO announcements (title, message) VALUES ($1, $2) RETURNING *",
        [title, message]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      console.error("Create announcement error:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  }
);

app.delete(
  "/api/admin/announcements/:id",
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        "DELETE FROM announcements WHERE id = $1 RETURNING id",
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      res.json({ message: "Announcement deleted" });
    } catch (error) {
      console.error("Delete announcement error:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  }
);

// Settings Routes
app.get("/api/settings", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM settings");
    const settings = {};
    rows.forEach((row) => {
      settings[row.key] =
        row.key === "booking_disabled" ? row.value === "true" : row.value;
    });
    res.json(settings);
  } catch (error) {
    console.error("Fetch settings error:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.put(
  "/api/admin/settings/disable-bookings",
  authenticate,
  isAdmin,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { disabled, reason } = req.body;

      await client.query("BEGIN");

      await client.query("UPDATE settings SET value = $1 WHERE key = $2", [
        String(disabled),
        "booking_disabled",
      ]);

      await client.query("UPDATE settings SET value = $1 WHERE key = $2", [
        reason || "",
        "disabled_reason",
      ]);

      await client.query("COMMIT");

      res.json({
        message: "Settings updated",
        bookingDisabled: disabled,
        disabledReason: reason,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Update settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    } finally {
      client.release();
    }
  }
);

// Booking Routes
app.post("/api/bookings", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (req.user.role !== "admin") {
      const { rows } = await client.query(
        "SELECT value FROM settings WHERE key = $1",
        ["booking_disabled"]
      );

      if (rows[0]?.value === "true") {
        const { rows: reasonRows } = await client.query(
          "SELECT value FROM settings WHERE key = $1",
          ["disabled_reason"]
        );
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "Bookings are currently disabled",
          reason: reasonRows[0]?.value || "",
        });
      }
    }

    const { date, startTime, endTime } = req.body;

    if (!date || !startTime || !endTime) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = (end - start) / (1000 * 60 * 60);

    if (hours < config.MIN_BOOKING_HOURS) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Minimum booking duration is ${config.MIN_BOOKING_HOURS} hour(s)`,
      });
    }

    const hasOverlap = await checkBookingOverlap(
      date,
      startTime,
      endTime,
      client
    );
    if (hasOverlap) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Time slot already booked" });
    }

    const price = await calculatePrice(startTime, endTime, date);
    const { rows } = await client.query(
      `INSERT INTO bookings (user_id, date, start_time, end_time, price, status) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, date, startTime, endTime, price, "active"]
    );

    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Booking error:", error);
    res.status(500).json({ error: "Booking failed" });
  } finally {
    client.release();
  }
});

app.get("/api/bookings", authenticate, async (req, res) => {
  try {
    const isAdminUser = req.user.role === "admin";
    const query = `
      SELECT b.*, u.name as user_name, u.email as user_email 
      FROM bookings b 
      JOIN users u ON b.user_id = u.id 
      ${isAdminUser ? "" : "WHERE b.user_id = $1"}
      ORDER BY b.created_at DESC
    `;
    const params = isAdminUser ? [] : [req.user.id];

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.delete("/api/bookings/:id", authenticate, async (req, res) => {
  try {
    const { rows: bookingRows } = await pool.query(
      "SELECT * FROM bookings WHERE id = $1",
      [req.params.id]
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingRows[0];

    if (req.user.role !== "admin" && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const hoursDiff =
      (new Date(booking.start_time) - new Date()) / (1000 * 60 * 60);

    if (
      req.user.role !== "admin" &&
      hoursDiff < config.CANCEL_HOURS_THRESHOLD
    ) {
      return res.status(400).json({
        error: `Cannot cancel booking within ${config.CANCEL_HOURS_THRESHOLD} hours`,
      });
    }

    const { rows } = await pool.query(
      "UPDATE bookings SET status = $1, cancelled_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      ["cancelled", req.params.id]
    );

    res.json({ message: "Booking cancelled", booking: rows[0] });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

app.post("/api/admin/bookings", authenticate, isAdmin, async (req, res) => {
  try {
    const { userId, date, startTime, endTime } = req.body;

    if (!userId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const price = await calculatePrice(startTime, endTime, date);
    const { rows } = await pool.query(
      `INSERT INTO bookings (user_id, date, start_time, end_time, price, status, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, date, startTime, endTime, price, "active", "admin"]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Admin booking error:", error);
    res.status(500).json({ error: "Booking failed" });
  }
});

// Reviews Routes
app.get("/api/reviews", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error("Fetch reviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

app.post("/api/reviews", authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const { rows } = await pool.query(
      "INSERT INTO reviews (user_id, rating, comment) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, rating, comment || ""]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

// Stats Routes (Admin)
app.get("/api/admin/stats", authenticate, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    const [
      activeBookings,
      dailyEarnings,
      weeklyEarnings,
      monthlyEarnings,
      totalUsers,
      totalBookings,
      cancelledBookings,
    ] = await Promise.all([
      pool.query(
        "SELECT COUNT(*) FROM bookings WHERE status = $1 AND start_time > $2",
        ["active", now]
      ),
      pool.query(
        "SELECT COALESCE(SUM(price), 0) as total FROM bookings WHERE status = $1 AND DATE(created_at) = $2",
        ["active", today]
      ),
      pool.query(
        "SELECT COALESCE(SUM(price), 0) as total FROM bookings WHERE status = $1 AND created_at > $2",
        ["active", weekAgo]
      ),
      pool.query(
        "SELECT COALESCE(SUM(price), 0) as total FROM bookings WHERE status = $1 AND created_at > $2",
        ["active", monthAgo]
      ),
      pool.query("SELECT COUNT(*) FROM users WHERE role = $1", ["user"]),
      pool.query("SELECT COUNT(*) FROM bookings"),
      pool.query("SELECT COUNT(*) FROM bookings WHERE status = $1", [
        "cancelled",
      ]),
    ]);

    res.json({
      activeBookings: parseInt(activeBookings.rows[0].count),
      dailyEarnings: parseFloat(dailyEarnings.rows[0].total),
      weeklyEarnings: parseFloat(weeklyEarnings.rows[0].total),
      monthlyEarnings: parseFloat(monthlyEarnings.rows[0].total),
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalBookings: parseInt(totalBookings.rows[0].count),
      cancelledBookings: parseInt(cancelledBookings.rows[0].count),
    });
  } catch (error) {
    console.error("Fetch stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  await pool.end();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(config.PORT, () => {
      console.log(`✓ Server running on port ${config.PORT}`);
      console.log(`✓ Admin creation endpoint: POST /api/auth/create-admin`);
      console.log(`✓ Restricted to IP: ${config.ADMIN_IP}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
