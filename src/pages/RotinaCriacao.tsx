// src/pages/RotinaCriacao.tsx

import React, { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomSelect from "@/components/ui/CustomSelect";
import { toast } from 'sonner';
import { Plus, Trash2, Save, X, Dumbbell, Check, Loader2, ChevronRight, ChevronLeft, GripVertical } from 'lucide-react';
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
  OBJETIVOS, 
  DIFICULDADES,
  Aluno
} from '@/types/rotina.types';
import { Tables } from '@/integrations/supabase/types';

// Reusable Components
import { ExercicioModal } from '@/components/rotina/criacao/ExercicioModal';
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
const OBJETIVOS_OPTIONS = OBJETIVOS.map(o => ({ value: o, label: o }));
const DIFICULDADES_OPTIONS = DIFICULDADES.map(d => ({ value: d, label: d }));
const DURACAO_OPTIONS = Array.from({ length: 52 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} semana${i > 0 ? 's' : ''}` }));
const TREINOS_OPTIONS = Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}x / semana` }));
const GRUPOS_MUSCULARES = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'
];
const CORES_GRUPOS_MUSCULARES: { [key: string]: string } = {
  'Peito': 'bg-red-100 text-red-800',
  'Costas': 'bg-blue-100 text-blue-800',
  'Pernas': 'bg-green-100 text-green-800',
  'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800',
  'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800',
  'Glúteos': 'bg-violet-100 text-violet-800',
  'Panturrilha': 'bg-indigo-100 text-indigo-800'
};
const STORAGE_KEY = 'rotina_em_criacao';

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
  initialData?: Record<string, ExercicioModelo[]>;
  treinos: TreinoTemp[];
  onUpdate: (data: Partial<RotinaEmCriacao>) => void;
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
      duracao_semanas: 1,
      treinos_por_semana: 1,
      data_inicio: new Date().toISOString().split('T')[0],
      descricao: '',
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mantém o estado principal atualizado
  useEffect(() => {
    onUpdate({ configuracao: formData });
  }, [formData, onUpdate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome || formData.nome.trim().length < 3) newErrors.nome = "O nome da rotina deve ter pelo menos 3 caracteres.";
    if (!formData.objetivo) newErrors.objetivo = "O objetivo é obrigatório.";
    if (!formData.dificuldade) newErrors.dificuldade = "A dificuldade é obrigatória.";
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

const SortableTreinoCard = ({ id, treino, index, adicionarGrupoMuscular, removerGrupoMuscular }: {
  id: string;
  treino: TreinoTemp;
  index: number;
  adicionarGrupoMuscular: (index: number, grupo: string) => void;
  removerGrupoMuscular: (index: number, grupo: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const treinoCompleto = treino.grupos_musculares.length > 0;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={treinoCompleto ? "border-green-200" : "border-gray-200"}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <div {...listeners} className="flex items-center cursor-grab p-2 -m-2 rounded-lg">
              <GripVertical className="h-5 w-5 mr-2 text-gray-400" />
              Treino {String.fromCharCode(65 + index)}
            </div>
            {treinoCompleto && (
              <Badge className="bg-green-100 text-green-800 text-xs flex items-center gap-1">
                <Check className="h-3 w-3 mr-1" />
                Requisitos
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label>Grupos Musculares</Label>
            <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-gray-50">
              {treino.grupos_musculares.length > 0 ? (
                treino.grupos_musculares.map(grupo => (
                  <Badge key={grupo} variant="secondary" className={`${CORES_GRUPOS_MUSCULARES[grupo] || 'bg-gray-100 text-gray-800'} cursor-pointer hover:opacity-80`} onClick={() => removerGrupoMuscular(index, grupo)}>
                    {grupo} <Trash2 className="h-3 w-3 ml-1.5" />
                  </Badge>
                ))
              ) : <span className="text-gray-500 text-sm p-1">Selecione os grupos musculares abaixo</span>}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Adicionar Grupos:</Label>
            <div className="flex flex-wrap gap-2">
              {GRUPOS_MUSCULARES.filter(g => !treino.grupos_musculares.includes(g)).map(g => (
                <Badge key={g} variant="outline" className="cursor-pointer hover:bg-gray-100" onClick={() => adicionarGrupoMuscular(index, g)}><Plus className="h-3 w-3 mr-1" />{g}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Etapa 2: Componente de Treinos (EXATAMENTE igual ao NovoModelo) ---
const RotinaTreinosStep = ({ onAvancar, onVoltar, initialData, configuracao, onCancelar, onUpdate }: RotinaTreinosStepProps) => {
  const [treinos, setTreinos] = useState<TreinoTemp[]>(() => {
    if (initialData && initialData.length > 0) {
      return initialData;
    }
    if (configuracao?.treinos_por_semana) {
      const frequencia = configuracao.treinos_por_semana;
      const treinosIniciais: TreinoTemp[] = [];
      const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      for (let i = 0; i < frequencia; i++) {
        treinosIniciais.push({
          id: `treino_draft_${Date.now()}_${i}`,
          nome: `Treino ${nomesTreinos[i] || String.fromCharCode(65 + i)}`,
          grupos_musculares: [],
          ordem: i + 1,
        });
      }
      return treinosIniciais;
    }
    return [];
  });

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = treinos.findIndex((t) => t.id === active.id);
      const newIndex = treinos.findIndex((t) => t.id === over.id);
      const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      setTreinos((items) => arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        ordem: index + 1,
        nome: `Treino ${nomesTreinos[index] || String.fromCharCode(65 + index)}`
      })));
    }
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
        <p className="text-muted-foreground">Defina os nomes e grupos musculares para cada treino da semana.</p>
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
      
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={treinos.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {treinos.map((treino, index) => (
                <SortableTreinoCard key={treino.id} id={treino.id} treino={treino} index={index} adicionarGrupoMuscular={adicionarGrupoMuscular} removerGrupoMuscular={removerGrupoMuscular} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      
        {/* Espaçamento para botões fixos */}
      <div className="pb-20 md:pb-6" />

      {/* Botões de navegação - Desktop */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t p-4 hidden md:flex justify-between items-center z-50 px-6 lg:px-8">
          <Button variant="outline" onClick={handleVoltarClick} size="lg">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancelar} size="lg">
                Cancelar
            </Button>
            <Button onClick={handleProximo} disabled={!requisitosAtendidos} size="lg">
              Avançar para Exercícios <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
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
const RotinaExerciciosStep = ({ onFinalizar, onVoltar, initialData, treinos, onUpdate, onCancelar, isSaving }: RotinaExerciciosStepProps) => {
  const [exercicios, setExercicios] = useState<Record<string, ExercicioModelo[]>>(initialData || {});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treinoAtual, setTreinoAtual] = useState<TreinoTemp | null>(null);
  const { getExercicioInfo } = useExercicioLookup();

  useEffect(() => { onUpdate({ exercicios }); }, [exercicios, onUpdate]);

  const handleAbrirModal = (treino: TreinoTemp) => {
    setTreinoAtual(treino);
    setIsModalOpen(true);
  };

  const handleAdicionarExercicios = (exerciciosSelecionados: Tables<'exercicios'>[]) => {
    if (!treinoAtual || exerciciosSelecionados.length === 0) return;
    let exerciciosParaAdicionar: ExercicioModelo[] = [];
    if (exerciciosSelecionados.length === 2) {
      exerciciosParaAdicionar.push({ id: `ex_modelo_${Date.now()}`, exercicio_1_id: exerciciosSelecionados[0].id, exercicio_2_id: exerciciosSelecionados[1].id, tipo: 'combinada', series: [{ id: `serie_comb_${Date.now()}`, numero_serie: 1, repeticoes_1: 0, carga_1: 0, repeticoes_2: 0, carga_2: 0, intervalo_apos_serie: 90 }], intervalo_apos_exercicio: 120 });
    } else {
      exerciciosParaAdicionar = exerciciosSelecionados.map(ex => ({ id: `ex_modelo_${Date.now()}_${Math.random()}`, exercicio_1_id: ex.id, tipo: 'simples', series: [{ id: `serie_${Date.now()}`, numero_serie: 1, repeticoes: 0, carga: 0, intervalo_apos_serie: 60 }], intervalo_apos_exercicio: 90 }));
    }
    setExercicios(prev => ({ ...prev, [treinoAtual.id]: [...(prev[treinoAtual.id] || []), ...exerciciosParaAdicionar] }));
    setIsModalOpen(false);
  };

  const handleRemoverExercicio = (treinoId: string, exercicioId: string) => {
    setExercicios(prev => ({ ...prev, [treinoId]: (prev[treinoId] || []).filter(ex => ex.id !== exercicioId) }));
  };

  const handleAtualizarExercicio = (treinoId: string, exercicioId: string, dados: Partial<ExercicioModelo>) => {
    setExercicios(prev => ({ ...prev, [treinoId]: (prev[treinoId] || []).map(ex => ex.id === exercicioId ? { ...ex, ...dados } : ex) }));
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
        {treinos.map(treino => (
          <Card key={treino.id} className={exercicios[treino.id]?.length > 0 ? "border-green-200" : "border-gray-200"}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{treino.nome}</CardTitle>
                <p className="text-sm text-muted-foreground">{treino.grupos_musculares.join(', ')}</p>
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
            <CardContent>
              {(exercicios[treino.id] || []).length > 0 ? (
                <div className="space-y-4">
                  {exercicios[treino.id].map((ex, exIndex) => {
                    const exercicioInfo1 = getExercicioInfo(ex.exercicio_1_id);
                    const exercicioInfo2 = ex.exercicio_2_id ? getExercicioInfo(ex.exercicio_2_id) : null;
                    const nomeExercicio = ex.tipo === 'combinada' && exercicioInfo2 ? `${exercicioInfo1.nome} + ${exercicioInfo2.nome}` : exercicioInfo1.nome;
                    const isUltimoExercicioDoTreino = exIndex === exercicios[treino.id].length - 1;

                    return (
                      <div key={ex.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{nomeExercicio}</h4>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoverExercicio(treino.id, ex.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        {ex.tipo === 'simples' ? (
                          <SerieSimples exercicio={ex} treinoId={treino.id} isUltimoExercicio={isUltimoExercicioDoTreino} onUpdate={dados => handleAtualizarExercicio(treino.id, ex.id, dados)} />
                        ) : (
                          <SerieCombinada exercicio={ex} treinoId={treino.id} isUltimoExercicio={isUltimoExercicioDoTreino} onUpdate={dados => handleAtualizarExercicio(treino.id, ex.id, dados)} />
                        )}
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
            </CardContent>
          </Card>
        ))}
        </div>
        
        {/* Espaçamento para botões fixos */}
        <div className="pb-20 md:pb-6" />

        {/* Botões de navegação - Desktop */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t p-4 hidden md:flex justify-between items-center z-50 px-6 lg:px-8">
          <Button variant="outline" onClick={onVoltar} size="lg" disabled={isSaving}><ChevronLeft className="h-4 w-4 mr-2" /> Voltar</Button>
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
              <Button variant="outline" onClick={onVoltar} size="lg" disabled={isSaving}>Voltar</Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onCancelar} size="lg" disabled={isSaving}>Cancelar</Button>
                <Button onClick={onFinalizar} disabled={!requisitosAtendidos || isSaving} className="bg-green-600 hover:bg-green-700" size="lg">
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar"}
                </Button>
              </div>
          </div>
        </div>
        {isModalOpen && <ExercicioModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleAdicionarExercicios} gruposMuscularesFiltro={treinoAtual?.grupos_musculares || []} />}
      </div>
      </CardContent>
    </Card>
  );
};

const RotinaCriacao = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const navigate = useNavigate();
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

        const savedData = sessionStorage.getItem(`${STORAGE_KEY}_${alunoId}`);
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

  const updateStorage = useCallback((data: Partial<RotinaEmCriacao>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');

    setTimeout(() => {
      setRotinaEmCriacao(prev => {
        const newData = { ...prev, ...data };
        sessionStorage.setItem(`${STORAGE_KEY}_${alunoId}`, JSON.stringify(newData));
        return newData;
      });
      setSaveStatus('saved');
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 300);
  }, [alunoId]);

  const handleAvancarConfiguracao = (data: ModeloConfiguracaoData) => {
    const oldConfig = rotinaEmCriacao.configuracao;
    const oldTreinos = rotinaEmCriacao.treinos || [];
    const oldExercicios = rotinaEmCriacao.exercicios || {};

    const newFrequency = data.treinos_por_semana;
    const oldFrequency = oldConfig?.treinos_por_semana;

    let updatedTreinos = [...oldTreinos];
    const updatedExercicios = { ...oldExercicios };

    // Ajusta o número de treinos se a frequência mudou
    if (newFrequency !== undefined && oldFrequency !== undefined && newFrequency !== oldFrequency) {
      const currentCount = updatedTreinos.length;

      if (newFrequency > currentCount) {
        // Aumentou a frequência: adiciona novos treinos vazios
        const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        for (let i = currentCount; i < newFrequency; i++) {
          updatedTreinos.push({
            id: `treino_draft_${Date.now()}_${i}`,
            nome: `Treino ${nomesTreinos[i] || String.fromCharCode(65 + i)}`,
            grupos_musculares: [],
            ordem: i + 1,
          });
        }
      } else if (newFrequency < currentCount) {
        // Diminuiu a frequência: remove treinos e seus exercícios
        const treinosParaRemover = updatedTreinos.slice(newFrequency);
        updatedTreinos = updatedTreinos.slice(0, newFrequency);

        treinosParaRemover.forEach(treino => {
          if (updatedExercicios[treino.id]) {
            delete updatedExercicios[treino.id];
          }
        });
      }
    }

    updateStorage({ configuracao: data, treinos: updatedTreinos, exercicios: updatedExercicios, etapaAtual: 'treinos' });
    setEtapa('treinos');
  };

  const handleAvancarTreinos = (data: TreinoTemp[]) => {
    const oldExercicios = rotinaEmCriacao.exercicios || {};
    const newExercicios = { ...oldExercicios };
    let hasChanges = false;

    const compareMuscleGroups = (arr1: string[], arr2: string[]) => {
      if (arr1.length !== arr2.length) return false;
      const sorted1 = [...arr1].sort();
      const sorted2 = [...arr2].sort();
      return sorted1.every((value, index) => value === sorted2[index]);
    };

    data.forEach(newTreino => {
      const oldTreino = rotinaEmCriacao.treinos?.find(t => t.id === newTreino.id);

      if (oldTreino && !compareMuscleGroups(oldTreino.grupos_musculares, newTreino.grupos_musculares)) {
        const exercisesForThisTreino = newExercicios[newTreino.id] || [];

        if (exercisesForThisTreino.length > 0) {
          const filteredExercises = exercisesForThisTreino.filter(ex => {
            const info1 = getExercicioInfo(ex.exercicio_1_id);
            if (info1.grupo_muscular && newTreino.grupos_musculares.includes(info1.grupo_muscular)) return true;
            if (ex.exercicio_2_id) {
              const info2 = getExercicioInfo(ex.exercicio_2_id);
              if (info2.grupo_muscular && newTreino.grupos_musculares.includes(info2.grupo_muscular)) return true;
            }
            return false;
          });

          if (filteredExercises.length < exercisesForThisTreino.length) {
            toast.info(`Exercícios removidos do ${newTreino.nome}`, { description: "Alguns exercícios foram removidos por não pertencerem mais aos grupos musculares selecionados." });
          }
          newExercicios[newTreino.id] = filteredExercises;
          hasChanges = true;
        }
      }
    });
    updateStorage({ treinos: data, exercicios: hasChanges ? newExercicios : oldExercicios, etapaAtual: 'exercicios' });
    setEtapa('exercicios');
  };

  const handleCancelar = () => {
    setIsCancelModalOpen(true);
  };

  const confirmarDescarte = () => {
    sessionStorage.removeItem(`${STORAGE_KEY}_${alunoId}`);
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

    const { configuracao, treinos, exercicios } = rotinaEmCriacao;

    if (!configuracao || !configuracao.nome || configuracao.nome.trim() === '') {
      toast.error("Nome da rotina é obrigatório", { description: "Por favor, forneça um nome para a rotina antes de salvar como rascunho." });
      setIsSaving(false);
      return;
    }

    try {
      // 1. Inserir a rotina principal como rascunho
      const { data: rotinaCriada, error: erroRotina } = await supabase
        .from('rotinas')
        .insert({
          aluno_id: alunoId,
          professor_id: user.id,
          nome: configuracao.nome || `Rascunho - ${new Date().toLocaleDateString()}`,
          objetivo: configuracao.objetivo || null,
          dificuldade: configuracao.dificuldade || null, // Permite nulo, conforme alteração no DB
          treinos_por_semana: configuracao.treinos_por_semana || 1, // Valor padrão para NOT NULL
          duracao_semanas: configuracao.duracao_semanas || 1, // Valor padrão para NOT NULL
          data_inicio: configuracao.data_inicio || null,
          descricao: configuracao.descricao || null,
          status: 'Rascunho', // Chave para salvar como rascunho
          valor_total: 0, // Valor padrão para NOT NULL
          forma_pagamento: 'PIX', // Valor padrão para NOT NULL
        })
        .select()
        .single();

      if (erroRotina) throw erroRotina;

      // 2. Inserir treinos, exercícios e séries se existirem
      if (treinos && treinos.length > 0) {
        const treinosParaInserir = treinos.map((treino, index) => ({ rotina_id: rotinaCriada.id, nome: treino.nome, grupos_musculares: treino.grupos_musculares.join(','), ordem: index + 1, observacoes: treino.observacoes }));
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
                  repeticoes: s.repeticoes ?? 0,
                  carga: s.carga ?? 0,
                  repeticoes_1: s.repeticoes_1 ?? 0,
                  carga_1: s.carga_1 ?? 0,
                  repeticoes_2: s.repeticoes_2 ?? 0,
                  carga_2: s.carga_2 ?? 0,
                  tem_dropset: s.tem_dropset ?? false,
                  carga_dropset: s.carga_dropset ?? 0,
                  intervalo_apos_serie: s.intervalo_apos_serie ?? 60
                }));
                const { error: erroSeries } = await supabase.from('series').insert(seriesParaInserir);
                if (erroSeries) throw erroSeries;
              }
            }
          }
        }
      }

      toast.success("Rascunho salvo com sucesso!");
      sessionStorage.removeItem(`${STORAGE_KEY}_${alunoId}`);
      navigate(`/alunos-rotinas/${alunoId}`, { replace: true });
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
      // 1. VERIFICA SE JÁ EXISTE ROTINA ATIVA (NOVA REGRA DE NEGÓCIO)
      // A verificação só é necessária se NÃO estivermos finalizando um rascunho,
      // pois a finalização de um rascunho é uma atualização, não uma criação de conflito.
      if (!draftId) {
        const { data: rotinaAtivaExistente, error: checkError } = await supabase
          .from('rotinas')
          .select('id, professores(nome_completo)')
          .eq('aluno_id', alunoId)
          .eq('status', 'Ativa')
          .maybeSingle(); // Usar maybeSingle para não dar erro se não encontrar nada

        // Ignora o erro se for 'PGRST116' (nenhuma linha encontrada), que é o cenário esperado.
        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error(`Erro ao verificar rotina ativa: ${checkError.message}`);
        }

        if (rotinaAtivaExistente) {
          const nomeProfessor = rotinaAtivaExistente.professores?.nome_completo || 'outro professor';
          toast.error("Não é possível criar a rotina", {
            description: `Este aluno já possui uma rotina ativa criada por ${nomeProfessor}. Peça para o aluno cancelar a rotina atual antes de criar uma nova.`,
            duration: 6000,
          });
          setIsSaving(false);
          return;
        }
      }

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
            treinos_por_semana: configuracao.treinos_por_semana,
            duracao_semanas: configuracao.duracao_semanas,
            data_inicio: configuracao.data_inicio,
            descricao: configuracao.descricao || null,
            status: 'Ativa', // The main change
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
        const { data: novaRotina, error: erroRotina } = await supabase
          .from('rotinas')
          .insert({
            aluno_id: alunoId,
            professor_id: user.id,
            nome: configuracao.nome,
            objetivo: configuracao.objetivo,
            dificuldade: configuracao.dificuldade,
            treinos_por_semana: configuracao.treinos_por_semana,
            duracao_semanas: configuracao.duracao_semanas,
            data_inicio: configuracao.data_inicio,
            descricao: configuracao.descricao || null,
            valor_total: 0,
            forma_pagamento: 'PIX',
            status: 'Ativa',
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
      toast.success(draftId ? "Rascunho finalizado com sucesso!" : "Rotina criada com sucesso!");
      sessionStorage.removeItem(`${STORAGE_KEY}_${alunoId}`);
      navigate(`/alunos-rotinas/${alunoId}`, { replace: true });

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
        return <RotinaExerciciosStep onFinalizar={handleFinalizar} onVoltar={handleVoltar} initialData={rotinaEmCriacao.exercicios} treinos={rotinaEmCriacao.treinos || []} onUpdate={updateStorage} onCancelar={handleCancelar} isSaving={isSaving} />;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Criar Nova Rotina</h1>
          {aluno && <span className="font-medium text-lg">{aluno.nome_completo}</span>}
        </div>
        {saveStatus !== 'idle' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground transition-opacity duration-300">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando rascunho...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Rascunho salvo!
              </>
            )}
          </div>
        )}
      </div>
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