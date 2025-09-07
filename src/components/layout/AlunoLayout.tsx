import { Outlet } from "react-router-dom";
import React, { useEffect, useState } from "react";
import AlunoSidebar from "./AlunoSidebar";
import AlunoBottomNav from "./AlunoBottomNav";
import AlunoMobileHeader from "./AlunoMobileHeader";

const AlunoLayout = () => {
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
        <AlunoMobileHeader />
        <main className="pt-24 pb-16 p-4">
          <Outlet />
        </main>
        <AlunoBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AlunoSidebar />
      <main className="flex-1 p-6 pl-64">
        <Outlet />
      </main>
    </div>
  );
};

export default AlunoLayout;