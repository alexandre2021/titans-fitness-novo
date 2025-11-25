// src/pages/RotinaCriacao.tsx

import React, { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomSelect from '@/components/ui/CustomSelect';
import { toast } from 'sonner';import { Plus, Trash2, Save, X, Dumbbell, Check, Loader2, ChevronRight, ChevronLeft, GripVertical, ChevronUp, ChevronDown, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Types
import { 
  Objetivo, 
  Dificuldade, 
  Aluno
} from '@/types/rotina.types';
import { OBJETIVOS_OPTIONS, DIFICULDADES_OPTIONS, DURACAO_OPTIONS, GENEROS_OPTIONS, GRUPOS_MUSCULARES, CORES_GRUPOS_MUSCULARES, STORAGE_KEY_ROTINA_CRIACAO } from '@/constants/rotinas';
import { Tables } from '@/integrations/supabase/types';

// Reusable Components
import { ExercicioModal, ItemSacola } from '@/components/rotina/criacao/ExercicioModal';
import { SerieSimples } from '@/components/rotina/criacao/SerieSimples';
import { SerieCombinada } from '@/components/rotina/criacao/SerieCombinada';
import { useExercicioLookup } from '@/hooks/useExercicioLookup';

// --- Nova Estrutura de Estado Unificada ---
export interface SerieModelo {
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

export interface ExercicioModelo {
  id: string;
  exercicio_1_id: string;
  exercicio_2_id?: string;
  tipo: 'simples' | 'combinada';
  series: SerieModelo[];
  intervalo_apos_exercicio?: number;
}

interface TreinoTemp {
  id: string;
  nome: string;
  grupos_musculares: string[];
  observacoes?: string;
  ordem: number;
}

type ModeloConfiguracaoData = {
  nome: string;
  objetivo: Objetivo | '';
  dificuldade: Dificuldade | '';
  genero: string;
  duracao_semanas: number | undefined;
  treinos_por_semana: number | undefined;
  data_inicio: string;
  descricao: string;
};

interface RotinaEmCriacao {
  draftId?: string;
  configuracao?: ModeloConfiguracaoData;
  treinos?: TreinoTemp[];
  exercicios?: Record<string, ExercicioModelo[]>;
  etapaAtual?: Etapa;
}

// --- Constantes ---
const TREINOS_OPTIONS = Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}x / semana` }));

type Etapa = "configuracao" | "treinos" | "exercicios";

interface RotinaConfiguracaoStepProps {
  onAvancar: (data: ModeloConfiguracaoData) => void;
  initialData?: ModeloConfiguracaoData;
  onCancelar: () => void;
  aluno: Aluno | null;
  onUpdate: (data: Partial<RotinaEmCriacao>) => void;
}

interface RotinaTreinosStepProps {
  onAvancar: (data: TreinoTemp[]) => void;
  onVoltar: () => void;
  initialData?: TreinoTemp[];
  configuracao?: ModeloConfiguracaoData;
  onCancelar: () => void;
  onUpdate: (data: Partial<RotinaEmCriacao>) => void;
}

interface RotinaExerciciosStepProps {
  onFinalizar: () => void;
  onVoltar: () => void;
  exercicios: Record<string, ExercicioModelo[]>; // Alterado de initialData
  treinos: TreinoTemp[];
  setExercicios: (exercicios: Record<string, ExercicioModelo[]>) => void; // Alterado de onUpdate
  onCancelar: () => void;
  isSaving: boolean;
}

// --- Etapa 1: Componente de Configuração ---
const RotinaConfiguracaoStep = ({ onAvancar, initialData, onCancelar, aluno, onUpdate }: RotinaConfiguracaoStepProps) => {
  const [formData, setFormData] = useState<ModeloConfiguracaoData>(
    initialData ?? {
      nome: `Rotina para ${aluno?.nome_completo?.split(' ')[0] || 'Aluno'}`,
      objetivo: '',
      dificuldade: '',
      genero: 'Ambos',
      duracao_semanas: 1,
      treinos_por_semana: 1,
      data_inicio: new Date().toISOString().split('T')[0],
      descricao: '',
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ CORREÇÃO: Sincroniza o estado local do formulário com o estado principal da página
  // em tempo real, garantindo que os dados estejam sempre atualizados para salvar o rascunho.
  useEffect(() => {
    onUpdate({ configuracao: formData });
  }, [formData, onUpdate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome || formData.nome.trim().length < 3) newErrors.nome = "O nome da rotina deve ter pelo menos 3 caracteres.";
    if (!formData.objetivo) newErrors.objetivo = "O objetivo é obrigatório.";
    if (!formData.dificuldade) newErrors.dificuldade = "A dificuldade é obrigatória.";
    if (!formData.genero) newErrors.genero = "O gênero é obrigatório.";
    if (!formData.duracao_semanas) newErrors.duracao_semanas = "A duração é obrigatória.";
    if (!formData.treinos_por_semana) newErrors.treinos_por_semana = "A frequência é obrigatória.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ModeloConfiguracaoData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (validateForm()) {
      onAvancar(formData);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etapa 1: Configuração da Rotina</CardTitle>
        <p className="text-muted-foreground">Defina as características principais da nova rotina para {aluno?.nome_completo}.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Rotina</Label>
            <Input id="nome" value={formData.nome} onChange={e => handleInputChange('nome', e.target.value)} />
            {errors.nome && <p className="text-sm text-destructive mt-1">{errors.nome}</p>}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <CustomSelect inputId="objetivo" options={OBJETIVOS_OPTIONS} value={OBJETIVOS_OPTIONS.find(o => o.value === formData.objetivo)} onChange={(opt) => handleInputChange('objetivo', opt ? opt.value : '')} placeholder="Selecione..."/>
              {errors.objetivo && <p className="text-sm text-destructive mt-1">{errors.objetivo}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dificuldade">Dificuldade</Label>
              <CustomSelect inputId="dificuldade" options={DIFICULDADES_OPTIONS} value={DIFICULDADES_OPTIONS.find(o => o.value === formData.dificuldade)} onChange={(opt) => handleInputChange('dificuldade', opt ? opt.value : '')} placeholder="Selecione..."/>
              {errors.dificuldade && <p className="text-sm text-destructive mt-1">{errors.dificuldade}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="genero">Gênero</Label>
              <CustomSelect inputId="genero" options={GENEROS_OPTIONS} value={GENEROS_OPTIONS.find(o => o.value === formData.genero)} onChange={(opt) => handleInputChange('genero', opt ? opt.value : '')} placeholder="Selecione..."/>
              {errors.genero && <p className="text-sm text-destructive mt-1">{errors.genero}</p>}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duracao">Duração (semanas)</Label>
              <CustomSelect inputId="duracao" options={DURACAO_OPTIONS} value={DURACAO_OPTIONS.find(o => o.value === String(formData.duracao_semanas))} onChange={(opt) => handleInputChange('duracao_semanas', opt ? parseInt(opt.value) : undefined)} placeholder="Selecione..." />
              {errors.duracao_semanas && <p className="text-sm text-destructive mt-1">{errors.duracao_semanas}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequencia">Frequência (treinos/semana)</Label>
              <CustomSelect inputId="frequencia" options={TREINOS_OPTIONS} value={TREINOS_OPTIONS.find(o => o.value === String(formData.treinos_por_semana))} onChange={(opt) => handleInputChange('treinos_por_semana', opt ? parseInt(opt.value) : undefined)} placeholder="Selecione..." />
              {errors.treinos_por_semana && <p className="text-sm text-destructive mt-1">{errors.treinos_por_semana}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_inicio">Data de Início</Label>
            <Input id="data_inicio" type="date" value={formData.data_inicio} onChange={e => handleInputChange('data_inicio', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea id="descricao" value={formData.descricao} onChange={e => handleInputChange('descricao', e.target.value)} placeholder="Detalhes sobre a rotina..."/>
          </div>
          
          {/* Espaçamento para botões fixos */}
          <div className="pb-20 md:pb-6" />

          {/* Botões de navegação - Desktop */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t p-4 hidden md:flex justify-end items-center z-50 px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onCancelar} size="lg">Cancelar</Button>
              <Button type="submit" size="lg">Avançar para Treinos <ChevronRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>

          {/* Botões de navegação - Mobile */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-50">
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancelar} size="lg">Cancelar</Button>
                <Button type="submit" size="lg">Avançar</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// --- Etapa 2: Componente de Treinos ---
const RotinaTreinosStep = ({ onAvancar, onVoltar, initialData, configuracao, onCancelar, onUpdate }: RotinaTreinosStepProps) => {
  const isInitialMount = useRef(true);
  const [treinos, setTreinos] = useState<TreinoTemp[]>(() => {
    // Se já tem treinos salvos (vindo do rascunho/storage), usa eles
    if (initialData && initialData.length > 0) {
      return initialData;
    }
    
    // Se não tem, gera treinos vazios baseado na configuração da Etapa 1
    if (configuracao?.treinos_por_semana) {
      const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      return Array.from({ length: configuracao.treinos_por_semana }, (_, i) => ({
        id: `treino_draft_${Date.now()}_${i}`,
        nome: `Treino ${nomesTreinos[i] || String.fromCharCode(65 + i)}`,
        grupos_musculares: [],
        ordem: i + 1,
      }));
    }
    return [];
  });

  // Sincroniza o estado interno se os dados iniciais ou a configuração mudarem.
  useEffect(() => {
    const frequenciaConfig = configuracao?.treinos_por_semana;
    const frequenciaAtual = treinos.length;

    // Se a frequência da configuração mudou e é diferente do que está no estado,
    // força a recriação da lista de treinos. Isso resolve o bug de cache do estado.
    if (!isInitialMount.current && frequenciaConfig !== undefined && frequenciaConfig !== frequenciaAtual) {
      toast.info("A frequência de treinos foi alterada.", {
        description: "Os treinos e exercícios foram reiniciados para se adequar à nova configuração."
      });
    }

    if (frequenciaConfig !== undefined && frequenciaConfig !== frequenciaAtual) {
        const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const novosTreinos = Array.from({ length: frequenciaConfig }, (_, i) => ({
            id: `treino_draft_${Date.now()}_${i}`,
            nome: `Treino ${nomesTreinos[i] || String.fromCharCode(65 + i)}`,
            grupos_musculares: [],
            ordem: i + 1,
        }));
        setTreinos(novosTreinos);
        onUpdate({ treinos: novosTreinos }); // ✅ CORREÇÃO: Salva os treinos recém-criados no estado global.
    }

    // Marca que a montagem inicial já ocorreu.
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [configuracao?.treinos_por_semana, onUpdate, treinos.length]);

  const adicionarGrupoMuscular = (treinoIndex: number, grupo: string) => {
    setTreinos(prev => prev.map((treino, index) => {
      if (index === treinoIndex && !treino.grupos_musculares.includes(grupo)) {
        return { ...treino, grupos_musculares: [...treino.grupos_musculares, grupo] };
      }
      return treino;
    }));
  };

  const removerGrupoMuscular = (treinoIndex: number, grupo: string) => {
    setTreinos(prev => prev.map((treino, index) => {
      if (index === treinoIndex) {
        return { ...treino, grupos_musculares: treino.grupos_musculares.filter(g => g !== grupo) };
      }
      return treino;
    }));
  };

  const handleMoverTreino = (index: number, direcao: 'cima' | 'baixo') => {
    setTreinos(prev => {
      const novosTreinos = [...prev];
      const newIndex = direcao === 'cima' ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= novosTreinos.length) return prev;

      // Troca os treinos de posição
      [novosTreinos[index], novosTreinos[newIndex]] = [novosTreinos[newIndex], novosTreinos[index]];

      // Renomeia e reordena todos os treinos
      const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      return novosTreinos.map((treino, i) => ({
        ...treino, nome: `Treino ${nomesTreinos[i] || String.fromCharCode(65 + i)}`, ordem: i + 1
      }));
    });
  }

  const treinosCompletos = treinos.filter(t => t.grupos_musculares.length > 0).length;
  const requisitosAtendidos = treinosCompletos === treinos.length;

  const handleProximo = () => {
    if (requisitosAtendidos) {
      onAvancar(treinos);
    }
  };

  const handleVoltarClick = () => {
    onUpdate({ treinos });
    onVoltar();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etapa 2: Adição de Grupos Musculares</CardTitle>
        <p className="text-muted-foreground">Defina os grupos musculares para cada treino da semana.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
        <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-blue-900">Requisitos para continuar:</p>
              <p className="text-sm text-blue-700">Adicione pelo menos 1 grupo muscular em cada treino.</p>
            </div>
            <Badge className={requisitosAtendidos ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
              {treinosCompletos}/{treinos.length} completos
            </Badge>
          </div>
        </CardContent>
      </Card>
      
        <div className="space-y-4">
          {treinos.map((treino, index) => {
            const treinoCompleto = treino.grupos_musculares.length > 0;
            return (
              <Card key={treino.id} className={treinoCompleto ? "border-green-200" : "border-gray-200"}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col -space-y-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverTreino(index, 'cima')} disabled={index === 0} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"><ChevronUp className="h-5 w-5" /></Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverTreino(index, 'baixo')} disabled={index === treinos.length - 1} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"><ChevronDown className="h-5 w-5" /></Button>
                      </div>
                      {treino.nome}
                    </div>
                    {treinoCompleto && <Badge className="bg-green-100 text-green-800 text-xs flex items-center gap-1"><Check className="h-3 w-3 mr-1" />Requisitos</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2"><Label>Grupos Musculares</Label><div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-gray-50">{treino.grupos_musculares.length > 0 ? treino.grupos_musculares.map(grupo => (<Badge key={grupo} variant="secondary" className={`${CORES_GRUPOS_MUSCULARES[grupo] || 'bg-gray-100 text-gray-800'} cursor-pointer hover:opacity-80`} onClick={() => removerGrupoMuscular(index, grupo)}>{grupo} <Trash2 className="h-3 w-3 ml-1.5" /></Badge>)) : <span className="text-gray-500 text-sm p-1">Selecione os grupos musculares abaixo</span>}</div></div>
                  <div className="space-y-2"><Label className="text-sm text-gray-600">Adicionar Grupos:</Label><div className="flex flex-wrap gap-2">{GRUPOS_MUSCULARES.filter(g => !treino.grupos_musculares.includes(g)).map(g => (<Badge key={g} variant="outline" className="cursor-pointer hover:bg-gray-100" onClick={() => adicionarGrupoMuscular(index, g)}><Plus className="h-3 w-3 mr-1" />{g}</Badge>))}</div></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      
        {/* Espaçamento para botões fixos */}
      <div className="pb-20 md:pb-6" />

      {/* Botões de navegação - Desktop */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t p-4 hidden md:flex justify-between items-center z-50 px-6 lg:px-8">
          <Button variant="outline" onClick={handleVoltarClick} size="lg"><ChevronLeft className="h-4 w-4 mr-2" />Voltar</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancelar} size="lg">Cancelar</Button>
            <Button onClick={handleProximo} disabled={!requisitosAtendidos} size="lg">Avançar para Exercícios <ChevronRight className="h-4 w-4 ml-2" /></Button>
          </div>
      </div>

      {/* Botões de navegação - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-50">
        <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleVoltarClick} size="lg">Voltar</Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onCancelar} size="lg">Cancelar</Button>
              <Button onClick={handleProximo} disabled={!requisitosAtendidos} size="lg">Avançar</Button>
            </div>
        </div>
      </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Etapa 3: Componente de Exercícios ---
const RotinaExerciciosStep = ({ onFinalizar, onVoltar, exercicios, treinos, setExercicios, onCancelar, isSaving }: RotinaExerciciosStepProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treinoAtual, setTreinoAtual] = useState<TreinoTemp | null>(null);
  const [exerciciosIniciais, setExerciciosIniciais] = useState<ItemSacola[]>([]);
  const [treinosExpandidos, setTreinosExpandidos] = useState<Record<string, boolean>>(() => {
    const inicial: Record<string, boolean> = {};
    treinos.forEach(t => inicial[t.id] = true);
    return inicial;
  });
  const { getExercicioInfo } = useExercicioLookup();

  const toggleTreino = (treinoId: string) => {
    setTreinosExpandidos(prev => ({ ...prev, [treinoId]: !prev[treinoId] }));
  };

  // ✅ NOVO: Salvar exercícios ao voltar
  const handleVoltarClick = () => {
    console.log('💾 Salvando exercícios antes de voltar:', exercicios);
    // Não precisa mais chamar onUpdate aqui, o estado já é o do pai.
    onVoltar();
  };

  const handleAbrirModal = async (treino: TreinoTemp) => {
    console.log('🔍 Abrindo modal para treino:', treino.id);
    console.log('📦 Exercícios atuais do treino:', exercicios[treino.id]);
    setTreinoAtual(treino);

    // Busca exercícios completos do banco para preencher a sacola
    const exerciciosDoTreino = exercicios[treino.id] || [];
    const exerciciosIds = exerciciosDoTreino.flatMap(ex =>
      ex.tipo === 'simples'
        ? [ex.exercicio_1_id]
        : [ex.exercicio_1_id, ex.exercicio_2_id!]
    ).filter(Boolean);

    if (exerciciosIds.length > 0) {
      try {
        const { data: exerciciosCompletos, error } = await supabase
          .from('exercicios')
          .select('*')
          .in('id', exerciciosIds);

        if (!error && exerciciosCompletos) {
          const exerciciosMap = new Map(exerciciosCompletos.map(e => [e.id, e]));

          const sacola: ItemSacola[] = exerciciosDoTreino.flatMap(ex => {
            if (ex.tipo === 'simples') {
              const exercicio = exerciciosMap.get(ex.exercicio_1_id);
              if (!exercicio) return [];
              return [{
                tipo: 'simples' as const,
                exercicio
              }] as ItemSacola[];
            } else {
              const ex1 = exerciciosMap.get(ex.exercicio_1_id);
              const ex2 = exerciciosMap.get(ex.exercicio_2_id!);
              if (!ex1 || !ex2) return [];
              return [{
                tipo: 'combinacao' as const,
                exercicios: [ex1, ex2] as [Tables<'exercicios'>, Tables<'exercicios'>]
              }] as ItemSacola[];
            }
          });

          setExerciciosIniciais(sacola);
        }
      } catch (error) {
        console.error('Erro ao buscar exercícios:', error);
        setExerciciosIniciais([]);
      }
    } else {
      setExerciciosIniciais([]);
    }

    setIsModalOpen(true);
  };

  // ✅ CORREÇÃO: Nova função para lidar com múltiplos itens da sacola de uma vez
  const handleAdicionarMultiplosExercicios = (itens: ItemSacola[]) => {
    if (!treinoAtual) return;

    const exerciciosAtuais = exercicios[treinoAtual.id] || [];

    // Monta a lista final respeitando a ordem da sacola
    const exerciciosFinais = itens.flatMap(item => {
      if (item.tipo === 'simples') {
        // Procura se já existe um exercício com o mesmo exercicio_1_id
        const exercicioExistente = exerciciosAtuais.find(
          ex => ex.tipo === 'simples' && ex.exercicio_1_id === item.exercicio.id
        );

        if (exercicioExistente) {
          // Se já existe, mantém com todas as configurações (séries, intervalos, etc)
          return exercicioExistente;
        } else {
          // Se é novo, cria com valores padrão
          return {
            id: `ex_modelo_${Date.now()}_${Math.random()}`,
            exercicio_1_id: item.exercicio.id,
            tipo: 'simples',
            series: [{ id: `serie_${Date.now()}`, numero_serie: 1, repeticoes: undefined, carga: undefined, intervalo_apos_serie: 60 }],
            intervalo_apos_exercicio: 90
          };
        }
      } else if (item.tipo === 'combinacao') {
        // Procura se já existe uma combinação com os mesmos exercícios
        const exercicioExistente = exerciciosAtuais.find(
          ex => ex.tipo === 'combinada' &&
               ex.exercicio_1_id === item.exercicios[0].id &&
               ex.exercicio_2_id === item.exercicios[1].id
        );

        if (exercicioExistente) {
          // Se já existe, mantém com todas as configurações
          return exercicioExistente;
        } else {
          // Se é novo, cria com valores padrão
          return {
            id: `ex_modelo_${Date.now()}_${Math.random()}`,
            exercicio_1_id: item.exercicios[0].id,
            exercicio_2_id: item.exercicios[1].id,
            tipo: 'combinada',
            series: [{ id: `serie_comb_${Date.now()}`, numero_serie: 1, repeticoes_1: undefined, carga_1: undefined, repeticoes_2: undefined, carga_2: undefined, intervalo_apos_serie: 90 }],
            intervalo_apos_exercicio: 120
          };
        }
      }
      return [];
    });

    setExercicios({
      ...exercicios,
      [treinoAtual.id]: exerciciosFinais,
    });

    // Calcula quantos exercícios são realmente novos
    const novosCount = exerciciosFinais.length - exerciciosAtuais.length;
    if (novosCount > 0) {
      toast.success(`${novosCount} item(ns) adicionado(s) ao treino.`);
    }
  };

  const handleRemoverExercicio = (treinoId: string, exercicioId: string) => {
    const novosExercicios = { ...exercicios, [treinoId]: (exercicios[treinoId] || []).filter(ex => ex.id !== exercicioId) };
    setExercicios(novosExercicios);
  };

  const handleAtualizarExercicio = (treinoId: string, exercicioId: string, dados: Partial<ExercicioModelo>) => {
    const novosExercicios = { ...exercicios, [treinoId]: (exercicios[treinoId] || []).map(ex => ex.id === exercicioId ? { ...ex, ...dados } : ex) };
    setExercicios(novosExercicios);
  };

  const handleMoverExercicio = (treinoId: string, exercicioIndex: number, direcao: 'cima' | 'baixo') => {
    const treinoExercicios = [...(exercicios[treinoId] || [])];
    if (treinoExercicios.length < 2) return;

    const newIndex = direcao === 'cima' ? exercicioIndex - 1 : exercicioIndex + 1;
    if (newIndex < 0 || newIndex >= treinoExercicios.length) return;

    // Troca os exercícios de posição
    const temp = treinoExercicios[exercicioIndex];
    treinoExercicios[exercicioIndex] = treinoExercicios[newIndex];
    treinoExercicios[newIndex] = temp;

    setExercicios({ ...exercicios, [treinoId]: treinoExercicios });
  };

  const requisitosAtendidos = treinos.every(t => exercicios[t.id] && exercicios[t.id].length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etapa 3: Adição de Exercícios</CardTitle>
        <p className="text-muted-foreground">Adicione os exercícios para cada treino e configure as séries.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
        <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-blue-900">Requisitos para finalizar:</p>
              <p className="text-sm text-blue-700">Adicione pelo menos 1 exercício em cada treino.</p>
            </div>
            <Badge className={requisitosAtendidos ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
              {treinos.filter(t => exercicios[t.id] && exercicios[t.id].length > 0).length}/{treinos.length} completos
            </Badge>
          </div>
        </CardContent>
      </Card>
      
        <div className="space-y-4">
        {treinos.map(treino => {
          const isExpandido = treinosExpandidos[treino.id] ?? true;
          const qtdExercicios = (exercicios[treino.id] || []).length;
          return (
          <Card key={treino.id} className={qtdExercicios > 0 ? "border-green-200" : "border-gray-200"}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTreino(treino.id)}
                  className="p-1 h-8 w-8"
                >
                  {isExpandido ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </Button>
                <div>
                  <CardTitle className="text-lg">{treino.nome}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {treino.grupos_musculares.join(', ')} • {qtdExercicios} exercício{qtdExercicios !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {/* Botão para Mobile: redondo, apenas com ícone */}
              <Button type="button" variant="default" onClick={() => handleAbrirModal(treino)} className="md:hidden rounded-full h-10 w-10 p-0 flex-shrink-0 [&_svg]:size-6">
                <Plus />
              </Button>
              {/* Botão para Desktop: com ícone e texto */}
              <Button type="button" variant="default" onClick={() => handleAbrirModal(treino)} size="sm" className="hidden md:flex">
                <Plus className="h-4 w-4 mr-2" /> Exercício
              </Button>
            </CardHeader>
            {isExpandido && <CardContent>
              {(exercicios[treino.id] || []).length > 0 ? (
                <div className="space-y-4">
                  {exercicios[treino.id].map((ex, exIndex) => {
                    const combinedCounter = exercicios[treino.id].slice(0, exIndex + 1).filter(e => e.tipo === 'combinada').length;
                    const exercicioInfo1 = getExercicioInfo(ex.exercicio_1_id);
                    const exercicioInfo2 = ex.exercicio_2_id ? getExercicioInfo(ex.exercicio_2_id) : null;
                    const nomeExercicio = ex.tipo === 'combinada' && exercicioInfo2 ? `${exercicioInfo1.nome} + ${exercicioInfo2.nome}` : exercicioInfo1.nome;
                    const isPrimeiroExercicio = exIndex === 0;
                    const isUltimoExercicioDoTreino = exIndex === exercicios[treino.id].length - 1;

                    return (
                      <div key={ex.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col -space-y-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverExercicio(treino.id, exIndex, 'cima')} disabled={isPrimeiroExercicio} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"><ChevronUp className="h-5 w-5" /></Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverExercicio(treino.id, exIndex, 'baixo')} disabled={isUltimoExercicioDoTreino} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"><ChevronDown className="h-5 w-5" /></Button>
                            </div>
                            <h4 className="font-medium text-gray-900">{nomeExercicio}</h4>
                            {ex.tipo === 'combinada' && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                <Link className="h-3 w-3 mr-1" /> C{combinedCounter}
                              </Badge>
                            )}
                          </div>
                          <div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoverExercicio(treino.id, ex.id)} className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        {ex.tipo === 'simples' ? <SerieSimples exercicio={ex} treinoId={treino.id} isUltimoExercicio={isUltimoExercicioDoTreino} onUpdate={dados => handleAtualizarExercicio(treino.id, ex.id, dados)} />
                         : <SerieCombinada exercicio={ex} treinoId={treino.id} isUltimoExercicio={isUltimoExercicioDoTreino} onUpdate={dados => handleAtualizarExercicio(treino.id, ex.id, dados)} />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dumbbell className="h-10 w-10 mx-auto text-gray-300 mb-4" />
                  <p className="text-muted-foreground">Nenhum exercício adicionado.</p>
                </div>
              )}
            </CardContent>}
          </Card>
          );
        })}
        </div>
        
        {/* Espaçamento para botões fixos */}
        <div className="pb-20 md:pb-6" />

        {/* Botões de navegação - Desktop */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t p-4 hidden md:flex justify-between items-center z-50 px-6 lg:px-8">
          <Button variant="outline" onClick={handleVoltarClick} size="lg" disabled={isSaving}><ChevronLeft className="h-4 w-4 mr-2" /> Voltar</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancelar} size="lg" disabled={isSaving}>Cancelar</Button>
            <Button onClick={onFinalizar} disabled={!requisitosAtendidos || isSaving} size="lg" className="bg-green-600 hover:bg-green-700">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : <><Check className="h-4 w-4 mr-2" />Salvar Rotina</>}
            </Button>
          </div>
        </div>

        {/* Botões de navegação - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-50">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleVoltarClick} size="lg" disabled={isSaving}>Voltar</Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onCancelar} size="lg" disabled={isSaving}>Cancelar</Button>
                <Button onClick={onFinalizar} disabled={!requisitosAtendidos || isSaving} className="bg-green-600 hover:bg-green-700" size="lg">
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar"}
                </Button>
              </div>
          </div>
        </div>
        {isModalOpen && (
          <ExercicioModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConcluir={handleAdicionarMultiplosExercicios}
            gruposMuscularesFiltro={treinoAtual?.grupos_musculares || []}
            exerciciosJaAdicionados={treinoAtual ? (exercicios[treinoAtual.id] || []).flatMap(ex => [ex.exercicio_1_id, ex.exercicio_2_id]).filter(Boolean) as string[] : []}
            exerciciosIniciais={exerciciosIniciais}
          />)}
      </div>
      </CardContent>
    </Card>
  );
};

const RotinaCriacao = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>('configuracao');
  const [rotinaEmCriacao, setRotinaEmCriacao] = useState<RotinaEmCriacao>({});
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { getExercicioInfo } = useExercicioLookup();

  // Carregar dados do aluno e do sessionStorage
  useEffect(() => {
    const carregarDados = async () => {
      if (!alunoId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from('alunos').select('*').eq('id', alunoId).single();
        if (error || !data) {
          toast.error("Aluno não encontrado.");
          navigate('/alunos');
          return;
        }
        setAluno(data);

        const savedData = sessionStorage.getItem(`${STORAGE_KEY_ROTINA_CRIACAO}_${alunoId}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          setRotinaEmCriacao(parsedData);
          setEtapa(parsedData.etapaAtual || 'configuracao');
        }
      } catch (err) {
        toast.error("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, [alunoId, navigate]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateStorage = useCallback((data: Partial<RotinaEmCriacao>): Promise<void> => {
    return new Promise((resolve) => {
      setRotinaEmCriacao(prev => {
        const newData = { ...prev, ...data };
        sessionStorage.setItem(`${STORAGE_KEY_ROTINA_CRIACAO}_${alunoId}`, JSON.stringify(newData));
        resolve();
        return newData;
      });
    });
  }, [alunoId]);

  const handleAvancarConfiguracao = async (data: ModeloConfiguracaoData) => {
    const oldConfig = rotinaEmCriacao.configuracao;
    const newFrequency = data.treinos_por_semana;
    const oldFrequency = oldConfig?.treinos_por_semana;
    const treinosExistem = rotinaEmCriacao.treinos && rotinaEmCriacao.treinos.length > 0;
  
    if (newFrequency === undefined) {
      await updateStorage({ configuracao: data, etapaAtual: 'treinos' });
      setEtapa('treinos');
      return;
    }

    // Se a frequência mudou, reinicia os treinos e exercícios.
    if (oldFrequency !== undefined && newFrequency !== oldFrequency) {
      const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const novosTreinos = Array.from({ length: newFrequency }, (_, i) => ({
        id: `treino_draft_${Date.now()}_${i}`,
        nome: `Treino ${nomesTreinos[i] || String.fromCharCode(65 + i)}`,
        grupos_musculares: [],
        ordem: i + 1,
      }));
      await updateStorage({
        configuracao: data,
        treinos: novosTreinos,
        exercicios: {},
        etapaAtual: 'treinos'
      });
    } else {
      await updateStorage({ 
        configuracao: data, 
        etapaAtual: 'treinos' 
      });
    }
    setEtapa('treinos');
  };

  const handleAvancarTreinos = (data: TreinoTemp[]) => {
    const oldTreinos = rotinaEmCriacao.treinos || [];
    const oldExercicios = rotinaEmCriacao.exercicios || {};
    const newExercicios = { ...oldExercicios };
    let exerciciosForamResetados = false;

    data.forEach(newTreino => {
      const oldTreino = oldTreinos.find(t => t.id === newTreino.id);
      
      const oldGrupos = oldTreino ? [...oldTreino.grupos_musculares].sort() : [];
      const newGrupos = [...newTreino.grupos_musculares].sort();

      if (JSON.stringify(oldGrupos) !== JSON.stringify(newGrupos)) {
        if (newExercicios[newTreino.id] && newExercicios[newTreino.id].length > 0) {
          exerciciosForamResetados = true;
        }
        delete newExercicios[newTreino.id];
      }
    });

    if (exerciciosForamResetados) {
      toast.info("Exercícios reiniciados", {
        description: "Os exercícios de alguns treinos foram reiniciados devido à mudança nos grupos musculares."
      });
    }

    updateStorage({ treinos: data, exercicios: newExercicios, etapaAtual: 'exercicios' });
    setEtapa('exercicios');
  };

  const handleCancelar = () => {
    // ✅ CORREÇÃO: Se estiver na etapa de configuração, atualiza o estado principal
    // com os dados do formulário ANTES de abrir o modal de cancelamento.
    if (etapa === 'configuracao' && rotinaEmCriacao.configuracao) {
      // Esta chamada silenciosa garante que o `handleSaveAsDraft` terá os dados corretos.
      updateStorage({ configuracao: rotinaEmCriacao.configuracao });
    }
    setIsCancelModalOpen(true);
  };

  const confirmarDescarte = () => {
    sessionStorage.removeItem(`${STORAGE_KEY_ROTINA_CRIACAO}_${alunoId}`);
    navigate(`/alunos-rotinas/${alunoId}`, { replace: true });
  };

  const handleVoltar = () => {
    if (etapa === 'treinos') setEtapa('configuracao');
    else if (etapa === 'exercicios') setEtapa('treinos');
  };

  const handleSaveAsDraft = async () => {
    if (!user || !alunoId) {
      toast.error("Erro de autenticação.");
      return;
    }

    setIsSaving(true);

    const { draftId, configuracao, treinos, exercicios } = rotinaEmCriacao;

    if (!configuracao || !configuracao.nome || configuracao.nome.trim() === '') {
      toast.error("Nome da rotina é obrigatório", { description: "Por favor, forneça um nome para a rotina antes de salvar como rascunho." });
      setIsSaving(false);
      return;
    }

    try {
      let rotinaId: string;

      if (draftId) {
        // ATUALIZA o rascunho existente
        const { data: rotinaAtualizada, error: erroUpdate } = await supabase
          .from('rotinas')
          .update({
            nome: configuracao.nome,
            objetivo: configuracao.objetivo,
            dificuldade: configuracao.dificuldade,
            genero: configuracao.genero,
            treinos_por_semana: configuracao.treinos_por_semana,
            duracao_semanas: configuracao.duracao_semanas,
            data_inicio: configuracao.data_inicio,
            descricao: configuracao.descricao || null,
            status: 'Rascunho',
          })
          .eq('id', draftId)
          .select()
          .single();
        if (erroUpdate) throw erroUpdate;
        rotinaId = rotinaAtualizada.id;

        // Limpa dados antigos associados
        const { data: treinosAntigos } = await supabase.from('treinos').select('id').eq('rotina_id', rotinaId);
        
        if (treinosAntigos && treinosAntigos.length > 0) {
          const treinoIdsAntigos = treinosAntigos.map(t => t.id);
          
          // DELETAR EXERCÍCIOS E SÉRIES ANTIGOS (CASCADE)
          // O Supabase está configurado para deletar em cascata:
          // Deletar um 'treino' -> deleta 'exercicios_rotina' associados -> deleta 'series' associadas.
          // Portanto, basta deletar os treinos.
          
          await supabase.from('treinos').delete().in('id', treinoIdsAntigos);
        }

      } else {
        // INSERE um novo rascunho
        const { data: rotinaCriada, error: erroRotina } = await supabase
          .from('rotinas')
          .insert({
            aluno_id: alunoId,
            professor_id: user.id,
            nome: configuracao.nome,
            objetivo: configuracao.objetivo || null,
            dificuldade: configuracao.dificuldade || null,
            treinos_por_semana: configuracao.treinos_por_semana || 1,
            duracao_semanas: configuracao.duracao_semanas || 1,
            data_inicio: configuracao.data_inicio || null,
            descricao: configuracao.descricao || null,
            status: 'Rascunho',
            valor_total: 0,
            forma_pagamento: 'PIX',
          })
          .select()
          .single();
        if (erroRotina) throw erroRotina;
        rotinaId = rotinaCriada.id;
      }

      // A lógica de inserir treinos, exercícios e séries é a mesma para ambos os casos
      if (treinos && treinos.length > 0) {
        const treinosParaInserir = treinos.map((treino, index) => ({ rotina_id: rotinaId, nome: treino.nome, grupos_musculares: treino.grupos_musculares.join(','), ordem: index + 1, observacoes: treino.observacoes }));
        const { data: treinosCriados, error: erroTreinos } = await supabase.from('treinos').insert(treinosParaInserir).select();
        if (erroTreinos) throw erroTreinos;

        const mapaTreinoId = treinos.reduce((map, treinoTemp, index) => ({ ...map, [treinoTemp.id]: treinosCriados[index].id }), {} as Record<string, string>);

        if (exercicios) {
          for (const treinoTempId in exercicios) {
            const novoTreinoId = mapaTreinoId[treinoTempId];
            if (!novoTreinoId) continue;

            for (let i = 0; i < exercicios[treinoTempId].length; i++) {
              const exercicio = exercicios[treinoTempId][i];
              const { data: exercicioCriado, error: erroExercicio } = await supabase.from('exercicios_rotina').insert({ treino_id: novoTreinoId, exercicio_1_id: exercicio.exercicio_1_id, exercicio_2_id: exercicio.exercicio_2_id || null, ordem: i + 1, intervalo_apos_exercicio: exercicio.intervalo_apos_exercicio }).select().single();
              if (erroExercicio) throw erroExercicio;

              if (exercicio.series && exercicio.series.length > 0) {
                const seriesParaInserir = exercicio.series.map(s => ({
                  exercicio_id: exercicioCriado.id,
                  numero_serie: s.numero_serie,
                  repeticoes: s.repeticoes ?? 0, carga: s.carga ?? 0,
                  repeticoes_1: s.repeticoes_1 ?? 0, carga_1: s.carga_1 ?? 0,
                  repeticoes_2: s.repeticoes_2 ?? 0, carga_2: s.carga_2 ?? 0,
                  tem_dropset: s.tem_dropset ?? false, carga_dropset: s.carga_dropset ?? 0,
                  intervalo_apos_serie: s.intervalo_apos_serie ?? 60
                }));
                const { error: erroSeries } = await supabase.from('series').insert(seriesParaInserir);
                if (erroSeries) throw erroSeries;
              }
            }
          }
        }
      }

      sessionStorage.removeItem(`${STORAGE_KEY_ROTINA_CRIACAO}_${alunoId}`);
      toast.success("Rascunho salvo com sucesso!");
      
      const from = location.state?.from;
      if (from === '/rotinas') {
        navigate('/rotinas', { replace: true });
      } else {
        navigate(`/alunos-rotinas/${alunoId}`, { replace: true });
      }
    } catch (error) {
      console.error("Erro ao salvar rascunho:", error);
      toast.error("Erro ao Salvar Rascunho", { description: error instanceof Error ? error.message : "Não foi possível salvar o rascunho." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizar = async () => {
    if (!user || !alunoId) {
      toast.error("Erro de autenticação", { description: "Você precisa estar logado para salvar uma rotina." });
      return;
    }

    setIsSaving(true);

    const { draftId, configuracao, treinos, exercicios } = rotinaEmCriacao;

    if (!configuracao || !treinos || !exercicios) {
      toast.error("Dados incompletos", { description: "Não foi possível salvar a rotina pois os dados estão incompletos." });
      setIsSaving(false);
      return;
    }

    try {
      let rotinaId: string;

      if (draftId) {
        // UPDATE existing draft
        console.log(`🔄 Atualizando rascunho com ID: ${draftId}`);
        const { data: rotinaAtualizada, error: erroUpdate } = await supabase
          .from('rotinas')
          .update({
            nome: configuracao.nome,
            objetivo: configuracao.objetivo,
            dificuldade: configuracao.dificuldade,
            genero: configuracao.genero,
            treinos_por_semana: configuracao.treinos_por_semana,
            duracao_semanas: configuracao.duracao_semanas,
            data_inicio: configuracao.data_inicio,
            descricao: configuracao.descricao || null,
            status: 'Ativa', // The main change
            permite_execucao_aluno: true, // ✅ CORREÇÃO: Garantir que seja true ao finalizar
          })
          .eq('id', draftId)
          .select()
          .single();
        
        if (erroUpdate) throw erroUpdate;
        rotinaId = rotinaAtualizada.id;

        // Delete old associated data.
        const { error: deleteSessoesError } = await supabase
          .from('execucoes_sessao')
          .delete()
          .eq('rotina_id', rotinaId);
        if (deleteSessoesError) throw deleteSessoesError;

        const { error: deleteTreinosError } = await supabase
          .from('treinos')
          .delete()
          .eq('rotina_id', rotinaId);
        
        if (deleteTreinosError) throw deleteTreinosError;
        
        console.log(`🗑️ Dados antigos (treinos, sessões) do rascunho ${rotinaId} deletados.`);

      } else {
        // INSERT new routine
        let professorIdParaRotina = user.id;

        // Se o usuário logado for o admin, precisamos encontrar o professor real do aluno.
        if (user.email === 'contato@titans.fitness') {
          const { data: relacao } = await supabase
            .from('alunos_professores')
            .select('professor_id')
            .eq('aluno_id', alunoId)
            .limit(1)
            .single();
          
          if (relacao) {
            professorIdParaRotina = relacao.professor_id;
          }
        }

        const { data: novaRotina, error: erroRotina } = await supabase
          .from('rotinas')
          .insert({
            aluno_id: alunoId,
            professor_id: professorIdParaRotina,
            nome: configuracao.nome,
            objetivo: configuracao.objetivo,
            dificuldade: configuracao.dificuldade,
            genero: configuracao.genero,
            treinos_por_semana: configuracao.treinos_por_semana,
            duracao_semanas: configuracao.duracao_semanas,
            data_inicio: configuracao.data_inicio,
            descricao: configuracao.descricao || null,
            valor_total: 0,
            forma_pagamento: 'PIX',
            status: 'Ativa',
            permite_execucao_aluno: true, // ✅ CORREÇÃO: Garantir que seja true ao criar
          })
          .select()
          .single();

        if (erroRotina) throw erroRotina;
        rotinaId = novaRotina.id;
      }

      // The rest of the logic is the same for both cases.
      // 2. Inserir os treinos
      const treinosParaInserir = treinos.map((treino, index) => ({
        rotina_id: rotinaId,
        nome: treino.nome,
        grupos_musculares: treino.grupos_musculares.join(','),
        ordem: index + 1,
        observacoes: treino.observacoes,
      }));
      const { data: treinosCriados, error: erroTreinos } = await supabase.from('treinos').insert(treinosParaInserir).select();
      if (erroTreinos) throw erroTreinos;

      const mapaTreinoId = treinos.reduce((map, treinoTemp, index) => ({ ...map, [treinoTemp.id]: treinosCriados[index].id }), {} as Record<string, string>);

      // 3. Inserir exercícios e séries
      for (const treinoTempId in exercicios) {
        const novoTreinoId = mapaTreinoId[treinoTempId];
        if (!novoTreinoId) continue;
        const exerciciosDoTreino = exercicios[treinoTempId];
        for (let i = 0; i < exerciciosDoTreino.length; i++) {
          const exercicio = exerciciosDoTreino[i];
          const { data: exercicioCriado, error: erroExercicio } = await supabase.from('exercicios_rotina').insert({
            treino_id: novoTreinoId,
            exercicio_1_id: exercicio.exercicio_1_id,
            exercicio_2_id: exercicio.exercicio_2_id || null,
            ordem: i + 1,
            intervalo_apos_exercicio: exercicio.intervalo_apos_exercicio,
          }).select().single();
          if (erroExercicio) throw erroExercicio;

          const seriesParaInserir = exercicio.series.map(serie => ({
            exercicio_id: exercicioCriado.id,
            numero_serie: serie.numero_serie,
            repeticoes: serie.repeticoes ?? 0, carga: serie.carga ?? 0,
            repeticoes_1: serie.repeticoes_1 ?? 0, carga_1: serie.carga_1 ?? 0,
            repeticoes_2: serie.repeticoes_2 ?? 0, carga_2: serie.carga_2 ?? 0,
            tem_dropset: serie.tem_dropset ?? false, carga_dropset: serie.carga_dropset ?? 0,
            intervalo_apos_serie: serie.intervalo_apos_serie ?? 60,
          }));
          if (seriesParaInserir.length > 0) {
            const { error: erroSeries } = await supabase.from('series').insert(seriesParaInserir);
            if (erroSeries) throw erroSeries;
          }
        }
      }

      // 4. Criar as sessões de execução
      const sessoesParaInserir = [];
      const totalSessoes = (configuracao.duracao_semanas ?? 1) * (configuracao.treinos_por_semana ?? 1);
      for (let i = 0; i < totalSessoes; i++) {
        const treinoDaSessao = treinosCriados[i % treinosCriados.length];
        sessoesParaInserir.push({
          rotina_id: rotinaId,
          treino_id: treinoDaSessao.id,
          aluno_id: alunoId,
          sessao_numero: i + 1,
          status: 'em_aberto',
          modo_execucao: null, // Garante que o modo de execução seja nulo na criação
        });
      }
      if (sessoesParaInserir.length > 0) {
        const { error: erroSessoes } = await supabase.from('execucoes_sessao').insert(sessoesParaInserir);
        if (erroSessoes) throw erroSessoes;
      }

      // 5. Limpeza e navegação
      sessionStorage.removeItem(`${STORAGE_KEY_ROTINA_CRIACAO}_${alunoId}`);

      const from = location.state?.from;
      if (from === '/rotinas') {
        navigate('/rotinas', { replace: true });
      } else {
        navigate(`/alunos-rotinas/${alunoId}`, { replace: true });
      }

    } catch (error) {
      console.error("Erro ao salvar rotina:", error);
      toast.error("Erro ao Salvar", { description: error instanceof Error ? error.message : "Não foi possível salvar a rotina. Tente novamente." });
    } finally {
      setIsSaving(false);
    }
  };

  const renderEtapa = () => {
    switch (etapa) {
      case 'configuracao':
        return <RotinaConfiguracaoStep onAvancar={handleAvancarConfiguracao} initialData={rotinaEmCriacao.configuracao} onCancelar={handleCancelar} aluno={aluno} onUpdate={updateStorage} />;
      case 'treinos':
        return <RotinaTreinosStep onAvancar={handleAvancarTreinos} onVoltar={handleVoltar} initialData={rotinaEmCriacao.treinos} configuracao={rotinaEmCriacao.configuracao} onCancelar={handleCancelar} onUpdate={updateStorage} />;
      case 'exercicios':
        return <RotinaExerciciosStep onFinalizar={handleFinalizar} onVoltar={handleVoltar} exercicios={rotinaEmCriacao.exercicios || {}} treinos={rotinaEmCriacao.treinos || []} setExercicios={(novosExercicios) => updateStorage({ exercicios: novosExercicios })} onCancelar={handleCancelar} isSaving={isSaving} />;
      default:
        return <RotinaConfiguracaoStep onAvancar={handleAvancarConfiguracao} initialData={rotinaEmCriacao.configuracao} onCancelar={handleCancelar} aluno={aluno} onUpdate={updateStorage} />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando editor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O que deseja fazer?</AlertDialogTitle>
            <AlertDialogDescription>
              Você pode salvar seu progresso como um rascunho para continuar depois ou descartar todas as alterações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel onClick={confirmarDescarte}>Descartar Alterações</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAsDraft}>Salvar como Rascunho</AlertDialogAction>
          </AlertDialogFooter>
          <AlertDialogCancel className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground p-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Continuar editando</span>
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
      {renderEtapa()}
    </div>
  );
};

export default RotinaCriacao;