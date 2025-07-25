import { Outlet } from "react-router-dom";
import React, { useEffect, useState } from "react";
import PTSidebar from "./PTSidebar";
import PTBottomNav from "./PTBottomNav";
import PTMobileHeader from "./PTMobileHeader";

const PTLayout = () => {
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
        <PTMobileHeader />
        <main className="pb-16 p-4">
          <Outlet />
        </main>
        <PTBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <PTSidebar />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default PTLayout;