import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2 sm:gap-8">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2.5 hover:opacity-80 transition-all">
              <div className="size-8 sm:size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <h1 className="text-base sm:text-lg font-bold">Link up</h1>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to={"/settings"}
              className="btn btn-sm btn-circle sm:btn-sm sm:gap-2 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                <Link
                  to={"/profile"}
                  className="btn btn-sm btn-circle sm:btn-sm sm:gap-2"
                  aria-label="Profile"
                >
                  <User className="size-4 sm:size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button
                  className="btn btn-sm btn-circle sm:flex sm:gap-2 sm:btn-sm items-center"
                  onClick={logout}
                  aria-label="Logout"
                >
                  <LogOut className="size-4 sm:size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;