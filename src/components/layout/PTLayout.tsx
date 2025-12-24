import { Outlet, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";
import PTSidebar from "./PTSidebar";
import PTBottomNav from "./PTBottomNav";
import PTMobileHeader from "./PTMobileHeader";

interface PTLayoutProps {
  isFocusedMode?: boolean;
}

const PTLayout: React.FC<PTLayoutProps> = ({ isFocusedMode = false }) => {
  const [isMobile, setIsMobile] = useState(false);

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
        <main className={`px-4 pb-16 ${isFocusedMode ? 'pt-6' : ''}`}>
          <Outlet />
        </main>
        {!isFocusedMode && <PTBottomNav />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isFocusedMode && <PTSidebar />}
      <main className={`flex-1 p-6 ${!isFocusedMode ? 'pl-72' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default PTLayout;