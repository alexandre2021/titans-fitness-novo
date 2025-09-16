// src/components/layout/AlunoLayout.tsx (Exemplo hipotético)
import { Outlet } from "react-router-dom";
import React, { useEffect, useState } from "react";
import AlunoBottomNav from "./AlunoBottomNav"; // Componente hipotético
import AlunoMobileHeader from "./AlunoMobileHeader"; // Componente hipotético

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

  // Para o aluno, o layout focado se aplica principalmente no mobile.
  // O layout desktop do aluno pode não ter um sidebar, então o ajuste é mais simples.
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

  // Layout desktop do aluno (pode não ter sidebar, então apenas renderiza o conteúdo)
  return <main className="p-6"><Outlet /></main>;
};

export default AlunoLayout;