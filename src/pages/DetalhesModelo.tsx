// src/pages/DetalhesModelo.tsx
// Página para visualização (somente leitura) de modelos de rotina
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Copy, Edit, Loader2, Dumbbell, Target, BicepsFlexed, Clock, Repeat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useExercicioLookup } from "@/hooks/useExercicioLookup";
import { CORES_GRUPOS_MUSCULARES } from "@/constants/rotinas";

interface ModeloRotina {
  id: string;
  nome: string;
  descricao?: string;
  objetivo?: string;
  dificuldade?: string;
  treinos_por_semana: number;
  duracao_semanas?: number;
  observacoes_rotina?: string;
  tipo: 'padrao' | 'personalizado';
  professor_id?: string;
  created_at: string;
}

interface Treino {
  id: string;
  nome: string;
  grupos_musculares: string[];
  ordem: number;
  observacoes?: string;
}

interface Serie {
  id: string;
  numero_serie: number;
  repeticoes?: number;
  carga?: number;
  repeticoes_1?: number;
  carga_1?: number;
  repeticoes_2?: number;
  carga_2?: number;
  tem_dropset?: boolean;
  carga_dropset?: number;
  intervalo_apos_serie?: number;
}

interface Exercicio {
  id: string;
  exercicio_1_id: string;
  exercicio_2_id?: string;
  ordem: number;
  intervalo_apos_exercicio?: number;
  observacoes?: string;
  series: Serie[];
}

interface TreinoCompleto extends Treino {
  exercicios: Exercicio[];
}

