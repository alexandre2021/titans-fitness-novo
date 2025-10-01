import { Outlet } from "react-router-dom";
import React, { useEffect, useState } from "react";
import AlunoBottomNav from "./AlunoBottomNav";
import AlunoMobileHeader from "./AlunoMobileHeader";
import MessagesButton from "@/components/messages/MessageButton";
import MessagesDrawer from "@/components/messages/MessageDrawer";
import { useConversas } from "@/hooks/useConversas";

interface AlunoLayoutProps {
  isFocusedMode?: boolean;
}

const AlunoLayout: React.FC<AlunoLayoutProps> = ({ isFocusedMode = false }) => {
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
        {!isFocusedMode && <AlunoMobileHeader />}
        <main className={`p-4 ${isFocusedMode ? 'pt-6' : 'pt-24 pb-16'}`}>
          <Outlet />
        </main>
        {!isFocusedMode && <AlunoBottomNav />}
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
      <main className="p-6">
        <Outlet />
      </main>
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
    </div>
  );
};

export default AlunoLayout;