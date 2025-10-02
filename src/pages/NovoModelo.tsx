import { useState, useEffect, FormEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, GripVertical, Plus, Trash2, X, Dumbbell, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useExercicioLookup } from "@/hooks/useExercicioLookup";
import { SerieSimples } from "@/components/rotina/criacao/SerieSimples";
import { SerieCombinada } from "@/components/rotina/criacao/SerieCombinada";
import { ExercicioModal } from "@/components/rotina/criacao/ExercicioModal";
import { Tables } from "@/integrations/supabase/types";
import CustomSelect from "@/components/ui/CustomSelect";

// --- Constantes ---
const OBJETIVOS = ['Ganho de massa', 'Emagrecimento', 'Definição muscular', 'Condicionamento físico', 'Reabilitação', 'Performance esportiva'];
const DIFICULDADES = ['Baixa', 'Média', 'Alta'];
const FREQUENCIAS = [1, 2, 3, 4, 5, 6, 7];
const GRUPOS_MUSCULARES = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'];
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

const OBJETIVOS_OPTIONS = OBJETIVOS.map(o => ({ value: o, label: o }));
const DIFICULDADES_OPTIONS = DIFICULDADES.map(d => ({ value: d, label: d }));
const FREQUENCIAS_OPTIONS = FREQUENCIAS.map(f => ({ value: String(f), label: `${f}x / semana` }));
const DURACAO_OPTIONS = Array.from({ length: 52 }, (_, i) => i + 1).map(semana => ({ value: String(semana), label: `${semana} semana${semana > 1 ? 's' : ''}` }));

type ModeloConfiguracaoData = {
  nome: string;
  objetivo: string;
  dificuldade: string;
  treinos_por_semana: number | undefined;
  duracao_semanas: number | undefined;
  observacoes_rotina?: string;
};

interface TreinoTemp {
  id: string;
  nome: string;
  grupos_musculares: string[];
  observacoes?: string;
  ordem: number;
  tempo_estimado_minutos?: number;
}

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

interface ModeloConfiguracaoProps {
  onAvancar: (data: ModeloConfiguracaoData) => void;
  initialData?: ModeloConfiguracaoData;
  onCancelar: () => void;
}

interface ModeloTreinosProps {
  onAvancar: (data: TreinoTemp[]) => void;
  onVoltar: () => void;
  initialData?: TreinoTemp[];
  configuracao?: ModeloConfiguracaoData;
  onCancelar: () => void;
  onUpdate: (data: Partial<ModeloEmCriacao>) => void;
}

interface ModeloExerciciosProps {
  onFinalizar: () => void;
  onVoltar: () => void;
  initialData?: Record<string, ExercicioModelo[]>;
  treinos: TreinoTemp[];
  onUpdate: (data: Partial<ModeloEmCriacao>) => void;
  onCancelar: () => void;
  isSaving: boolean;
}

