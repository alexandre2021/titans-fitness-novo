import { Outlet, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";
import PTSidebar from "./PTSidebar";
import PTBottomNav from "./PTBottomNav";
import PTMobileHeader from "./PTMobileHeader";
import MessagesButton from "@/components/messages/MessageButton";
import MessagesDrawer from "@/components/messages/MessageDrawer";
import { useConversas } from "@/hooks/useConversas";

interface PTLayoutProps {
  isFocusedMode?: boolean;
}

const PTLayout: React.FC<PTLayoutProps> = ({ isFocusedMode = false }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { unreadCount } = useConversas();

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {!isFocusedMode && <PTMobileHeader />}
        <main className={`p-4 ${isFocusedMode ? 'pt-6' : 'pt-24 pb-16'}`}>
          <Outlet />
        </main>
        {!isFocusedMode && <PTBottomNav />}
        {!isFocusedMode && (
          <>
            <MessagesButton 
              onClick={() => setIsDrawerOpen(true)} 
              unreadCount={unreadCount}
              position="bottom-left"
            />
            <MessagesDrawer 
              isOpen={isDrawerOpen} 
              onClose={() => setIsDrawerOpen(false)} 
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isFocusedMode && <PTSidebar />}
      <main className={`flex-1 p-6 ${!isFocusedMode ? 'pl-72' : ''}`}>
        <Outlet />
      </main>
      {!isFocusedMode && (
        <>
          <MessagesButton 
            onClick={() => setIsDrawerOpen(true)} 
            unreadCount={unreadCount}
            position="top-right"
          />
          <MessagesDrawer 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)} 
          />
        </>
      )}
    </div>
  );
};

export default PTLayout;