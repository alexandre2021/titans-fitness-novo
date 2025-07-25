import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePTProfile } from "@/hooks/usePTProfile";
import { AvatarSection } from "@/components/perfil/AvatarSection";
import { PerfilTabs } from "@/components/perfil/PerfilTabs";

const PerfilPT = () => {
  const navigate = useNavigate();
  const { profile, loading } = usePTProfile();

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
            onClick={() => navigate('/index-pt')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Seu Perfil de Treinador</h1>
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
          onClick={() => navigate('/index-pt')}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Seu Perfil de Treinador</h1>
      </div>

      <AvatarSection profile={profile} onProfileUpdate={handleProfileUpdate} />
      
      <PerfilTabs profile={profile} onProfileUpdate={handleProfileUpdate} />
    </div>
  );
};

export default PerfilPT;