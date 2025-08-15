import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Dumbbell, 
  Target, 
  Clock, 
  Activity,
  Calendar,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useExercicioLookup } from '@/hooks/useExercicioLookup';
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
  created_at: string;
}

interface Treino {
  id: string;
  nome: string;
  grupos_musculares: string;
  ordem: number;
  tempo_estimado_minutos?: number;
  observacoes?: string;
}

interface ExercicioRotina {
  id: string;
  exercicio_1_id: string;
  exercicio_2_id?: string;
  ordem: number;
  intervalo_apos_exercicio?: number;
  observacoes?: string;
}

interface Serie {
  id: string;
  numero_serie: number;
  repeticoes?: number;
  carga?: number;
  tem_dropset: boolean;
  carga_dropset?: number;
  intervalo_apos_serie?: number;
  repeticoes_1?: number;
  carga_1?: number;
  repeticoes_2?: number;
  carga_2?: number;
}

interface TreinoDetalhado extends Treino {
  exercicios: (ExercicioRotina & { series: Serie[] })[];
}

interface RotinaDetalhada extends Rotina {
  treinos: TreinoDetalhado[];
}

interface EvolucaoRotina {
  concluidas: number;
  total: number;
}

const AlunosRotinaDetalhes = () => {
  const { id: alunoId, rotinaId } = useParams<{ id: string; rotinaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getExercicioInfo } = useExercicioLookup();
  
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [rotina, setRotina] = useState<RotinaDetalhada | null>(null);
  const [evolucao, setEvolucao] = useState<EvolucaoRotina>({ concluidas: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDados = async () => {
      if (!alunoId || !rotinaId || !user) return;

      try {
        // Buscar informações do aluno
        const { data: alunoData, error: alunoError } = await supabase
          .from('alunos')
          .select('id, nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color')
          .eq('id', alunoId)
          .eq('personal_trainer_id', user.id)
          .single();

        if (alunoError) {
          console.error('Erro ao buscar aluno:', alunoError);
          toast({
            title: "Erro",
            description: "Aluno não encontrado.",
            variant: "destructive",
          });
          navigate('/alunos');
          return;
        }

        setAluno(alunoData);

        // Buscar rotina
        const { data: rotinaData, error: rotinaError } = await supabase
          .from('rotinas')
          .select('*')
          .eq('id', rotinaId)
          .eq('aluno_id', alunoId)
          .eq('personal_trainer_id', user.id)
          .single();

        if (rotinaError) {
          console.error('Erro ao buscar rotina:', rotinaError);
          toast({
            title: "Erro",
            description: "Rotina não encontrada.",
            variant: "destructive",
          });
          navigate(`/alunos-rotinas/${alunoId}`);
          return;
        }

        // Buscar evolução da rotina (sessões)
        const { data: sessoesData, error: sessoesError } = await supabase
          .from('execucoes_sessao')
          .select('status')
          .eq('rotina_id', rotinaId);

        if (!sessoesError && sessoesData) {
          const concluidas = sessoesData.filter(s => s.status === 'concluida').length;
          const total = sessoesData.length;
          setEvolucao({ concluidas, total });
        }

        // Buscar treinos da rotina
        const { data: treinosData, error: treinosError } = await supabase
          .from('treinos')
          .select('*')
          .eq('rotina_id', rotinaId)
          .order('ordem');

        if (treinosError) {
          console.error('Erro ao buscar treinos:', treinosError);
          throw treinosError;
        }

        const treinosDetalhados: TreinoDetalhado[] = [];

        // Para cada treino, buscar exercícios e séries
        for (const treino of treinosData || []) {
          const { data: exerciciosData, error: exerciciosError } = await supabase
            .from('exercicios_rotina')
            .select('*')
            .eq('treino_id', treino.id)
            .order('ordem');

          if (exerciciosError) {
            console.error('Erro ao buscar exercícios:', exerciciosError);
            throw exerciciosError;
          }

          const exerciciosComSeries = [];

          // Para cada exercício, buscar suas séries
          for (const exercicio of exerciciosData || []) {
            const { data: seriesData, error: seriesError } = await supabase
              .from('series')
              .select('*')
              .eq('exercicio_id', exercicio.id)
              .order('numero_serie');

            if (seriesError) {
              console.error('Erro ao buscar séries:', seriesError);
              throw seriesError;
            }

            exerciciosComSeries.push({
              ...exercicio,
              series: seriesData || []
            });
          }

          treinosDetalhados.push({
            ...treino,
            exercicios: exerciciosComSeries
          });
        }

        // Montar rotina completa
        const rotinaCompleta: RotinaDetalhada = {
          ...rotinaData,
          treinos: treinosDetalhados
        };

        setRotina(rotinaCompleta);

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados da rotina.",
          variant: "destructive",
        });
        navigate(`/alunos-rotinas/${alunoId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [alunoId, rotinaId, user, navigate, toast]);

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
    const statusColors = {
      'Ativa': 'bg-green-100 text-green-800',
      'Concluída': 'bg-gray-100 text-gray-800'
    };
    
    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={colorClass}>
        {status}
      </Badge>
    );
  };

  const getDificuldadeBadge = (dificuldade: string) => {
    const dificuldadeColors = {
      'Baixa': 'bg-green-100 text-green-800',
      'Média': 'bg-yellow-100 text-yellow-800',
      'Alta': 'bg-red-100 text-red-800'
    };
    
    const colorClass = dificuldadeColors[dificuldade as keyof typeof dificuldadeColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={colorClass}>
        {dificuldade}
      </Badge>
    );
  };

  const getObjetivoBadge = (objetivo: string) => {
    const objetivoColors = {
      'Emagrecimento': 'bg-orange-100 text-orange-800',
      'Ganho de massa': 'bg-blue-100 text-blue-800',
      'Definição muscular': 'bg-purple-100 text-purple-800',
      'Condicionamento físico': 'bg-green-100 text-green-800',
      'Reabilitação': 'bg-yellow-100 text-yellow-800',
      'Performance esportiva': 'bg-indigo-100 text-indigo-800'
    };
    
    const colorClass = objetivoColors[objetivo as keyof typeof objetivoColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={colorClass}>
        {objetivo}
      </Badge>
    );
  };

  const getGruposMuscularesColors = (grupos: string[]) => {
    const cores = {
      'Peito': 'bg-red-100 text-red-800',
      'Costas': 'bg-blue-100 text-blue-800',
      'Pernas': 'bg-green-100 text-green-800',
      'Ombros': 'bg-yellow-100 text-yellow-800',
      'Bíceps': 'bg-purple-100 text-purple-800',
      'Tríceps': 'bg-pink-100 text-pink-800',
      'Abdômen': 'bg-orange-100 text-orange-800',
      'Glúteos': 'bg-green-100 text-green-800',
      'Panturrilha': 'bg-green-100 text-green-800',
      'Trapézio': 'bg-blue-100 text-blue-800'
    };

    return grupos.map(grupo => (
      <Badge 
        key={grupo}
        variant="secondary" 
        className={cores[grupo as keyof typeof cores] || 'bg-gray-100 text-gray-800'}
      >
        {grupo}
      </Badge>
    ));
  };

  const handleVoltar = () => {
    navigate(`/alunos-rotinas/${alunoId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handleVoltar}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes da Rotina</h1>
            <p className="text-muted-foreground">Carregando informações...</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-lg text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!aluno || !rotina) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handleVoltar}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes da Rotina</h1>
            <p className="text-muted-foreground">Rotina não encontrada</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Rotina não encontrada.</p>
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
          onClick={handleVoltar}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{rotina.nome}</h1>
          <p className="text-muted-foreground">Detalhes completos da rotina de treino</p>
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
                Rotina criada em {formatters.date(rotina.created_at)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Configuração da Rotina */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Rotina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            {getStatusBadge(rotina.status)}
            {getObjetivoBadge(rotina.objetivo)}
            {getDificuldadeBadge(rotina.dificuldade)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Duração:</span>
                <p className="font-medium">{rotina.duracao_semanas} semanas</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Frequência:</span>
                <p className="font-medium">{rotina.treinos_por_semana}x por semana</p>
              </div>
            </div>

            {/* Progresso da Rotina */}
            {evolucao.total > 0 && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground">Progresso:</span>
                  <p className="font-medium">
                    {evolucao.concluidas}/{evolucao.total} sessões ({Math.round((evolucao.concluidas / evolucao.total) * 100)}%)
                  </p>
                </div>
              </div>
            )}
          </div>

          {rotina.descricao && (
            <div className="pt-4 border-t">
              <span className="text-sm text-muted-foreground">Descrição:</span>
              <p className="mt-1 text-gray-900">{rotina.descricao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhamento dos Treinos */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Detalhamento dos Treinos</h3>
        
        {rotina.treinos.map((treino, treinoIndex) => (
          <Card key={treino.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{treino.nome}</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                {getGruposMuscularesColors(treino.grupos_musculares.split(','))}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Lista de exercícios */}
              {treino.exercicios.map((exercicio, exercicioIndex) => {
                const exercicio1Info = getExercicioInfo(exercicio.exercicio_1_id);
                const exercicio2Info = exercicio.exercicio_2_id ? getExercicioInfo(exercicio.exercicio_2_id) : null;
                
                const nomeExercicio = exercicio2Info 
                  ? `${exercicio1Info.nome} + ${exercicio2Info.nome}`
                  : exercicio1Info.nome;

                return (
                  <div key={exercicio.id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-medium">{exercicioIndex + 1}. {nomeExercicio}</span>
                      {exercicio2Info && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                          Combinada
                        </Badge>
                      )}
                    </div>

                    {/* Séries do exercício */}
                    <div className="space-y-2 ml-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Séries ({exercicio.series.length}):
                      </p>
                      {exercicio.series.map((serie) => (
                        <div key={serie.id} className="flex items-center gap-4 text-sm bg-muted/30 rounded p-2">
                          <span className="font-medium">Série {serie.numero_serie}:</span>
                          
                          {exercicio2Info ? (
                            // Série combinada
                            <div className="flex gap-4">
                              <span>{serie.repeticoes_1 || 12} rep</span>
                              {serie.carga_1 && <span>{serie.carga_1}kg</span>}
                              <span>+</span>
                              <span>{serie.repeticoes_2 || 12} rep</span>
                              {serie.carga_2 && <span>{serie.carga_2}kg</span>}
                            </div>
                          ) : (
                            // Série simples
                            <div className="flex gap-4">
                              <span>{serie.repeticoes || 12} repetições</span>
                              {serie.carga && <span>{serie.carga}kg</span>}
                              {serie.tem_dropset && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">
                                  Drop Set
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {serie.intervalo_apos_serie && (
                            <span className="text-muted-foreground">
                              Intervalo: {serie.intervalo_apos_serie}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Intervalo após exercício */}
                    {exercicio.intervalo_apos_exercicio && exercicioIndex < treino.exercicios.length - 1 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Intervalo após exercício: {exercicio.intervalo_apos_exercicio}s
                      </div>
                    )}

                    {/* Observações do exercício */}
                    {exercicio.observacoes && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Observações:</span> {exercicio.observacoes}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Observações do treino */}
              {treino.observacoes && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Observações do treino:</p>
                  <p className="text-sm">{treino.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AlunosRotinaDetalhes;