import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-4 sm:p-8 md:p-16 bg-base-100/50">
      <div className="max-w-md text-center space-y-4 sm:space-y-6">
        {/* Icon Display */}
        <div className="flex justify-center gap-4 mb-2 sm:mb-4">
          <div className="relative">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center
             justify-center animate-bounce"
            >
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Welcome Text */}
        <h2 className="text-xl sm:text-2xl font-bold">Welcome to Link up!</h2>
        <p className="text-sm sm:text-base text-base-content/60">
          Select a conversation from the sidebar to start chatting
        </p>

        {/* Mobile instruction */}
        <p className="text-xs sm:text-sm text-base-content/40 block sm:hidden mt-4">
          Tap on a user's avatar in the sidebar to start a conversation
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;