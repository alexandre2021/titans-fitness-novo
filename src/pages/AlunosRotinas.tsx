import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Dumbbell, Calendar, Target, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatters } from '@/utils/formatters';

interface AlunoInfo {
  id: string;
  nome_completo: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
}

interface Rotina {
  id: string;
  nome: string;
  objetivo: string;
  data_inicio: string;
  duracao_semanas: number;
  treinos_por_semana: number;
  status: string;
  descricao?: string;
  dificuldade: string;
  valor_total: number;
  forma_pagamento: string;
}

const AlunosRotinas = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDados = async () => {
      if (!id || !user) return;

      try {
        // Buscar informações do aluno
        const { data: alunoData, error: alunoError } = await supabase
          .from('alunos')
          .select('id, nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color')
          .eq('id', id)
          .eq('personal_trainer_id', user.id)
          .single();

        if (alunoError) {
          console.error('Erro ao buscar aluno:', alunoError);
          return;
        }

        setAluno(alunoData);

        // Buscar rotinas do aluno
        const { data: rotinasData, error: rotinasError } = await supabase
          .from('rotinas')
          .select('*')
          .eq('aluno_id', id)
          .eq('personal_trainer_id', user.id)
          .order('data_inicio', { ascending: false });

        if (rotinasError) {
          console.error('Erro ao buscar rotinas:', rotinasError);
        } else {
          setRotinas(rotinasData || []);
        }

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [id, user]);

  const renderAvatar = () => {
    if (!aluno) return null;
    
    if (aluno.avatar_type === 'image' && aluno.avatar_image_url) {
      return <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />;
    }
    
    return (
      <AvatarFallback 
        style={{ backgroundColor: aluno.avatar_color }}
        className="text-white font-semibold"
      >
        {aluno.avatar_letter || aluno.nome_completo.charAt(0).toUpperCase()}
      </AvatarFallback>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      ativa: { label: 'Ativa', variant: 'default' as const },
      concluida: { label: 'Concluída', variant: 'secondary' as const },
      pausada: { label: 'Pausada', variant: 'outline' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || 
                      { label: status, variant: 'outline' as const };
    
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getDificuldadeBadge = (dificuldade: string) => {
    const dificuldadeMap = {
      'Iniciante': 'bg-green-100 text-green-800',
      'Intermediário': 'bg-yellow-100 text-yellow-800',
      'Avançado': 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={dificuldadeMap[dificuldade as keyof typeof dificuldadeMap] || 'bg-gray-100 text-gray-800'}>
        {dificuldade}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/alunos')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Rotinas do Aluno</h1>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-lg text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/alunos')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Rotinas do Aluno</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Aluno não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/alunos')}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Rotinas do Aluno</h1>
          <p className="text-muted-foreground">Rotinas de treino personalizadas</p>
        </div>
      </div>

      {/* Informações do Aluno */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {renderAvatar()}
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{aluno.nome_completo}</h3>
              <p className="text-sm text-muted-foreground">
                {rotinas.length} rotina(s) registrada(s)
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Rotinas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Dumbbell className="h-5 w-5" />
            Rotinas de Treino
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rotinas.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma rotina encontrada</h3>
              <p className="text-muted-foreground">
                As rotinas de treino do aluno aparecerão aqui quando forem criadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rotinas.map((rotina) => (
                <div key={rotina.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold mb-2">{rotina.nome}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(rotina.status)}
                        {getDificuldadeBadge(rotina.dificuldade)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {formatters.currency(rotina.valor_total)}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {rotina.forma_pagamento}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Início</p>
                        <p className="font-medium">{formatters.date(rotina.data_inicio)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duração</p>
                        <p className="font-medium">{rotina.duracao_semanas} semanas</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Frequência</p>
                        <p className="font-medium">{rotina.treinos_por_semana}x por semana</p>
                      </div>
                    </div>
                  </div>

                  {rotina.objetivo && (
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground">Objetivo</p>
                      <p className="font-medium capitalize">{rotina.objetivo}</p>
                    </div>
                  )}

                  {rotina.descricao && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Descrição</p>
                      <p className="text-sm">{rotina.descricao}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlunosRotinas;