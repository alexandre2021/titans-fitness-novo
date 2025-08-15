// src/pages/RotinaExercicios.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRotinaStorage } from '@/hooks/useRotinaStorage';
import { useExercicioLookup } from '@/hooks/useExercicioLookup';
import { ExercicioRotinaLocal, SerieConfig, TreinoComExercicios, FiltrosExercicio } from '@/types/rotina.types';
import { RotinaExerciciosProvider } from '@/context/RotinaExerciciosContext';
import { useRotinaExerciciosContext } from '@/context/useRotinaExerciciosContext';

// Componentes
import EmptyState from '@/components/rotina/exercicios/EmptyState';
import SerieSimples from '@/components/rotina/exercicios/SerieSimples';
import SerieCombinada from '@/components/rotina/exercicios/SerieCombinada';
import ExercicioModal from '@/components/rotina/exercicios/ExercicioModal';

// Componente principal sem provider
const RotinaExerciciosContent: React.FC = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const rotinaStorage = useRotinaStorage(alunoId!);

  const {
    dadosCompletos,
    totalExercicios,
    isFormValido,
    isLoaded,
    removerExercicio,
    adicionarSerie,
    removerSerie,
    atualizarIntervaloExercicio,
    abrirModal
  } = useRotinaExerciciosContext();

  const { getExercicioInfo } = useExercicioLookup();
  const [salvando, setSalvando] = useState(false);

  // Verificar se tem treinos salvos (sempre no topo)
  useEffect(() => {
    if (!rotinaStorage.isLoaded) return;
    if (!rotinaStorage.storage.treinos || rotinaStorage.storage.treinos.length === 0) {
      toast({
        title: "Treinos não encontrados",
        description: "Complete a definição dos treinos antes de configurar os exercícios.",
        variant: "destructive"
      });
      navigate(`/rotinas-criar/${alunoId}/treinos`);
      return;
    }
  }, [alunoId, navigate, toast, rotinaStorage.isLoaded, rotinaStorage.storage]);

  // Limpeza de storage ao sair da página (sempre no topo)
  useEffect(() => {
    const handleBeforeUnload = () => {
      rotinaStorage.limparStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [rotinaStorage]);

  // Calcular treinos com exercícios
  const treinosComExercicios = dadosCompletos.treinos.filter((treino: TreinoComExercicios) => 
    treino.exercicios && treino.exercicios.length > 0
  ).length;

  // Salvar e avançar para revisão
  const handleProximo = async () => {
    console.log('🔍 Clicou próximo! Treinos com exercícios:', treinosComExercicios, 'Total:', dadosCompletos.treinos.length);
    
    // Verificar se atende aos requisitos
    if (treinosComExercicios !== dadosCompletos.treinos.length) {
      console.log('⚠️ Requisitos não atendidos - fazendo scroll');
      // Rolar para o card de requisitos
      const requisitoCard = document.querySelector('[data-requisito-card]');
      console.log('📍 Card encontrado:', requisitoCard);
      if (requisitoCard) {
        requisitoCard.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        console.log('📜 Scroll executado');
      }
      return; // Não prosseguir
    }

    console.log('✅ Requisitos atendidos - prosseguindo');
    setSalvando(true);
    try {
      // Salvar exercícios antes de avançar
      console.log('💾 Salvando exercícios antes de avançar...');

      // Converter dados do context para formato do storage
      const exerciciosParaSalvar: Record<string, import("@/types/rotina.types").ExercicioRotinaLocal[]> = {};

      dadosCompletos.treinos.forEach((treino) => {
        const nome = (treino as { nome: string }).nome;
        const exercicios = (treino as { exercicios?: ExercicioRotinaLocal[] }).exercicios;
        if (exercicios && exercicios.length > 0) {
          exerciciosParaSalvar[nome] = exercicios;
        }
      });

      console.log('💾 Exercícios formatados:', exerciciosParaSalvar);

      if (rotinaStorage && typeof rotinaStorage.salvarTodosExercicios === 'function') {
        await rotinaStorage.salvarTodosExercicios(exerciciosParaSalvar);
      }

      if (rotinaStorage && typeof rotinaStorage.avancarParaRevisao === 'function') {
        await rotinaStorage.avancarParaRevisao();
      }

      navigate(`/rotinas-criar/${alunoId}/revisao`);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar exercícios.",
        variant: "destructive"
      });
    } finally {
      setSalvando(false);
    }
  };

  // Cancelar: limpa storage e volta para lista de rotinas
  const handleCancelar = () => {
    rotinaStorage.limparStorage();
    navigate(`/alunos-rotinas/${alunoId}`);
  };

  // Voltar para treinos
  const handleVoltar = () => {
    navigate(`/rotinas-criar/${alunoId}/treinos`);
  };

  // Função para scroll suave até o card de requisitos
  const handleScrollRequisitos = () => {
    const requisitoCard = document.querySelector('[data-requisito-card]');
    if (requisitoCard) {
      requisitoCard.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  // Renderizar exercício
  const renderExercicio = (exercicio: ExercicioRotinaLocal, treinoId: string) => {
    const treino = dadosCompletos.treinos.find((t: TreinoComExercicios) => t.id === treinoId);
    const exercicios: ExercicioRotinaLocal[] = treino?.exercicios || [];
    const exercicioIndex = exercicios.findIndex((ex: ExercicioRotinaLocal) => ex.id === exercicio.id);
    const isUltimoExercicio = exercicioIndex === exercicios.length - 1;

    // Obter informações dos exercícios
    const exercicio1Info = getExercicioInfo(exercicio.exercicio_1_id);
    const exercicio2Info = exercicio.exercicio_2_id ? getExercicioInfo(exercicio.exercicio_2_id) : null;

    const nomeExercicio = exercicio.tipo === 'combinada' && exercicio2Info
      ? `${exercicio1Info.nome} + ${exercicio2Info.nome}`
      : exercicio1Info.nome;

    const equipamento = exercicio.tipo === 'combinada' && exercicio2Info
      ? `${exercicio1Info.equipamento} • ${exercicio2Info.equipamento}`
      : exercicio1Info.equipamento;

    return (
      <div key={exercicio.id} className="border-t pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
        {/* Header do exercício */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">
              {nomeExercicio || 'Carregando...'}
            </h4>
            <div className="flex items-center gap-2">
              {exercicio.tipo === 'combinada' && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 border border-purple-200">
                  Série Combinada
                </span>
              )}
              <span className="text-sm text-gray-600">{equipamento}</span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removerExercicio(treinoId, exercicio.id)}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Séries do exercício */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Séries:</Label>
          
          {exercicio.series.map((serie: SerieConfig, index: number) => {
            const isUltimaSerie = index === exercicio.series.length - 1;
            const onRemoverSerie = exercicio.series.length > 1 
              ? () => removerSerie(treinoId, exercicio.id, serie.id)
              : undefined;

            if (exercicio.tipo === 'combinada') {
              return (
                <SerieCombinada
                  key={serie.id}
                  serie={serie}
                  exercicio={exercicio}
                  treinoId={treinoId}
                  isUltimaSerie={isUltimaSerie}
                  isUltimoExercicio={isUltimoExercicio}
                  onRemoverSerie={onRemoverSerie}
                />
              );
            }

            return (
              <SerieSimples
                key={serie.id}
                serie={serie}
                exercicio={exercicio}
                treinoId={treinoId}
                isUltimaSerie={isUltimaSerie}
                isUltimoExercicio={isUltimoExercicio}
                onRemoverSerie={onRemoverSerie}
              />
            );
          })}

          {/* Botão adicionar série */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => adicionarSerie(treinoId, exercicio.id)}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Série
          </Button>

          {/* Intervalo entre exercícios */}
          {!isUltimoExercicio && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-md border border-purple-200">
              <Clock className="h-4 w-4 text-purple-600" />
              <Label className="text-xs text-purple-700 flex-1 font-medium">
                Intervalo entre exercícios:
              </Label>
              <Input
                type="number"
                value={exercicio.intervalo_apos_exercicio !== undefined ? exercicio.intervalo_apos_exercicio.toString() : '90'}
                onChange={(e) => atualizarIntervaloExercicio(treinoId, exercicio.id, parseInt(e.target.value) || 0)}
                min="0"
                max="600"
                className="w-16 h-8 text-center text-xs bg-white border-purple-200"
                placeholder="90"
              />
              <span className="text-xs text-purple-700">s</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderizar treino
  const renderTreino = (treino: TreinoComExercicios) => {
    const temExercicios = treino.exercicios && treino.exercicios.length > 0;
    const treinoCompleto = temExercicios;
    
    return (
      <Card key={treino.id} className={`mb-6 ${treinoCompleto ? "border-green-200" : "border-gray-200"}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{treino.nome}</CardTitle>
                {treinoCompleto && (
                  <Badge className="bg-green-100 text-green-800 text-xs flex items-center gap-1">
                    <Check className="h-3 w-3 mr-1" />
                    Requisitos
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {treino.grupos_musculares?.length > 0 
                  ? treino.grupos_musculares.join(', ') 
                  : 'Sem grupos definidos'
                } {temExercicios && ` • ${treino.exercicios.length} exercício(s)`}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {!temExercicios ? (
            <EmptyState
              treinoNome={treino.nome}
              onAddExercicio={() => abrirModal(treino.id, treino.grupos_musculares || [])}
            />
          ) : (
            <>
              {/* Lista de exercícios */}
              <div className="space-y-0">
                {treino.exercicios.map((exercicio: ExercicioRotinaLocal) => 
                  renderExercicio(exercicio, treino.id)
                )}
              </div>
              
              {/* Botão adicionar exercício no final */}
              <div className="mt-6 pt-4 border-t border-dashed">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => abrirModal(treino.id, treino.grupos_musculares || [])}
                  className="w-full border-dashed border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Exercício
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando exercícios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Nova Rotina</span>
          <span className="text-sm text-gray-500">•</span>
          <span className="text-sm font-medium">Exercícios</span>
        </div>
        <div className="text-sm text-gray-500">
          Etapa 3 de 4
        </div>
      </div>

      {/* Card de Requisitos */}
      <Card className="bg-blue-50 border-blue-200" data-requisito-card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-blue-900">Requisitos para continuar:</p>
              <p className="text-sm text-blue-700">Adicione pelo menos 1 exercício em cada treino</p>
            </div>
            <Badge className={treinosComExercicios === dadosCompletos.treinos.length ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
              {treinosComExercicios === dadosCompletos.treinos.length ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Requisito
                </>
              ) : (
                `${treinosComExercicios}/${dadosCompletos.treinos.length} Pendente`
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lista de treinos */}
      <div>
        {dadosCompletos.treinos.map((treino: TreinoComExercicios) => renderTreino(treino))}
      </div>

      {/* Botões de navegação */}
      <div className="flex justify-between pt-6 gap-2">
        <div>
          <Button variant="ghost" onClick={handleVoltar} disabled={salvando} className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancelar} disabled={salvando} className="flex items-center">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <div onClick={treinosComExercicios !== dadosCompletos.treinos.length ? handleScrollRequisitos : handleProximo}>
            <Button 
              disabled={salvando || treinosComExercicios !== dadosCompletos.treinos.length}
              className="w-full"
            >
              {salvando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  Próximo: Revisão
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de exercícios */}
      <ExercicioModal />
    </div>
  );
};

// Componente exportado com provider
const RotinaExercicios: React.FC = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  
  if (!alunoId) {
    return <div>ID do aluno não encontrado</div>;
  }

  return (
    <RotinaExerciciosProvider alunoId={alunoId}>
      <RotinaExerciciosContent />
    </RotinaExerciciosProvider>
  );
};

export default RotinaExercicios;