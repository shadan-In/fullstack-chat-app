import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    // Get the query parameter safely
    const query = req.query.query || '';
    const loggedInUserId = req.user._id;

    if (!query.trim()) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Sanitize the query to prevent regex injection
    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Search for users whose fullName contains the query (case insensitive)
    const users = await User.find({
      fullName: { $regex: sanitizedQuery, $options: "i" },
      _id: { $ne: loggedInUserId } // Exclude the logged-in user
    }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    // Get the user ID from params safely
    const userToChatId = req.params.userId;

    if (!userToChatId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const myId = req.user._id;

    // Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userToChatId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.userId;

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required" });
    }

    // Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ error: "Invalid receiver ID format" });
    }

    // Validate that at least text or image is provided
    if (!text && !image) {
      return res.status(400).json({ error: "Text or image is required" });
    }

    // Log the received text for debugging
    console.log("Received message text:", text);

    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      try {
        // Check if the image data is too large (>10MB)
        const base64Length = image.length;
        const sizeInBytes = (base64Length * 3) / 4 - (image.endsWith('==') ? 2 : image.endsWith('=') ? 1 : 0);
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > 10) {
          return res.status(400).json({ error: "Image size must be less than 10MB" });
        }

        // Upload to Cloudinary with optimization settings
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "chat_images",
          resource_type: "image",
          format: "auto", // Auto-detect best format
          quality: "auto", // Auto-optimize quality
          transformation: [
            { width: 1200, crop: "limit" }, // Limit max width while maintaining aspect ratio
          ],
        });

        imageUrl = uploadResponse.secure_url;
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        return res.status(400).json({ error: "Error uploading image. Please try a different image or format." });
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};