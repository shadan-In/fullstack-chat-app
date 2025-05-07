import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  searchResults: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSearching: false,
  searchQuery: "",

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      // Use query parameters instead of URL parameters
      const res = await axiosInstance.get('/messages/chat', {
        params: { userId }
      });
      set({ messages: res.data });
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error(error.response?.data?.message || "Error loading messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      // Check if we have an image and it's not too large
      if (messageData.image) {
        const base64Length = messageData.image.length;
        const sizeInBytes = (base64Length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        // Log image size for debugging
        console.log("Image size being sent:", sizeInMB.toFixed(2) + "MB");

        // Warn if image is large
        if (sizeInMB > 3) {
          console.warn("Large image being sent, may cause issues:", sizeInMB.toFixed(2) + "MB");
        }
      }

      // Prepare message data with user ID
      const messageToSend = {
        ...messageData,
        userId: selectedUser._id
      };

      // Log the message being sent for debugging
      console.log("Sending message to user:", selectedUser._id);

      // Set longer timeout for image uploads
      const timeoutMs = messageData.image ? 60000 : 10000; // 60 seconds for images

      // Use query parameters instead of URL parameters with timeout
      const res = await axiosInstance.post('/messages/send', messageToSend, {
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Log the response for debugging
      console.log("Message sent successfully, ID:", res.data._id);

      set({ messages: [...messages, res.data] });
      return res.data; // Return the message data for confirmation
    } catch (error) {
      console.error("Error sending message:", error);

      // Provide more specific error messages
      if (error.code === 'ECONNABORTED') {
        toast.error("Request timed out. The image may be too large.");
      } else if (error.response?.status === 413) {
        toast.error("Image is too large. Please use a smaller image.");
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to send message. Please try again.");
      }

      throw error; // Re-throw to allow the component to handle it
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  searchUsers: async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      set({ searchResults: [], searchQuery: "", isSearching: false });
      return;
    }

    set({ isSearching: true, searchQuery });
    try {
      // Create a safe query parameter
      const params = new URLSearchParams();
      params.append('query', searchQuery);

      // Make the API request with the safe query string
      const res = await axiosInstance.get('/messages/search', {
        params: { query: searchQuery }
      });

      set({ searchResults: res.data });
    } catch (error) {
      console.error("Search error:", error);
      toast.error(error.response?.data?.error || "Error searching users");
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: "", isSearching: false });
  }
}));