import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, searchUsers, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

// Simple routes without parameters
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/search", protectRoute, searchUsers);

// Use query parameters instead of URL parameters to avoid path-to-regexp issues
router.get("/chat", protectRoute, (req, res, next) => {
  try {
    // Get userId from query parameter instead of URL parameter
    const userId = req.query.userId;
    if (!userId || userId.length < 1) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    // Store userId in req.params to maintain compatibility with controller
    req.params = { userId };
    next();
  } catch (error) {
    next(error);
  }
}, getMessages);

router.post("/send", protectRoute, (req, res, next) => {
  try {
    // Get userId from query parameter or body
    const userId = req.query.userId || req.body.userId;
    if (!userId || userId.length < 1) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    // Store userId in req.params to maintain compatibility with controller
    req.params = { userId };
    next();
  } catch (error) {
    next(error);
  }
}, sendMessage);

export default router;