const DetalhesModelo = () => {
  const navigate = useNavigate();
  const { modeloId } = useParams<{ modeloId: string }>();
  const [searchParams] = useSearchParams();
  const returnTab = searchParams.get('returnTab') || 'padrao';
  const { user } = useAuth();
  const ADMIN_EMAIL = 'contato@titans.fitness';
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [loading, setLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const [modelo, setModelo] = useState<ModeloRotina | null>(null);
  const [treinos, setTreinos] = useState<TreinoCompleto[]>([]);

  const { getExercicioInfo } = useExercicioLookup();

  useEffect(() => {
    if (!modeloId) {
      toast.error("ID do modelo não encontrado");
      navigate(`/meus-modelos?tab=${returnTab}`);
      return;
    }
    carregarModelo();
  }, [modeloId]);

  const carregarModelo = async () => {
    try {
      setLoading(true);

      // Buscar modelo
      const { data: modeloData, error: modeloError } = await supabase
        .from('modelos_rotina')
        .select('*')
        .eq('id', modeloId)
        .single();

      if (modeloError) throw modeloError;
      if (!modeloData) {
        toast.error("Modelo não encontrado");
        navigate(`/meus-modelos?tab=${returnTab}`);
        return;
      }

      setModelo(modeloData as ModeloRotina);

      // Buscar treinos
      const { data: treinosData, error: treinosError } = await supabase
        .from('modelos_treino')
        .select('*')
        .eq('modelo_rotina_id', modeloId)
        .order('ordem', { ascending: true });

      if (treinosError) throw treinosError;

      // Buscar exercícios e séries para cada treino
      const treinosCompletos: TreinoCompleto[] = [];

      for (const treino of treinosData || []) {
        const { data: exerciciosData, error: exerciciosError } = await supabase
          .from('modelos_exercicio')
          .select('*')
          .eq('modelo_treino_id', treino.id)
          .order('ordem', { ascending: true });

        if (exerciciosError) throw exerciciosError;

        const exerciciosCompletos: Exercicio[] = [];

        for (const exercicio of exerciciosData || []) {
          const { data: seriesData, error: seriesError } = await supabase
            .from('modelos_serie')
            .select('*')
            .eq('modelo_exercicio_id', exercicio.id)
            .order('numero_serie', { ascending: true });

          if (seriesError) throw seriesError;

          exerciciosCompletos.push({
            ...exercicio,
            series: seriesData || []
          });
        }

        treinosCompletos.push({
          ...treino,
          exercicios: exerciciosCompletos
        });
      }

      setTreinos(treinosCompletos);
    } catch (error: any) {
      console.error('Erro ao carregar modelo:', error);
      toast.error("Erro ao carregar modelo", {
        description: error.message || "Tente novamente mais tarde"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarModelo = async () => {
    if (!user || !modelo) return;

    setIsCopying(true);
    try {
      // Criar novo modelo personalizado
      const { data: novoModelo, error: erroModelo } = await supabase
        .from('modelos_rotina')
        .insert({
          professor_id: user.id,
          nome: `${modelo.nome} (Cópia)`,
          descricao: modelo.descricao,
          objetivo: modelo.objetivo,
          dificuldade: modelo.dificuldade,
          treinos_por_semana: modelo.treinos_por_semana,
          duracao_semanas: modelo.duracao_semanas,
          observacoes_rotina: modelo.observacoes_rotina,
          tipo: 'personalizado',
          modelo_padrao_id: modelo.tipo === 'padrao' ? modelo.id : null
        })
        .select()
        .single();

      if (erroModelo) throw erroModelo;

      // Copiar treinos, exercícios e séries
      for (const treino of treinos) {
        const { data: novoTreino, error: erroNovoTreino } = await supabase
          .from('modelos_treino')
          .insert({
            modelo_rotina_id: novoModelo.id,
            nome: treino.nome,
            grupos_musculares: treino.grupos_musculares,
            ordem: treino.ordem,
            observacoes: treino.observacoes
          })
          .select()
          .single();

        if (erroNovoTreino) throw erroNovoTreino;

        // Copiar exercícios
        for (const exercicio of treino.exercicios) {
          const { data: novoExercicio, error: erroNovoExercicio } = await supabase
            .from('modelos_exercicio')
            .insert({
              modelo_treino_id: novoTreino.id,
              exercicio_1_id: exercicio.exercicio_1_id,
              exercicio_2_id: exercicio.exercicio_2_id,
              ordem: exercicio.ordem,
              intervalo_apos_exercicio: exercicio.intervalo_apos_exercicio,
              observacoes: exercicio.observacoes
            })
            .select()
            .single();

          if (erroNovoExercicio) throw erroNovoExercicio;

          // Copiar séries
          if (exercicio.series && exercicio.series.length > 0) {
            const seriesParaInserir = exercicio.series.map((serie) => ({
              modelo_exercicio_id: novoExercicio.id,
              numero_serie: serie.numero_serie,
              repeticoes: serie.repeticoes,
              carga: serie.carga,
              repeticoes_1: serie.repeticoes_1,
              carga_1: serie.carga_1,
              repeticoes_2: serie.repeticoes_2,
              carga_2: serie.carga_2,
              tem_dropset: serie.tem_dropset,
              carga_dropset: serie.carga_dropset,
              intervalo_apos_serie: serie.intervalo_apos_serie
            }));

            const { error: erroSeries } = await supabase
              .from('modelos_serie')
              .insert(seriesParaInserir);

            if (erroSeries) throw erroSeries;
          }
        }
      }

      toast.success("Modelo copiado com sucesso!", {
        description: "Você será redirecionado para seus modelos personalizados"
      });

      navigate("/meus-modelos?tab=personalizado");
    } catch (error: any) {
      console.error('Erro ao copiar modelo:', error);
      toast.error("Erro ao copiar modelo", {
        description: error.message || "Tente novamente"
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleEditar = () => {
    if (!modelo) return;

    if (modelo.tipo === 'padrao') {
      navigate(`/modelos/editar-padrao/${modelo.id}?returnTab=${returnTab}`);
    } else {
      navigate(`/modelos/editar/${modelo.id}?returnTab=${returnTab}`);
    }
  };

  const renderSerie = (serie: Serie, index: number, exercicio: Exercicio) => {
    const isCombinada = !!exercicio.exercicio_2_id;

    if (isCombinada) {
      return (
        <div key={serie.id} className="border rounded-lg p-4 bg-gray-50">
          <div className="font-medium mb-3">Série {serie.numero_serie}</div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-sm text-muted-foreground">Exercício 1</span>
                <div className="font-medium">{serie.repeticoes_1 || 0} reps</div>
                {serie.carga_1 !== undefined && serie.carga_1 > 0 && (
                  <div className="text-sm text-muted-foreground">{serie.carga_1} kg</div>
                )}
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Exercício 2</span>
                <div className="font-medium">{serie.repeticoes_2 || 0} reps</div>
                {serie.carga_2 !== undefined && serie.carga_2 > 0 && (
                  <div className="text-sm text-muted-foreground">{serie.carga_2} kg</div>
                )}
              </div>
            </div>
            {serie.intervalo_apos_serie !== undefined && (
              <div className="text-sm text-muted-foreground">
                Intervalo: {serie.intervalo_apos_serie}s
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={serie.id} className="border rounded-lg p-4 bg-gray-50">
        <div className="font-medium mb-2">Série {serie.numero_serie}</div>
        <div className="space-y-2">
          <div className="flex gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Repetições: </span>
              <span className="font-medium">{serie.repeticoes || 0}</span>
            </div>
            {serie.carga !== undefined && serie.carga > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Carga: </span>
                <span className="font-medium">{serie.carga} kg</span>
              </div>
            )}
          </div>
          {serie.tem_dropset && (
            <div className="text-sm">
              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                Dropset
              </Badge>
              {serie.carga_dropset !== undefined && serie.carga_dropset > 0 && (
                <span className="ml-2 text-muted-foreground">
                  {serie.carga_dropset} kg
                </span>
              )}
            </div>
          )}
          {serie.intervalo_apos_serie !== undefined && (
            <div className="text-sm text-muted-foreground">
              Intervalo: {serie.intervalo_apos_serie}s
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExercicio = (exercicio: Exercicio, index: number) => {
    const exercicio1 = getExercicioInfo(exercicio.exercicio_1_id);
    const exercicio2 = exercicio.exercicio_2_id ? getExercicioInfo(exercicio.exercicio_2_id) : null;
    const isCombinada = !!exercicio2;

    return (
      <Card key={exercicio.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Exercício {index + 1}
                </span>
              </div>
              {isCombinada && (
                <Badge variant="outline" className="mb-2 bg-purple-100 text-purple-800">
                  Exercício Combinado
                </Badge>
              )}
              <CardTitle className="text-base">
                {exercicio1?.nome || 'Exercício não encontrado'}
                {isCombinada && ` + ${exercicio2?.nome || 'Exercício não encontrado'}`}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {exercicio.series.map((serie, idx) => renderSerie(serie, idx, exercicio))}
          </div>

          {exercicio.intervalo_apos_exercicio !== undefined && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                Intervalo após exercício: {exercicio.intervalo_apos_exercicio}s
              </span>
            </div>
          )}

          {exercicio.observacoes && (
            <div className="pt-2 border-t">
              <div className="text-sm font-medium mb-1">Observações:</div>
              <div className="text-sm text-muted-foreground">{exercicio.observacoes}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Carregando modelo...</p>
        </div>
      </div>
    );
  }

  if (!modelo) {
    return null;
  }

  const podeEditar = modelo.tipo === 'personalizado' || (modelo.tipo === 'padrao' && isAdmin);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/meus-modelos?tab=${returnTab}`)}
            className="h-10 w-10 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            {/* Badge acima do título */}
            {modelo.tipo === 'padrao' ? (
              <span className="mb-1 inline-block text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                Padrão
              </span>
            ) : (
              <span className="mb-1 inline-block text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                Personalizado
              </span>
            )}
            <h1 className="text-3xl font-bold">{modelo.nome}</h1>
            <p className="text-muted-foreground">
              {modelo.descricao || 'Modelo de rotina de treino'}
            </p>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopiarModelo}
            disabled={isCopying}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            {isCopying ? 'Copiando...' : 'Criar Cópia'}
          </Button>

          {podeEditar && (
            <Button
              onClick={handleEditar}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Informações do Modelo */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modelo.objetivo && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Objetivo</p>
                  <p className="font-medium capitalize">{modelo.objetivo}</p>
                </div>
              </div>
            )}
            {modelo.dificuldade && (
              <div className="flex items-center gap-2">
                <BicepsFlexed className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Dificuldade</p>
                  <p className="font-medium capitalize">{modelo.dificuldade}</p>
                </div>
              </div>
            )}
            {modelo.duracao_semanas && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="font-medium">{modelo.duracao_semanas} semanas</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Frequência</p>
                <p className="font-medium">{modelo.treinos_por_semana}x por semana</p>
              </div>
            </div>
          </div>

          {modelo.observacoes_rotina && (
            <div className="pt-4 mt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Observações:</p>
              <p className="text-sm">{modelo.observacoes_rotina}</p>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Treinos */}
        {treinos.map((treino, treinoIndex) => (
          <Card key={treino.id} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{treino.nome}</span>
                <Badge variant="outline">{treino.exercicios.length} exercícios</Badge>
              </CardTitle>
              {treino.grupos_musculares && treino.grupos_musculares.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {treino.grupos_musculares.map((grupo) => (
                    <Badge
                      key={grupo}
                      variant="outline"
                      className={CORES_GRUPOS_MUSCULARES[grupo] || 'bg-gray-100 text-gray-800'}
                    >
                      {grupo}
                    </Badge>
                  ))}
                </div>
              )}
              {treino.observacoes && (
                <div className="mt-3 text-sm text-muted-foreground">
                  {treino.observacoes}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {treino.exercicios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum exercício adicionado
                </div>
              ) : (
                <div className="space-y-4">
                  {treino.exercicios.map((exercicio, exercicioIndex) =>
                    renderExercicio(exercicio, exercicioIndex)
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {treinos.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum treino configurado
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default DetalhesModelo;
