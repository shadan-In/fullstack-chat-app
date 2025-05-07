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
      // Ensure text is properly encoded for emojis
      const messageToSend = {
        ...messageData,
        userId: selectedUser._id
      };

      // Log the message being sent for debugging
      console.log("Sending message:", messageToSend);

      // Use query parameters instead of URL parameters
      const res = await axiosInstance.post('/messages/send', messageToSend);

      // Log the response for debugging
      console.log("Message sent response:", res.data);

      set({ messages: [...messages, res.data] });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.error || error.response?.data?.message || "Error sending message");
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