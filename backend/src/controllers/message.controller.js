import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Get all users except the logged in user
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    // Get the latest message for each user
    const usersWithLatestMessage = await Promise.all(
      users.map(async (user) => {
        // Find the latest message between the logged in user and this user
        const latestMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        }).sort({ createdAt: -1 });

        // Convert Mongoose document to plain object
        const userObj = user.toObject();

        // Add latest message timestamp
        return {
          ...userObj,
          lastMessageAt: latestMessage ? latestMessage.createdAt : null,
        };
      })
    );

    // Sort users by latest message time (most recent first)
    const sortedUsers = usersWithLatestMessage.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    res.status(200).json(sortedUsers);
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
        // Validate image data format more strictly
        if (!image.startsWith('data:image/')) {
          console.error("Invalid image data format - missing data:image prefix");
          return res.status(400).json({ error: "Invalid image data format" });
        }

        if (!image.includes('base64,')) {
          console.error("Invalid image data format - missing base64 encoding");
          return res.status(400).json({ error: "Invalid image data format" });
        }

        // Check if the image data is too large
        const base64Length = image.length;
        const sizeInBytes = (base64Length * 3) / 4 - (image.endsWith('==') ? 2 : image.endsWith('=') ? 1 : 0);
        const sizeInMB = sizeInBytes / (1024 * 1024);

        console.log("Image size in MB:", sizeInMB.toFixed(2));

        // Limit image size to 3MB for guaranteed reliability
        if (sizeInMB > 3) {
          console.error("Image too large:", sizeInMB.toFixed(2) + "MB");
          return res.status(400).json({ error: "Image size must be less than 3MB. Please compress the image." });
        }

        // Extract image format from data URL
        const formatMatch = image.match(/^data:image\/(\w+);base64,/);
        if (!formatMatch) {
          console.error("Could not determine image format");
          return res.status(400).json({ error: "Invalid image format" });
        }

        const imageFormat = formatMatch[1].toLowerCase();
        console.log("Image format:", imageFormat);

        // Only allow jpeg, jpg, and png for reliability
        if (!['jpeg', 'jpg', 'png'].includes(imageFormat)) {
          console.error("Unsupported image format:", imageFormat);
          return res.status(400).json({ error: "Only JPEG and PNG images are supported" });
        }

        // Set up Cloudinary upload options with maximum reliability
        const uploadOptions = {
          folder: "chat_images",
          resource_type: "image", // Explicitly set as image
          format: "jpg", // Force JPEG format for consistency
          quality: 80, // Fixed quality for reliability
          timeout: 30000, // 30 second timeout (shorter is better for reliability)
          use_filename: false, // Don't use original filename
          unique_filename: true, // Ensure unique filenames
          overwrite: false, // Don't overwrite existing files
        };

        // Simple transformation to ensure consistent results
        uploadOptions.transformation = [
          { width: 1000, height: 1000, crop: "limit" }, // Reasonable size limit
          { quality: 80 }, // Fixed quality
        ];

        console.log("Uploading image to Cloudinary...");

        // Extract the base64 data without the prefix
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        // Upload to Cloudinary with optimization settings and proper error handling
        try {
          const uploadResponse = await new Promise((resolve, reject) => {
            // Set a timeout for the upload
            const uploadTimeout = setTimeout(() => {
              reject(new Error("Upload timed out after 30 seconds"));
            }, 30000);

            cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
              clearTimeout(uploadTimeout);

              if (error) {
                console.error("Cloudinary upload error:", error);
                reject(error);
              } else if (!result || !result.secure_url) {
                reject(new Error("Invalid response from Cloudinary"));
              } else {
                resolve(result);
              }
            }).end(Buffer.from(base64Data, 'base64'));
          });

          console.log("Cloudinary upload successful");
          imageUrl = uploadResponse.secure_url;
        } catch (uploadError) {
          console.error("Error during upload stream:", uploadError);
          throw uploadError; // Re-throw to be caught by the outer catch block
        }
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