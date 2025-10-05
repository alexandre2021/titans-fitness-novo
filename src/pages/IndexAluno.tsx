// src/pages/IndexAluno.tsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAlunoProfile } from '@/hooks/useAlunoProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dumbbell, BarChart3, User, CalendarCheck, Target, TrendingUp, Shield, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface professor {
  nome_completo: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
}

const IndexAluno = () => {
  const { user } = useAuth();
  const { profile: alunoProfile, loading: alunoLoading } = useAlunoProfile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [treinos7dias, setTreinos7dias] = useState(0);
  const [stats, setStats] = useState({ rotinas: 0, avaliacoes: 0, professores: 0 });

  const ModoExecucaoBadge = ({ modo }: { modo: 'professor' | 'aluno' | null }) => {
    if (!modo) return null;
  
    const isAssistido = modo === 'professor';
    const Icon = isAssistido ? Shield : User;
    const text = isAssistido ? 'Modo Assistido' : 'Modo Aluno';
    const colorClasses = 'bg-slate-200 text-slate-800 border-slate-300';
  
    return (
      <Badge variant="outline" className={`text-xs ${colorClasses} flex items-center w-fit`}>
        <Icon className="h-3 w-3 mr-1" />
        <span>{text}</span>
      </Badge>
    );
  };

  const formatDateForBadge = useCallback((dateString: string | null): string => {
    if (!dateString) return '';
    try {
      // Adiciona T00:00:00 para evitar problemas de fuso horário que podem mudar o dia
      const date = new Date(dateString + 'T00:00:00');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return ` em ${day}/${month}`;
    } catch (error) {
      console.error("Erro ao formatar data para badge:", error);
      return '';
    }
  }, []);

  const getStatusBadge = useCallback((status: string, dataExecucao: string | null) => {
    const dateSuffix = formatDateForBadge(dataExecucao);
    switch (status) {
      case 'em_andamento':
        return { texto: 'Em Andamento', cor: 'bg-yellow-100 text-yellow-800' };
      case 'pausada':
        return { texto: `Pausada${dateSuffix}`, cor: 'bg-orange-100 text-orange-800' };
      case 'concluida':
        return { texto: `Concluída${dateSuffix}`, cor: 'bg-green-100 text-green-800' };
      default:
        return { texto: status, cor: 'bg-gray-100 text-gray-800' };
    }
  }, [formatDateForBadge]);

  useEffect(() => {
    if (!user || !alunoProfile) return;

    const fetchData = async () => {
      try {
        // Fetch active routine
        const { data: rotinaAtiva, error: rotinaError } = await supabase
          .from('rotinas')
          .select('id, nome, objetivo, data_inicio')
          .eq('aluno_id', user.id)
          .eq('status', 'Ativa')
          .limit(1);

        // 3. Fetch other stats
        const { count: avaliacoesCount } = await supabase
          .from('avaliacoes_fisicas')
          .select('*', { count: 'exact', head: true })
          .eq('aluno_id', user.id);
        
        const { count: professoresCount } = await supabase
          .from('alunos_professores')
          .select('*', { count: 'exact', head: true })
          .eq('aluno_id', user.id);

        // Calculate workouts in the last 7 days
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        const { count: treinosRecentesCount } = await supabase
          .from('execucoes_sessao')
          .select('*', { count: 'exact', head: true })
          .eq('aluno_id', user.id)
          .eq('status', 'concluida')
          .gte('data_execucao', seteDiasAtras.toISOString().split('T')[0]);

        setTreinos7dias(treinosRecentesCount || 0);
        setStats({ 
          rotinas: rotinaAtiva?.length || 0, 
          avaliacoes: avaliacoesCount || 0,
          professores: professoresCount || 0,
        });
      } catch (error) {
        console.error("Erro ao carregar dashboard do aluno:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, alunoProfile, getStatusBadge, formatDateForBadge]);

  if (alunoLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Carregando painel...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <h1 className="text-3xl font-bold">
        Olá, {alunoProfile?.nome_completo?.split(' ')[0]}!
      </h1>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/minhas-rotinas')}>
          <CardHeader>
            <CardTitle className="flex flex-row items-center justify-between space-y-0 pb-2 text-sm font-medium">
              Rotinas
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rotinas}</div>
            <p className="text-xs text-muted-foreground">rotina ativa</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/minhas-rotinas')}>
          <CardHeader>
            <CardTitle className="flex flex-row items-center justify-between space-y-0 pb-2 text-sm font-medium">
              Treinos (7d)
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{treinos7dias}</p>
            <p className="text-sm text-muted-foreground">sessões concluídas</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/avaliacoes-aluno')}>
          <CardHeader>
            <CardTitle className="flex flex-row items-center justify-between space-y-0 pb-2 text-sm font-medium">
              Avaliações
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.avaliacoes}</p>
            <p className="text-sm text-muted-foreground">avaliações realizadas</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/professores')}>
          <CardHeader>
            <CardTitle className="flex flex-row items-center justify-between space-y-0 pb-2 text-sm font-medium">
              Professores
              <User className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.professores}</div>
            <p className="text-xs text-muted-foreground">professores que você segue</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IndexAluno;