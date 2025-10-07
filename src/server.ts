import "reflect-metadata";
import app from "./app";
import { AppDataSource } from "./db/data.source";

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log("✓ Database connected successfully");

    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Admin creation endpoint: POST /api/auth/create-admin`);
      console.log(
        `✓ Restricted to IP: ${process.env.ADMIN_IP || "65.0.11.156"}`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  await AppDataSource.destroy();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server...");
  await AppDataSource.destroy();
  process.exit(0);
});

startServer();
