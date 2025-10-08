import { useState, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { AvatarSection } from "@/components/perfil/AvatarSection";
import { PerfilTabs } from "@/components/perfil/PerfilTabs";
import { useMediaQuery } from "@/hooks/use-media-query";

type PTProfile = Tables<'professores'>;

const PerfilPT = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PTProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professores')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Erro ao buscar perfil do PT:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, fetchTrigger]);

  const handleProfileUpdate = () => {
    // Trigger a re-fetch by updating the state
    setFetchTrigger(c => c + 1);
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
            onClick={() => navigate('/index-professor')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-normal">Perfil de treinador</h1>
        </div>
        <p className="text-muted-foreground">Erro ao carregar perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isDesktop && (
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
      )}

      <AvatarSection profile={profile} onProfileUpdate={handleProfileUpdate} userType="professor" />
      
      <PerfilTabs profile={profile} onProfileUpdate={handleProfileUpdate} />
    </div>
  );
};

export default PerfilPT;