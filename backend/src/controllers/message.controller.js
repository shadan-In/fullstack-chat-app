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

    // Check if text contains emojis
    if (text) {
      try {
        const hasEmojis = /\p{Emoji}/u.test(text);
        if (hasEmojis) {
          console.log("Message contains emojis");
        }
      } catch (error) {
        console.error("Error checking for emojis:", error);
      }
    }

    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      try {
        // Check if the image data is valid base64
        if (!image.includes('base64')) {
          return res.status(400).json({ error: "Invalid image data format" });
        }

        // Check if the image data is too large
        const base64Length = image.length;
        const sizeInBytes = (base64Length * 3) / 4 - (image.endsWith('==') ? 2 : image.endsWith('=') ? 1 : 0);
        const sizeInMB = sizeInBytes / (1024 * 1024);

        console.log("Image size in MB:", sizeInMB.toFixed(2));

        // Limit image size to 8MB for reliability
        if (sizeInMB > 8) {
          return res.status(400).json({ error: "Image size must be less than 8MB. Please compress the image." });
        }

        // Set up Cloudinary upload options with better reliability
        const uploadOptions = {
          folder: "chat_images",
          resource_type: "image", // Explicitly set as image
          format: "auto", // Auto-detect best format
          quality: "auto", // Auto-optimize quality
          timeout: 60000, // 60 second timeout
        };

        // Add optimization based on image size
        if (sizeInMB > 2) {
          uploadOptions.transformation = [
            { width: 1200, height: 1200, crop: "limit" }, // Limit dimensions
            { quality: 80 }, // Fixed quality for better reliability
          ];
        } else {
          uploadOptions.transformation = [
            { width: 1600, height: 1600, crop: "limit" }, // Limit dimensions
            { quality: "auto:good" }, // Auto quality for smaller images
          ];
        }

        console.log("Uploading image to Cloudinary...");

        // Upload to Cloudinary with optimization settings and proper error handling
        const uploadResponse = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload(image, uploadOptions, (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(error);
            } else {
              resolve(result);
            }
          });
        });

        console.log("Cloudinary upload successful");
        imageUrl = uploadResponse.secure_url;
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);

        // Provide more specific error messages based on the error
        if (cloudinaryError.message && cloudinaryError.message.includes("Invalid image file")) {
          return res.status(400).json({ error: "Invalid image format. Please try a different image." });
        } else if (cloudinaryError.message && cloudinaryError.message.includes("timeout")) {
          return res.status(400).json({ error: "Upload timed out. Please try a smaller image." });
        } else if (cloudinaryError.http_code === 413) {
          return res.status(400).json({ error: "Image is too large. Please use a smaller image." });
        } else {
          return res.status(400).json({ error: "Error uploading image. Please try again with a different image." });
        }
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