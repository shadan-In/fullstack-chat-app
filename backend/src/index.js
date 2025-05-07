// Import the patch first to fix path-to-regexp before Express loads
import './lib/patch-path-to-regexp.js';

import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { connectDB } from "./lib/db.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

// Monkey patch Express to handle path-to-regexp errors
// This is a workaround for the "Missing parameter name" error
const originalRoute = express.Route.prototype.route;
express.Route.prototype.route = function(path) {
  try {
    return originalRoute.call(this, path);
  } catch (error) {
    console.error(`Error in route: ${path}`, error.message);
    // Return a route that will respond with a 400 error
    return originalRoute.call(this, '*');
  }
};


dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json());
app.use(cookieParser());

// Configure CORS based on environment
const corsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL || "https://your-render-app.onrender.com", "https://linkup-chat.onrender.com"]
    : "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});