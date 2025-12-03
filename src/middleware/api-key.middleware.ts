import { Request, Response, NextFunction } from "express";
import { AppError } from "./error.middleware";

export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"];
  const validApiKey = process.env.API_SECRET_KEY;

  if (!validApiKey) {
    console.warn("API_SECRET_KEY is not defined in environment variables");
    return next(new AppError("Internal Server Error: API Key not configured", 500));
  }

  if (!apiKey || apiKey !== validApiKey) {
    return next(new AppError("Invalid or missing API Key", 401));
  }

  // Ensure CORS headers are set for this response to allow any origin
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-api-key");

  next();
};
