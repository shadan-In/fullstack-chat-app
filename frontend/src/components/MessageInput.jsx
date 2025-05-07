import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    // Check if file exists
    if (!file) return;

    // Validate file type - accept all common image formats
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg', 'image/bmp', 'image/tiff', 'image/svg+xml'];
    if (!validImageTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, GIF, JPG, BMP, TIFF, SVG, or WebP)");
      return;
    }

    // Check file size (reduced to 5MB to ensure reliable uploads)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB for reliable sharing");
      return;
    }

    // Show loading toast for image processing
    const toastId = toast.loading("Processing image...");

    // Use a more reliable method to process the image
    try {
      // Create an image element to get dimensions
      const img = new Image();
      img.onload = () => {
        // Create a canvas to resize the image if needed
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize large images to reduce payload size
        const maxDimension = 1200;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress the image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with reduced quality for JPG/JPEG
        let quality = 0.8;
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          quality = 0.7; // Lower quality for JPEGs to reduce size
        }

        // Get the compressed image data
        const dataUrl = canvas.toDataURL(file.type, quality);

        // Set the preview
        setImagePreview(dataUrl);
        toast.dismiss(toastId);

        // Log the compression results
        const originalSize = file.size / (1024 * 1024);
        const compressedSize = (dataUrl.length * 3) / 4 / (1024 * 1024);
        console.log(`Image compressed: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB`);
      };

      img.onerror = () => {
        toast.dismiss(toastId);
        toast.error("Error processing image");
      };

      // Load the image from the file
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.dismiss(toastId);
      toast.error("Error processing image");
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiObject) => {
    // Log the emoji data to debug
    console.log("Emoji selected:", emojiObject);

    try {
      // Make sure we have a valid emoji object
      if (!emojiObject || typeof emojiObject !== 'object') {
        console.error("Invalid emoji object received:", emojiObject);
        return;
      }

      // Get the emoji character - try different properties based on library version
      const emoji = emojiObject.emoji ||
                   (emojiObject.unified && String.fromCodePoint(parseInt(emojiObject.unified.split('-')[0], 16))) ||
                   "";

      if (!emoji) {
        console.error("Could not extract emoji from object:", emojiObject);
        return;
      }

      console.log("Adding emoji to text:", emoji);

      // Add the emoji to the text
      setText((prevText) => prevText + emoji);

      // Show a toast to confirm emoji was selected
      toast.success("Emoji added! 👍", {
        duration: 1000,
        position: "bottom-center",
      });

      // Don't close the picker on mobile to allow multiple emoji selection
      if (window.innerWidth >= 640) { // sm breakpoint
        setShowEmojiPicker(false);
      }
    } catch (error) {
      console.error("Error handling emoji selection:", error);
      toast.error("Failed to add emoji");
    }
  };

  // Close emoji picker when clicking outside
  const handleClickOutside = (e) => {
    if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
      setShowEmojiPicker(false);
    }
  };

  // Add event listener for clicking outside
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    // Show loading toast for image uploads with appropriate message
    let toastId;

    try {
      if (imagePreview) {
        // Estimate image size
        const base64Length = imagePreview.length;
        const sizeInBytes = (base64Length * 3) / 4 - (imagePreview.endsWith('==') ? 2 : imagePreview.endsWith('=') ? 1 : 0);
        const sizeInMB = sizeInBytes / (1024 * 1024);

        // Check if image is too large before attempting to send
        if (sizeInMB > 5) {
          toast.error("Image is too large (over 5MB). Please select a smaller image.");
          return;
        }

        // Show loading toast for image upload
        toastId = toast.loading("Sending image...");
        console.log("Sending image of size:", sizeInMB.toFixed(2) + "MB");
      } else if (text) {
        // Just text message
        toastId = toast.loading("Sending message...");
      }

      // Log the text being sent for debugging
      if (text) {
        console.log("Sending text message");

        // Check if text contains emojis
        const hasEmojis = /\p{Emoji}/u.test(text);
        if (hasEmojis) {
          console.log("Message contains emojis");
        }
      }

      // Send the message with a timeout
      const sendPromise = sendMessage({
        text: text,  // Don't trim to preserve emojis at the beginning/end
        image: imagePreview,
      });

      // Set a timeout to handle hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out")), 30000);
      });

      // Race the promises to handle timeouts
      await Promise.race([sendPromise, timeoutPromise]);

      // Clear form on success
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Dismiss loading toast and show success
      if (toastId) {
        toast.dismiss(toastId);
        toast.success("Message sent successfully");
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Dismiss loading toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      // Display specific error message based on the error type
      if (error.message === "Request timed out") {
        toast.error("Request timed out. The server took too long to respond.");
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.code === "ERR_NETWORK") {
        toast.error("Network error. Please check your connection and try again.");
      } else if (imagePreview) {
        toast.error("Failed to send image. Try using a smaller image or different format.");
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    }
  };

  return (
    <div className="p-2 sm:p-4 w-full">
      {imagePreview && (
        <div className="mb-2 sm:mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <div className="relative w-full">
            <input
              type="text"
              className="w-full input input-bordered rounded-lg input-sm sm:input-md pr-10"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            {/* Mobile buttons (inside input) */}
            <div className="sm:hidden absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle text-zinc-400"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                aria-label="Add emoji"
              >
                <Smile size={16} />
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-xs btn-circle
                       ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add image"
              >
                <Image size={16} />
              </button>
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          {/* Desktop emoji button */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              className="btn btn-circle"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              aria-label="Add emoji"
            >
              <Smile size={20} />
            </button>

            {/* Emoji picker */}
            {showEmojiPicker && (
              <div
                className="absolute bottom-16 right-0 z-10"
                ref={emojiPickerRef}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={300}
                  height={400}
                  previewConfig={{ showPreview: true }}
                  searchDisabled={false}
                  skinTonesDisabled={false}
                  autoFocusSearch={false}
                  emojiStyle="apple"
                  lazyLoadEmojis={false}
                  theme="light"
                />
              </div>
            )}
          </div>

          {/* Desktop image upload button */}
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add image"
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm sm:btn-md btn-circle"
          disabled={!text.trim() && !imagePreview}
          aria-label="Send message"
        >
          <Send size={18} className="sm:size-22" />
        </button>
      </form>

      {/* Mobile emoji picker (full width) */}
      {showEmojiPicker && (
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-base-300"
          ref={emojiPickerRef}
        >
          <div className="flex justify-between items-center p-2 border-b border-base-300">
            <h3 className="font-medium">Emojis</h3>
            <button
              className="btn btn-sm btn-circle"
              onClick={() => setShowEmojiPicker(false)}
            >
              <X size={16} />
            </button>
          </div>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width="100%"
            height={300}
            previewConfig={{ showPreview: true }}
            searchDisabled={false}
            skinTonesDisabled={false}
            autoFocusSearch={false}
            emojiStyle="apple"
            lazyLoadEmojis={false}
            theme="light"
          />
        </div>
      )}
    </div>
  );
};
export default MessageInput;