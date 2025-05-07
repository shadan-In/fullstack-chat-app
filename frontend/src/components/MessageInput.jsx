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

    // Check file size (increased to 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      toast.error("Image size must be less than 20MB");
      return;
    }

    // Show loading toast for large images
    let toastId;
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toastId = toast.loading("Processing large image...");
    }

    // Read and preview the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      if (toastId) {
        toast.dismiss(toastId);
      }
    };
    reader.onerror = () => {
      if (toastId) {
        toast.dismiss(toastId);
      }
      toast.error("Error reading file");
    };
    reader.readAsDataURL(file);
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
    if (imagePreview) {
      // Estimate image size
      const base64Length = imagePreview.length;
      const sizeInBytes = (base64Length * 3) / 4 - (imagePreview.endsWith('==') ? 2 : imagePreview.endsWith('=') ? 1 : 0);
      const sizeInMB = sizeInBytes / (1024 * 1024);

      // Show different messages based on image size
      if (sizeInMB > 10) {
        toastId = toast.loading("Uploading large image... This may take a moment");
      } else if (sizeInMB > 5) {
        toastId = toast.loading("Uploading image...");
      } else {
        toastId = toast.loading("Sending message...");
      }

      console.log("Sending image of size:", sizeInMB.toFixed(2) + "MB");
    }

    try {
      // Log the text being sent for debugging
      console.log("Sending text message:", text);

      // Check if text contains emojis and log them
      const hasEmojis = /\p{Emoji}/u.test(text);
      if (hasEmojis) {
        console.log("Message contains emojis");
      }

      // Send the message
      await sendMessage({
        text: text,  // Don't trim to preserve emojis at the beginning/end
        image: imagePreview,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Dismiss loading toast if it exists
      if (toastId) {
        toast.dismiss(toastId);
        toast.success("Message sent successfully");
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Show error toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      // Display specific error message if available
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (imagePreview && imagePreview.length > 1000000) { // If it's a large image
        toast.error("Failed to send large image. Try reducing the image size or using a different format.");
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