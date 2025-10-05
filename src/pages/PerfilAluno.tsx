// src/pages/PerfilAluno.tsx

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { AvatarSection } from "@/components/perfil/AvatarSection";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AlunoPerfilTabs } from "@/components/perfil/AlunoPerfilTabs";

type AlunoProfile = Tables<'alunos'>;

const PerfilAluno = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<AlunoProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Erro ao buscar perfil do Aluno:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, fetchTrigger]);

  const handleProfileUpdate = () => {
    setFetchTrigger(c => c + 1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Carregando perfil...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Erro ao carregar perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isDesktop && (
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
      )}
      <AvatarSection profile={profile} onProfileUpdate={handleProfileUpdate} userType="aluno" />
      
      <AlunoPerfilTabs profile={profile} onProfileUpdate={handleProfileUpdate} />
    </div>
  );
};

export default PerfilAluno;