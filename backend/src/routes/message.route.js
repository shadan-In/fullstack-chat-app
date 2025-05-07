import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, searchUsers, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

// Define routes with explicit parameter names and validation middleware
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/search", protectRoute, searchUsers);

// Use a safer approach for routes with parameters
router.get("/chat/:userId", protectRoute, (req, res, next) => {
  try {
    // Validate userId parameter
    const userId = req.params.userId;
    if (!userId || userId.length < 1) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    next();
  } catch (error) {
    next(error);
  }
}, getMessages);

router.post("/send/:userId", protectRoute, (req, res, next) => {
  try {
    // Validate userId parameter
    const userId = req.params.userId;
    if (!userId || userId.length < 1) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    next();
  } catch (error) {
    next(error);
  }
}, sendMessage);

export default router;