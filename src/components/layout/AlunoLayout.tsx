import { Outlet, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";
import AlunoBottomNav from "./AlunoBottomNav";
import AlunoMobileHeader from "./AlunoMobileHeader";

interface AlunoLayoutProps {
  isFocusedMode?: boolean;
}

const AlunoLayout: React.FC<AlunoLayoutProps> = ({ isFocusedMode = false }) => {
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
        {!isFocusedMode && <AlunoMobileHeader />}
        <main className={`p-4 ${isFocusedMode ? 'pt-6' : 'pt-24 pb-16'}`}>
          <Outlet />
        </main>
        {!isFocusedMode && <AlunoBottomNav />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AlunoLayout;