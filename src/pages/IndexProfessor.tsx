// src/pages/IndexProfessor.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users,
  Target,
  ClipboardList,
} from 'lucide-react';
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  alunosAtivos: number;
  rotinasAtivas: number;
  meusModelos: number;
  exerciciosPersonalizados: number;
}

const IndexProfessor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    alunosAtivos: 0,
    rotinasAtivas: 0,
    meusModelos: 0,
    exerciciosPersonalizados: 0,
  });

  const carregarDados = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [
        { count: seguidores },
        { count: rotinasAtivas },
        { count: meusModelos },
        { count: exerciciosPersonalizados }
      ] = await Promise.all([
        supabase.from('alunos_professores').select('aluno_id', { count: 'exact', head: true }).eq('professor_id', user.id),
        supabase.from('rotinas').select('id', { count: 'exact', head: true }).eq('professor_id', user.id).eq('status', 'Ativa'),
        supabase.from('modelos_rotina').select('id', { count: 'exact', head: true }).eq('professor_id', user.id),
        supabase.from('exercicios').select('id', { count: 'exact', head: true }).eq('professor_id', user.id).eq('is_ativo', true)
      ]);
      
      setStats({
        alunosAtivos: seguidores || 0,
        rotinasAtivas: rotinasAtivas || 0,
        meusModelos: meusModelos || 0,
        exerciciosPersonalizados: exerciciosPersonalizados || 0,
      });

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando Inicial...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      {isDesktop && (
        <div>
          <h1 className="text-3xl font-bold">Inicial</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.user_metadata?.full_name || 'Professor(a)'}!
          </p>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercícios</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.exerciciosPersonalizados}</div>
            <p className="text-xs text-muted-foreground">
              exercícios personalizados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modelos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.meusModelos}</div>
            <p className="text-xs text-muted-foreground">
              modelos de rotina de treino
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotinas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rotinasAtivas}</div>
            <p className="text-xs text-muted-foreground">
              em andamento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.alunosAtivos}</div>
            <p className="text-xs text-muted-foreground">
              total de alunos que te seguem
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid gap-6">
        {/* Espaço para futuros componentes do dashboard */}
      </div>
      </div>
    </>
  );
};

export default IndexProfessor;