// --- Etapa 1: Componente de Configuração ---
const ModeloConfiguracao = ({ onAvancar, initialData, onCancelar }: ModeloConfiguracaoProps) => {
  const [formData, setFormData] = useState<ModeloConfiguracaoData>(
    initialData ?? {
      nome: "",
      objetivo: "",
      dificuldade: "",
      treinos_por_semana: undefined,
      duracao_semanas: undefined,
      observacoes_rotina: "",
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome || formData.nome.trim().length < 3) {
      newErrors.nome = "O nome do modelo deve ter pelo menos 3 caracteres.";
    }
    if (!formData.objetivo) newErrors.objetivo = "O objetivo é obrigatório.";
    if (!formData.dificuldade) newErrors.dificuldade = "A dificuldade é obrigatória.";
    if (!formData.treinos_por_semana) newErrors.treinos_por_semana = "A frequência é obrigatória.";
    if (!formData.duracao_semanas) newErrors.duracao_semanas = "A duração é obrigatória.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ModeloConfiguracaoData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
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
        <CardTitle>Etapa 1: Configuração do Modelo</CardTitle>
        <p className="text-muted-foreground">Defina as características principais do seu novo modelo de treino.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Modelo</Label>
            <Input
              id="nome"
              placeholder="Ex: Hipertrofia para Iniciantes"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
            />
            {errors.nome && <p className="text-sm text-destructive mt-1">{errors.nome}</p>}
          </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <CustomSelect
                inputId="objetivo"
                value={OBJETIVOS_OPTIONS.find(opt => opt.value === formData.objetivo)}
                onChange={(option) => handleInputChange('objetivo', option ? option.value : '')}
                options={OBJETIVOS_OPTIONS}
                placeholder="Selecione o objetivo"
              />
              {errors.objetivo && <p className="text-sm text-destructive mt-1">{errors.objetivo}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dificuldade">Dificuldade</Label>
              <CustomSelect
                inputId="dificuldade"
                value={DIFICULDADES_OPTIONS.find(opt => opt.value === formData.dificuldade)}
                onChange={(option) => handleInputChange('dificuldade', option ? option.value : '')}
                options={DIFICULDADES_OPTIONS}
                placeholder="Selecione a dificuldade"
              />
              {errors.dificuldade && <p className="text-sm text-destructive mt-1">{errors.dificuldade}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequencia">Frequência</Label>
              <CustomSelect
                inputId="frequencia"
                value={FREQUENCIAS_OPTIONS.find(opt => opt.value === String(formData.treinos_por_semana))}
                onChange={(option) => handleInputChange('treinos_por_semana', option ? Number(option.value) : undefined)}
                options={FREQUENCIAS_OPTIONS}
                placeholder="Treinos por semana"
              />
              {errors.treinos_por_semana && <p className="text-sm text-destructive mt-1">{errors.treinos_por_semana}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duracao">Duração</Label>
              <CustomSelect
                inputId="duracao"
                value={DURACAO_OPTIONS.find(opt => opt.value === String(formData.duracao_semanas))}
                onChange={(option) => handleInputChange('duracao_semanas', option ? Number(option.value) : undefined)}
                options={DURACAO_OPTIONS}
                placeholder="Duração em semanas"
              />
              {errors.duracao_semanas && <p className="text-sm text-destructive mt-1">{errors.duracao_semanas}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes_rotina">Observações Gerais (Opcional)</Label>
            <Textarea
              id="observacoes_rotina"
              placeholder="Adicione observações gerais sobre o modelo, como para qual tipo de aluno ele é mais indicado, dicas de progressão, etc."
              value={formData.observacoes_rotina || ''}
              onChange={(e) => handleInputChange('observacoes_rotina', e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Espaçamento para botões fixos */}
          <div className="pb-20 md:pb-6" />

          {/* Botões de navegação - Desktop */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t p-4 hidden md:flex justify-end items-center z-50 px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onCancelar} size="lg">
                  Cancelar
              </Button>
              <Button type="submit" size="lg">
                  Avançar para Treinos <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
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

const SortableTreinoCard = ({ id, treino, index, atualizarCampoTreino, adicionarGrupoMuscular, removerGrupoMuscular }: {
  id: string;
  treino: TreinoTemp;
  index: number;
  atualizarCampoTreino: (index: number, campo: keyof TreinoTemp, valor: string | number) => void;
  adicionarGrupoMuscular: (index: number, grupo: string) => void;
  removerGrupoMuscular: (index: number, grupo: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const treinoCompleto = treino.nome && treino.nome.trim().length >= 2 && treino.grupos_musculares.length > 0;

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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Grupos Musculares</Label>
            <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-gray-50">
              {treino.grupos_musculares.length > 0 ? (
                treino.grupos_musculares.map(grupo => (
                  <Badge key={grupo} variant="secondary" className={`${CORES_GRUPOS_MUSCULARES[grupo] || 'bg-gray-100 text-gray-800'} cursor-pointer hover:opacity-80`} onClick={() => removerGrupoMuscular(index, grupo)}>
                    {grupo} <X className="h-3 w-3 ml-1.5" />
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
          <div className="space-y-2">
            <Label htmlFor={`observacoes_${index}`}>Observações (Opcional)</Label>
            <Textarea id={`observacoes_${index}`} value={treino.observacoes || ''} onChange={(e) => atualizarCampoTreino(index, 'observacoes', e.target.value)} placeholder="Adicione notas sobre este treino específico..." rows={2} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Etapa 2: Componente de Treinos ---
const ModeloTreinos = ({ onAvancar, onVoltar, initialData, configuracao, onCancelar, onUpdate }: ModeloTreinosProps) => {
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
          nome: `Treino ${nomesTreinos[i]}`,
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

  const atualizarCampoTreino = (treinoIndex: number, campo: keyof TreinoTemp, valor: string | number) => {
    setTreinos(prev => prev.map((treino, index) => {
      if (index === treinoIndex) {
        return { ...treino, [campo]: valor };
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
      setTreinos((items) => arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, ordem: index + 1 })));
    }
  }

  const treinosCompletos = treinos.filter(t => t.nome && t.nome.trim().length >= 2 && t.grupos_musculares.length > 0).length;
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
                <SortableTreinoCard key={treino.id} id={treino.id} treino={treino} index={index} atualizarCampoTreino={atualizarCampoTreino} adicionarGrupoMuscular={adicionarGrupoMuscular} removerGrupoMuscular={removerGrupoMuscular} />
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
const ModeloExercicios = ({ onFinalizar, onVoltar, initialData, treinos, onUpdate, onCancelar, isSaving }: ModeloExerciciosProps) => {
  const [exercicios, setExercicios] = useState<Record<string, ExercicioModelo[]>>(initialData || {});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treinoAtual, setTreinoAtual] = useState<TreinoTemp | null>(null);
  const { getExercicioInfo } = useExercicioLookup();

  // Atualiza o storage sempre que os exercícios mudam
  useEffect(() => {
    onUpdate({ exercicios });
  }, [exercicios, onUpdate]);

  const handleAbrirModal = (treino: TreinoTemp) => {
    setTreinoAtual(treino);
    setIsModalOpen(true);
  };

  const handleAdicionarExercicios = (exerciciosSelecionados: Tables<'exercicios'>[]) => {
    if (!treinoAtual || exerciciosSelecionados.length === 0) return;

    let exerciciosParaAdicionar: ExercicioModelo[] = [];

    if (exerciciosSelecionados.length === 2) {
      // Caso de série combinada
      const exercicioCombinado: ExercicioModelo = {
        id: `ex_modelo_${Date.now()}_${Math.random()}`,
        exercicio_1_id: exerciciosSelecionados[0].id,
        exercicio_2_id: exerciciosSelecionados[1].id,
        tipo: 'combinada',
        series: [{ id: `serie_comb_${Date.now()}`, numero_serie: 1, repeticoes_1: 0, carga_1: 0, repeticoes_2: 0, carga_2: 0, intervalo_apos_serie: 90 }],
        intervalo_apos_exercicio: 120,
      };
      exerciciosParaAdicionar.push(exercicioCombinado);
    } else {
      // Caso de série simples (o modal envia um ou mais)
      exerciciosParaAdicionar = exerciciosSelecionados.map(ex => ({
        id: `ex_modelo_${Date.now()}_${Math.random()}`,
        exercicio_1_id: ex.id,
        tipo: 'simples',
        series: [{ id: `serie_${Date.now()}`, numero_serie: 1, repeticoes: 0, carga: 0, intervalo_apos_serie: 60 }],
        intervalo_apos_exercicio: 90,
      }));
    }

    setExercicios(prev => ({
      ...prev,
      [treinoAtual.id]: [...(prev[treinoAtual.id] || []), ...exerciciosParaAdicionar]
    }));
    setIsModalOpen(false);
  };

  const handleRemoverExercicio = (treinoId: string, exercicioId: string) => {
    setExercicios(prev => ({
      ...prev,
      [treinoId]: (prev[treinoId] || []).filter(ex => ex.id !== exercicioId)
    }));
  };

  const handleAtualizarExercicio = (treinoId: string, exercicioId: string, dados: Partial<ExercicioModelo>) => {
    setExercicios(prev => ({
      ...prev,
      [treinoId]: (prev[treinoId] || []).map(ex => ex.id === exercicioId ? { ...ex, ...dados } : ex)
    }));
  };

  const treinosCompletos = treinos.filter(t => exercicios[t.id] && exercicios[t.id].length > 0).length;
  const requisitosAtendidos = treinosCompletos === treinos.length;

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
              {treinosCompletos}/{treinos.length} completos
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
                  {exercicios[treino.id].map((ex, exercicioIndex) => {
                    const exercicioInfo1 = getExercicioInfo(ex.exercicio_1_id);
                    const exercicioInfo2 = ex.exercicio_2_id ? getExercicioInfo(ex.exercicio_2_id) : null;
                    const nomeExercicio = ex.tipo === 'combinada' && exercicioInfo2 ? `${exercicioInfo1.nome} + ${exercicioInfo2.nome}` : exercicioInfo1.nome;
                    
                    const isUltimoExercicioDoTreino = exercicioIndex === exercicios[treino.id].length - 1;
                    
                    return (
                      <div key={ex.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{nomeExercicio}</h4>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoverExercicio(treino.id, ex.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
          <Button variant="outline" onClick={onVoltar} size="lg" disabled={isSaving}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancelar} size="lg" disabled={isSaving}>
                Cancelar
            </Button>
            <Button onClick={onFinalizar} disabled={!requisitosAtendidos || isSaving} size="lg" className="bg-green-600 hover:bg-green-700">
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar Modelo
                </>
              )}
            </Button>
          </div>
      </div>

      {/* Botões de navegação - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-50">
        <div className="flex justify-between items-center">
            <Button variant="outline" onClick={onVoltar} size="lg" disabled={isSaving}>Voltar</Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onCancelar} size="lg" disabled={isSaving}>Cancelar</Button>
              <Button onClick={onFinalizar} disabled={!requisitosAtendidos || isSaving} size="lg" className="bg-green-600 hover:bg-green-700">
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
              ) : "Salvar"}
              </Button>
            </div>
        </div>
      </div>

      {isModalOpen && (
        <ExercicioModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAdicionarExercicios}
          gruposMuscularesFiltro={treinoAtual?.grupos_musculares || []}
        />
      )}
        </div>
      </CardContent>
    </Card>
  );
};

// --- Tipos e Componente Principal ---
type Etapa = "configuracao" | "treinos" | "exercicios";
const STORAGE_KEY = 'modelo_em_criacao';

interface ModeloEmCriacao {
  configuracao?: ModeloConfiguracaoData;
  treinos?: TreinoTemp[];
  exercicios?: Record<string, ExercicioModelo[]>;
  etapaAtual?: Etapa;
}

const NovoModelo = () => {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('configuracao');
  const [modeloEmCriacao, setModeloEmCriacao] = useState<ModeloEmCriacao>({});
  const { user } = useAuth();
  const { getExercicioInfo } = useExercicioLookup();
  const [isSaving, setIsSaving] = useState(false);

  // Carregar dados do sessionStorage ao montar
  useEffect(() => {
    const savedData = sessionStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setModeloEmCriacao(parsedData);
      setEtapa(parsedData.etapaAtual || 'configuracao');
    }
  }, []);

  // Salvar dados no sessionStorage ao alterar
  const updateStorage = useCallback((data: Partial<ModeloEmCriacao>) => {
    setModeloEmCriacao(prev => {
      const newData = { ...prev, ...data };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    });
  }, []);

  const handleAvancarConfiguracao = (data: ModeloConfiguracaoData) => {
    const oldConfig = modeloEmCriacao.configuracao;
    const oldTreinos = modeloEmCriacao.treinos || [];
    const oldExercicios = modeloEmCriacao.exercicios || {};

    const newFrequency = data.treinos_por_semana;
    const oldFrequency = oldConfig?.treinos_por_semana;

    let updatedTreinos = [...oldTreinos];
    const updatedExercicios = { ...oldExercicios };

    // Ajusta o número de treinos se a frequência mudou (exceto na primeira vez)
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
    const oldExercicios = modeloEmCriacao.exercicios || {};
    const newExercicios = { ...oldExercicios };
    let hasChanges = false;

    const compareMuscleGroups = (arr1: string[], arr2: string[]) => {
      if (arr1.length !== arr2.length) return false;
      const sorted1 = [...arr1].sort();
      const sorted2 = [...arr2].sort();
      return sorted1.every((value, index) => value === sorted2[index]);
    };

    data.forEach(newTreino => {
      const oldTreino = modeloEmCriacao.treinos?.find(t => t.id === newTreino.id);

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
            toast.info(`Exercícios removidos do Treino ${newTreino.nome}`, { description: "Alguns exercícios foram removidos por não pertencerem mais aos grupos musculares selecionados." });
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
    sessionStorage.removeItem(STORAGE_KEY);
    navigate('/meus-modelos', { replace: true });
  };

  const handleFinalizarModelo = async () => {
    if (!user) {
      toast.error("Erro de autenticação", { description: "Você precisa estar logado para salvar um modelo." });
      return;
    }

    setIsSaving(true);

    const { configuracao, treinos, exercicios } = modeloEmCriacao;

    if (!configuracao || !treinos || !exercicios) {
      toast.error("Dados incompletos", { description: "Não foi possível salvar o modelo pois os dados estão incompletos." });
      setIsSaving(false);
      return;
    }

    try {
      // 1. Inserir o modelo principal
      const { data: modeloCriado, error: erroModelo } = await supabase
        .from('modelos_rotina')
        .insert({
          professor_id: user.id,
          nome: configuracao.nome,
          objetivo: configuracao.objetivo,
          dificuldade: configuracao.dificuldade,
          treinos_por_semana: configuracao.treinos_por_semana,
          duracao_semanas: configuracao.duracao_semanas,
          observacoes_rotina: configuracao.observacoes_rotina || null,
        })
        .select()
        .single();

      if (erroModelo) throw erroModelo;

      // 2. Mapear treinos e inserir
      const treinosParaInserir = treinos.map((treino, index) => ({
        modelo_rotina_id: modeloCriado.id,
        nome: treino.nome,
        grupos_musculares: treino.grupos_musculares,
        ordem: index + 1,
        observacoes: treino.observacoes,
      }));

      const { data: treinosCriados, error: erroTreinos } = await supabase.from('modelos_treino').insert(treinosParaInserir).select();
      if (erroTreinos) throw erroTreinos;

      const mapaTreinoId = treinos.reduce((map, treinoTemp, index) => {
        map[treinoTemp.id] = treinosCriados[index].id;
        return map;
      }, {} as Record<string, string>);

      // 3. Inserir exercícios e séries
      for (const treinoTempId in exercicios) {
        const novoTreinoId = mapaTreinoId[treinoTempId];
        if (!novoTreinoId) continue;

        const exerciciosDoTreino = exercicios[treinoTempId];
        for (let i = 0; i < exerciciosDoTreino.length; i++) {
          const exercicio = exerciciosDoTreino[i];
          const { data: exercicioCriado, error: erroExercicio } = await supabase.from('modelos_exercicio').insert({
            modelo_treino_id: novoTreinoId,
            exercicio_1_id: exercicio.exercicio_1_id,
            exercicio_2_id: exercicio.exercicio_2_id || null,
            ordem: i + 1,
            intervalo_apos_exercicio: exercicio.intervalo_apos_exercicio,
          }).select().single();

          if (erroExercicio) throw erroExercicio;

          const seriesParaInserir = exercicio.series.map(serie => ({
            modelo_exercicio_id: exercicioCriado.id,
            numero_serie: serie.numero_serie,
            repeticoes: serie.repeticoes ?? 0,
            carga: serie.carga ?? 0,
            repeticoes_1: serie.repeticoes_1 ?? 0,
            carga_1: serie.carga_1 ?? 0,
            repeticoes_2: serie.repeticoes_2 ?? 0,
            carga_2: serie.carga_2 ?? 0,
            tem_dropset: serie.tem_dropset ?? false,
            carga_dropset: serie.carga_dropset ?? 0,
            intervalo_apos_serie: serie.intervalo_apos_serie ?? 60,
          }));
          const { error: erroSeries } = await supabase.from('modelos_serie').insert(seriesParaInserir);
          if (erroSeries) throw erroSeries;
        }
      }

      sessionStorage.removeItem(STORAGE_KEY);
      navigate('/meus-modelos', { replace: true });
    } catch (error) {
      console.error("Erro ao salvar modelo:", error);
      toast.error("Erro ao Salvar", { description: error instanceof Error ? error.message : "Não foi possível salvar o modelo. Tente novamente." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoltar = () => {
    if (etapa === 'treinos') setEtapa('configuracao');
    else if (etapa === 'exercicios') setEtapa('treinos');
  };

  const renderEtapa = () => {
    switch (etapa) {
      case 'configuracao': return <ModeloConfiguracao onAvancar={handleAvancarConfiguracao} initialData={modeloEmCriacao.configuracao} onCancelar={handleCancelar} />;
      case 'treinos': return <ModeloTreinos onAvancar={handleAvancarTreinos} onVoltar={handleVoltar} initialData={modeloEmCriacao.treinos} configuracao={modeloEmCriacao.configuracao} onCancelar={handleCancelar} onUpdate={updateStorage} />;
      case 'exercicios': return <ModeloExercicios onFinalizar={handleFinalizarModelo} onVoltar={handleVoltar} initialData={modeloEmCriacao.exercicios} treinos={modeloEmCriacao.treinos || []} onUpdate={updateStorage} onCancelar={handleCancelar} isSaving={isSaving} />;
      default: return <ModeloConfiguracao onAvancar={handleAvancarConfiguracao} initialData={modeloEmCriacao.configuracao} onCancelar={handleCancelar} />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Novo Modelo de Rotina</h1>
            <p className="text-muted-foreground">Crie um template de treino para reutilizar com seus alunos.</p>
          </div>
        </div>
      </div>
      <div className="mt-6">{renderEtapa()}</div>
    </div>
  );
};

export default NovoModelo;