// src/pages/PerfilAluno.tsx

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAlunoProfile } from "@/hooks/useAlunoProfile";
import { AlunoAvatarSection } from "@/components/perfil/AlunoAvatarSection";
import { AlunoPerfilTabs } from "@/components/perfil/AlunoPerfilTabs";

const PerfilAluno = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAlunoProfile();

  const handleProfileUpdate = () => {
    // Force re-fetch of profile data by reloading the hook
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-32 rounded bg-muted animate-pulse" />
        <div className="h-96 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/index-aluno')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-normal">Meu Perfil</h1>
        </div>
        <p className="text-muted-foreground">Erro ao carregar perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/index-aluno')}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-normal">Meu Perfil</h1>
      </div>

      <AlunoAvatarSection profile={profile} onProfileUpdate={handleProfileUpdate} />
      
      <AlunoPerfilTabs profile={profile} onProfileUpdate={handleProfileUpdate} />
    </div>
  );
};

export default PerfilAluno;