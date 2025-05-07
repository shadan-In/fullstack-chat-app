import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

config();

// Configure Cloudinary with improved settings
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

// Verify Cloudinary configuration
try {
  console.log("Cloudinary configuration initialized");

  // Check if credentials are valid
  if (!process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET) {
    console.warn("⚠️ Cloudinary credentials may be missing or incomplete");
  }
} catch (error) {
  console.error("Error initializing Cloudinary:", error);
}

export default cloudinary;