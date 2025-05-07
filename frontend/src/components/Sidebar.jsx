import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Search, Users, X } from "lucide-react";


const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    searchUsers,
    clearSearch,
    searchResults,
    isSearching,
    searchQuery
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInputValue(value);

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      if (value.trim()) {
        searchUsers(value);
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchInputValue("");
    clearSearch();
  };

  // Determine which users to display based on search and online filter
  const displayUsers = searchQuery ? searchResults : (
    showOnlineOnly ? users.filter((user) => onlineUsers.includes(user._id)) : users
  );

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-16 sm:w-20 md:w-24 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-3 sm:p-5">
        <div className="flex items-center gap-2">
          <Users className="size-5 sm:size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        {/* Mobile search button */}
        <div className="mt-3 lg:hidden flex justify-center">
          <button
            onClick={() => document.getElementById('mobile-search-modal').showModal()}
            className="btn btn-sm btn-circle"
          >
            <Search size={16} />
          </button>
        </div>

        {/* Mobile search modal */}
        <dialog id="mobile-search-modal" className="modal modal-bottom sm:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Search Users</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchInputValue}
                onChange={handleSearchChange}
                className="input input-bordered w-full pr-8"
                autoFocus
              />
              {searchInputValue ? (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              ) : (
                <Search size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
              )}
            </div>
            {isSearching && (
              <div className="text-sm text-center mt-2 text-gray-500">Searching...</div>
            )}
            {searchQuery && (
              <div className="mt-4 max-h-60 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="text-center text-zinc-500 py-2">No users found</div>
                ) : (
                  searchResults.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => {
                        setSelectedUser(user);
                        document.getElementById('mobile-search-modal').close();
                        handleClearSearch();
                      }}
                      className="w-full p-2 flex items-center gap-3 hover:bg-base-200 rounded-lg"
                    >
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.name}
                        className="size-10 object-cover rounded-full"
                      />
                      <div className="text-left">
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-zinc-400">
                          {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            <div className="modal-action">
              <form method="dialog">
                <button className="btn">Close</button>
              </form>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>

        {/* Desktop search bar */}
        <div className="mt-3 relative hidden lg:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchInputValue}
              onChange={handleSearchChange}
              className="input input-sm input-bordered w-full pr-8"
            />
            {searchInputValue ? (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            ) : (
              <Search size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
            )}
          </div>
          {isSearching && (
            <div className="text-xs text-center mt-1 text-gray-500">Searching...</div>
          )}
        </div>

        {/* Online filter toggle */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
              disabled={!!searchQuery}
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-2 sm:py-3">
        {searchQuery && displayUsers.length === 0 && !isSearching && (
          <div className="text-center text-zinc-500 py-4">No users found</div>
        )}

        {displayUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-2 sm:p-3 flex items-center gap-2 sm:gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-10 sm:size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span
                  className="absolute bottom-0 right-0 size-2 sm:size-3 bg-green-500
                  rounded-full ring-2 ring-zinc-900"
                />
              )}
            </div>

            {/* User info - only visible on larger screens */}
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-zinc-400">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {!searchQuery && displayUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">
            {showOnlineOnly ? "No online users" : "No users available"}
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;