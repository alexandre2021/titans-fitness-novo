// src/pages/EditarModeloPadrao.tsx
// Página para edição de modelos de rotina PADRÃO (apenas admin)
import { useState, useEffect, FormEvent, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

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
import CustomSelect from "@/components/ui/CustomSelect";
import { OBJETIVOS_OPTIONS, DIFICULDADES_OPTIONS, FREQUENCIAS_OPTIONS, DURACAO_OPTIONS, GENEROS_OPTIONS, GRUPOS_MUSCULARES, CORES_GRUPOS_MUSCULARES } from "@/constants/rotinas";

// --- Tipos ---
type ModeloConfiguracaoData = {
  nome: string;
  objetivo: string;
  dificuldade: string;
  genero: string;
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

interface ModeloEmEdicao {
  configuracao?: ModeloConfiguracaoData;
  treinos?: TreinoTemp[];
  exercicios?: Record<string, ExercicioModelo[]>;
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
  onUpdate: (data: Partial<ModeloEmEdicao>) => void;
}

interface ModeloExerciciosProps {
  onFinalizar: () => void;
  onVoltar: () => void;
  initialData?: Record<string, ExercicioModelo[]>;
  treinos: TreinoTemp[];
  onUpdate: (data: Partial<ModeloEmEdicao>) => void;
  onCancelar: () => void;
  isSaving: boolean;
}

// --- Etapa 1: Componente de Configuração (mesmo de NovoModelo) ---
const ModeloConfiguracao = ({ onAvancar, initialData, onCancelar }: ModeloConfiguracaoProps) => {
  const [formData, setFormData] = useState<ModeloConfiguracaoData>(
    initialData ?? {
      nome: "",
      objetivo: "",
      dificuldade: "",
      genero: "Ambos",
      treinos_por_semana: undefined,
      duracao_semanas: undefined,
      observacoes_rotina: "",
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome || formData.nome.trim().length < 3) newErrors.nome = "O nome do modelo deve ter pelo menos 3 caracteres.";
    if (!formData.objetivo) newErrors.objetivo = "O objetivo é obrigatório.";
    if (!formData.dificuldade) newErrors.dificuldade = "A dificuldade é obrigatória.";
    if (!formData.genero) newErrors.genero = "O gênero é obrigatório.";
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
        <p className="text-muted-foreground">Defina as características principais do seu modelo de treino.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Modelo</Label>
            <Input id="nome" placeholder="Ex: Hipertrofia para Iniciantes" value={formData.nome} onChange={(e) => handleInputChange('nome', e.target.value)} />
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
              <Label htmlFor="genero">Gênero</Label>
              <CustomSelect
                inputId="genero"
                value={GENEROS_OPTIONS.find(opt => opt.value === formData.genero)}
                onChange={(option) => handleInputChange('genero', option ? option.value : '')}
                options={GENEROS_OPTIONS}
                placeholder="Selecione o gênero"
              />
              {errors.genero && <p className="text-sm text-destructive mt-1">{errors.genero}</p>}
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
            <Textarea id="observacoes_rotina" placeholder="Adicione observações gerais sobre o modelo..." value={formData.observacoes_rotina || ''} onChange={(e) => handleInputChange('observacoes_rotina', e.target.value)} rows={3} />
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

const SortableEditarTreinoCard = ({ id, treino, index, atualizarCampoTreino, adicionarGrupoMuscular, removerGrupoMuscular }: {
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
                Completo
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
                    {grupo} <X className="h-3 w-3 ml-1.5" />
                  </Badge>
                ))
              ) : <span className="text-gray-500 text-sm p-1">Selecione os grupos abaixo</span>}
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

// --- Etapa 2: Componente de Treinos (mesmo de NovoModelo) ---
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
        treinosIniciais.push({ id: `treino_draft_${Date.now()}_${i}`, nome: `Treino ${nomesTreinos[i]}`, grupos_musculares: [], ordem: i + 1 });
      }
      return treinosIniciais;
    }
    return [];
  });

  const adicionarGrupoMuscular = (treinoIndex: number, grupo: string) => {
    setTreinos(prev => prev.map((treino, index) => index === treinoIndex && !treino.grupos_musculares.includes(grupo) ? { ...treino, grupos_musculares: [...treino.grupos_musculares, grupo] } : treino));
  };

  const removerGrupoMuscular = (treinoIndex: number, grupo: string) => {
    setTreinos(prev => prev.map((treino, index) => index === treinoIndex ? { ...treino, grupos_musculares: treino.grupos_musculares.filter(g => g !== grupo) } : treino));
  };

  const atualizarCampoTreino = (treinoIndex: number, campo: keyof TreinoTemp, valor: string | number) => {
    setTreinos(prev => prev.map((treino, index) => index === treinoIndex ? { ...treino, [campo]: valor } : treino));
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

  const handleVoltarClick = () => {
    onUpdate({ treinos });
    onVoltar();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etapa 2: Adição de Grupos Musculares</CardTitle>
        <p className="text-muted-foreground">Defina os nomes e grupos musculares para cada treino.</p>
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
                <Badge className={requisitosAtendidos ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>{treinosCompletos}/{treinos.length} completos</Badge>
              </div>
            </CardContent>
          </Card>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={treinos.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {treinos.map((treino, index) => (
                  <SortableEditarTreinoCard key={treino.id} id={treino.id} treino={treino} index={index} atualizarCampoTreino={atualizarCampoTreino} adicionarGrupoMuscular={adicionarGrupoMuscular} removerGrupoMuscular={removerGrupoMuscular} />
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
                <Button type="button" variant="ghost" onClick={onCancelar} size="lg">
                    Cancelar
                </Button>
                <Button onClick={() => onAvancar(treinos)} disabled={!requisitosAtendidos} size="lg">
                  Avançar para Exercícios <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
          </div>

          {/* Botões de navegação - Mobile */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-50">
            <div className="flex justify-between items-center">
                <Button variant="outline" onClick={handleVoltarClick} size="lg">Voltar</Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={onCancelar} size="lg">Cancelar</Button>
                  <Button onClick={() => onAvancar(treinos)} disabled={!requisitosAtendidos} size="lg">Avançar</Button>
                </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Etapa 3: Componente de Exercícios (mesmo de NovoModelo) ---
const ModeloExercicios = ({ onFinalizar, onVoltar, initialData, treinos, onUpdate, onCancelar, isSaving }: ModeloExerciciosProps) => {
  const [exercicios, setExercicios] = useState<Record<string, ExercicioModelo[]>>(initialData || {});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treinoAtual, setTreinoAtual] = useState<TreinoTemp | null>(null);
  const [exerciciosIniciais, setExerciciosIniciais] = useState<import('@/components/rotina/criacao/ExercicioModal').ItemSacola[]>([]);
  const [treinosExpandidos, setTreinosExpandidos] = useState<Record<string, boolean>>(() => {
    // Inicia com todos os treinos expandidos
    const inicial: Record<string, boolean> = {};
    treinos.forEach(t => inicial[t.id] = true);
    return inicial;
  });
  const { getExercicioInfo } = useExercicioLookup();

  useEffect(() => {
    onUpdate({ exercicios });
  }, [exercicios, onUpdate]);

  const toggleTreino = (treinoId: string) => {
    setTreinosExpandidos(prev => ({ ...prev, [treinoId]: !prev[treinoId] }));
  };

  const handleAbrirModal = async (treino: TreinoTemp) => {
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

          const sacola: import('@/components/rotina/criacao/ExercicioModal').ItemSacola[] = exerciciosDoTreino.flatMap(ex => {
            if (ex.tipo === 'simples') {
              const exercicio = exerciciosMap.get(ex.exercicio_1_id);
              if (!exercicio) return [];
              return [{
                tipo: 'simples' as const,
                exercicio
              }] as import('@/components/rotina/criacao/ExercicioModal').ItemSacola[];
            } else {
              const ex1 = exerciciosMap.get(ex.exercicio_1_id);
              const ex2 = exerciciosMap.get(ex.exercicio_2_id!);
              if (!ex1 || !ex2) return [];
              return [{
                tipo: 'combinacao' as const,
                exercicios: [ex1, ex2] as [Tables<'exercicios'>, Tables<'exercicios'>]
              }] as import('@/components/rotina/criacao/ExercicioModal').ItemSacola[];
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

  const handleAdicionarExercicios = (itensSacola: any[]) => {
    if (!treinoAtual) return;

    const exerciciosAtuais = exercicios[treinoAtual.id] || [];

    // Monta a lista final respeitando a ordem da sacola
    const exerciciosFinais: ExercicioModelo[] = itensSacola.flatMap(item => {
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
            tipo: 'simples' as const,
            series: [{
              id: `serie_${Date.now()}_${Math.random()}`,
              numero_serie: 1,
              repeticoes: undefined,
              carga: undefined,
              intervalo_apos_serie: 60
            }],
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
            tipo: 'combinada' as const,
            series: [{
              id: `serie_comb_${Date.now()}_${Math.random()}`,
              numero_serie: 1,
              repeticoes_1: undefined,
              carga_1: undefined,
              repeticoes_2: undefined,
              carga_2: undefined,
              intervalo_apos_serie: 90
            }],
            intervalo_apos_exercicio: 120
          };
        }
      }
      return [];
    });

    setExercicios(prev => ({
      ...prev,
      [treinoAtual.id]: exerciciosFinais
    }));
    setIsModalOpen(false);
  };

  const handleRemoverExercicio = (treinoId: string, exercicioId: string) => {
    setExercicios(prev => ({ ...prev, [treinoId]: (prev[treinoId] || []).filter(ex => ex.id !== exercicioId) }));
  };

  const handleAtualizarExercicio = (treinoId: string, exercicioId: string, dados: Partial<ExercicioModelo>) => {
    setExercicios(prev => ({ ...prev, [treinoId]: (prev[treinoId] || []).map(ex => ex.id === exercicioId ? { ...ex, ...dados } : ex) }));
  };

  const handleMoverExercicio = (treinoId: string, exercicioIndex: number, direcao: 'cima' | 'baixo') => {
    setExercicios(prev => {
      const exerciciosDoTreino = [...(prev[treinoId] || [])];
      const novoIndice = direcao === 'cima' ? exercicioIndex - 1 : exercicioIndex + 1;

      // Troca de posição
      [exerciciosDoTreino[exercicioIndex], exerciciosDoTreino[novoIndice]] =
        [exerciciosDoTreino[novoIndice], exerciciosDoTreino[exercicioIndex]];

      return { ...prev, [treinoId]: exerciciosDoTreino };
    });
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
                <Badge className={requisitosAtendidos ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>{treinosCompletos}/{treinos.length} completos</Badge>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            {treinos.map(treino => {
              const isExpandido = treinosExpandidos[treino.id] ?? true;
              const qtdExercicios = (exercicios[treino.id] || []).length;
              return (
              <Card key={treino.id}>
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
                      {exercicios[treino.id].map((ex, exercicioIndex) => {
                        const exercicioInfo1 = getExercicioInfo(ex.exercicio_1_id);
                        const exercicioInfo2 = ex.exercicio_2_id ? getExercicioInfo(ex.exercicio_2_id) : null;
                        const nomeExercicio = ex.tipo === 'combinada' && exercicioInfo2 ? `${exercicioInfo1.nome} + ${exercicioInfo2.nome}` : exercicioInfo1.nome;
                        const isUltimoExercicioDoTreino = exercicioIndex === exercicios[treino.id].length - 1;
                        const isPrimeiroExercicio = exercicioIndex === 0;
                        return (
                          <div key={ex.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col -space-y-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMoverExercicio(treino.id, exercicioIndex, 'cima')}
                                    disabled={isPrimeiroExercicio}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <ChevronUp className="h-5 w-5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMoverExercicio(treino.id, exercicioIndex, 'baixo')}
                                    disabled={isUltimoExercicioDoTreino}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <ChevronDown className="h-5 w-5" />
                                  </Button>
                                </div>
                                <h4 className="font-medium text-gray-900">{nomeExercicio}</h4>
                              </div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoverExercicio(treino.id, ex.id)} className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>
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
                </CardContent>}
              </Card>
              );
            })}
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
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-2" />Salvar Alterações</>
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
                  <Button onClick={onFinalizar} disabled={!requisitosAtendidos || isSaving} className="bg-green-600 hover:bg-green-700" size="lg">
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
                  ) : (
                    "Salvar"
                  )}
                  </Button>
                </div>
            </div>
          </div>
        </div>
        {isModalOpen && <ExercicioModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConcluir={handleAdicionarExercicios}
          gruposMuscularesFiltro={treinoAtual?.grupos_musculares || []}
          exerciciosJaAdicionados={treinoAtual ? (exercicios[treinoAtual.id] || []).flatMap(ex => [ex.exercicio_1_id, ex.exercicio_2_id]).filter(Boolean) as string[] : []}
          exerciciosIniciais={exerciciosIniciais}
        />}
      </CardContent>
    </Card>
  );
};

// --- Componente Principal ---
const EditarModeloPadrao = () => {
  const { modeloId } = useParams<{ modeloId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTab = searchParams.get('returnTab') || 'padrao';
  const { user } = useAuth();
  const { getExercicioInfo } = useExercicioLookup();

  const ADMIN_EMAIL = 'contato@titans.fitness';

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [etapa, setEtapa] = useState<"configuracao" | "treinos" | "exercicios">("configuracao");
  const [modeloEmEdicao, setModeloEmEdicao] = useState<ModeloEmEdicao>({});

  // Proteção de Rota: Apenas o admin pode acessar
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      toast.error("Acesso Negado", {
        description: "Você não tem permissão para editar modelos padrão."
      });
      navigate(`/meus-modelos?tab=${returnTab}`);
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchModelo = async () => {
      if (!modeloId || !user) {
        toast.error("Erro", { description: "ID do modelo ou usuário inválido." });
        navigate(`/meus-modelos?tab=${returnTab}`);
        return;
      }

      try {
        // Buscar modelo padrão (sem filtro de professor_id, pois é NULL)
        const { data: rotina, error: rotinaError } = await supabase
          .from("modelos_rotina")
          .select("*")
          .eq("id", modeloId)
          .eq("tipo", "padrao") // Garantir que é modelo padrão
          .single();
        if (rotinaError || !rotina) throw new Error("Modelo de rotina padrão não encontrado.");

        const { data: treinos, error: treinosError } = await supabase.from("modelos_treino").select("*").eq("modelo_rotina_id", modeloId).order("ordem");
        if (treinosError) throw treinosError;

        const exerciciosPorTreino: Record<string, ExercicioModelo[]> = {};
        for (const treino of treinos) {
          const { data: exercicios, error: exerciciosError } = await supabase.from("modelos_exercicio").select("*, modelos_serie(*)").eq("modelo_treino_id", treino.id).order("ordem");
          if (exerciciosError) throw exerciciosError;

          exerciciosPorTreino[treino.id] = exercicios.map(ex => ({
            id: ex.id,
            exercicio_1_id: ex.exercicio_1_id,
            exercicio_2_id: ex.exercicio_2_id || undefined,
            tipo: ex.exercicio_2_id ? 'combinada' : 'simples',
            series: ex.modelos_serie.map((s: Tables<'modelos_serie'>) => ({
              id: s.id,
              numero_serie: s.numero_serie,
              repeticoes: s.repeticoes ?? undefined,
              carga: s.carga ?? undefined,
              repeticoes_1: s.repeticoes_1 ?? undefined,
              carga_1: s.carga_1 ?? undefined,
              repeticoes_2: s.repeticoes_2 ?? undefined,
              carga_2: s.carga_2 ?? undefined,
              tem_dropset: s.tem_dropset ?? undefined,
              carga_dropset: s.carga_dropset ?? undefined,
              intervalo_apos_serie: s.intervalo_apos_serie ?? undefined,
            })).sort((a, b) => a.numero_serie - b.numero_serie),
            intervalo_apos_exercicio: ex.intervalo_apos_exercicio ?? undefined,
          }));
        }

        setModeloEmEdicao({
          configuracao: {
            nome: rotina.nome,
            objetivo: rotina.objetivo,
            dificuldade: rotina.dificuldade,
            genero: rotina.genero || "Ambos",
            treinos_por_semana: rotina.treinos_por_semana,
            duracao_semanas: rotina.duracao_semanas,
            observacoes_rotina: rotina.observacoes_rotina || "",
          },
          treinos: treinos.map(t => ({ ...t, id: t.id })),
          exercicios: exerciciosPorTreino,
        });

      } catch (error) {
        toast.error("Erro ao carregar modelo", { description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido" });
        navigate(`/meus-modelos?tab=${returnTab}`);
      } finally {
        setLoading(false);
      }
    };

    fetchModelo();
  }, [modeloId, user, navigate]);

  const handleSalvarAlteracoes = async () => {
    if (!user || !modeloId) return;
    setIsSaving(true);

    const { configuracao, treinos, exercicios } = modeloEmEdicao;
    if (!configuracao || !treinos || !exercicios) {
      toast.error("Dados incompletos");
      setIsSaving(false);
      return;
    }

    try {
      const { error: updateRotinaError } = await supabase.from("modelos_rotina").update({
        nome: configuracao.nome,
        objetivo: configuracao.objetivo,
        dificuldade: configuracao.dificuldade,
        genero: configuracao.genero,
        treinos_por_semana: configuracao.treinos_por_semana,
        duracao_semanas: configuracao.duracao_semanas,
        observacoes_rotina: configuracao.observacoes_rotina,
        updated_at: new Date().toISOString(),
      }).eq("id", modeloId);
      if (updateRotinaError) throw updateRotinaError;

      const { error: deleteTreinosError } = await supabase.from("modelos_treino").delete().eq("modelo_rotina_id", modeloId);
      if (deleteTreinosError) throw deleteTreinosError;

      const treinosParaInserir = treinos.map((treino: TreinoTemp, index: number) => ({
        modelo_rotina_id: modeloId,
        nome: treino.nome,
        grupos_musculares: treino.grupos_musculares,
        ordem: index + 1,
        observacoes: treino.observacoes,
      }));

      const { data: treinosCriados, error: erroTreinos } = await supabase.from("modelos_treino").insert(treinosParaInserir).select();
      if (erroTreinos) throw erroTreinos;

      const mapaTreinoId: Record<string, string> = treinos.reduce((map: Record<string, string>, treinoTemp: TreinoTemp, index: number) => {
        map[treinoTemp.id] = treinosCriados[index].id;
        return map;
      }, {});

      for (const treinoTempId in exercicios) {
        const novoTreinoId = mapaTreinoId[treinoTempId];
        if (!novoTreinoId) continue;

        const exerciciosDoTreino = exercicios[treinoTempId];
        for (let i = 0; i < exerciciosDoTreino.length; i++) {
          const exercicio = exerciciosDoTreino[i];
          const { data: exercicioCriado, error: erroExercicio } = await supabase.from("modelos_exercicio").insert({
            modelo_treino_id: novoTreinoId,
            exercicio_1_id: exercicio.exercicio_1_id,
            exercicio_2_id: exercicio.exercicio_2_id || null,
            ordem: i + 1,
            intervalo_apos_exercicio: exercicio.intervalo_apos_exercicio,
          }).select().single();
          if (erroExercicio) throw erroExercicio;

          const seriesParaInserir = exercicio.series.map((serie: SerieModelo) => ({
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
          if (seriesParaInserir.length > 0) {
            const { error: erroSeries } = await supabase.from("modelos_serie").insert(seriesParaInserir);
            if (erroSeries) throw erroSeries;
          }
        }
      }

      navigate(`/meus-modelos?tab=${returnTab}`, { replace: true });

    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast.error("Erro ao Salvar", { description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateState = useCallback((data: Partial<ModeloEmEdicao>) => {
    setModeloEmEdicao(prev => ({ ...prev, ...data }));
  }, []);

  const handleAvancarConfiguracao = (data: ModeloConfiguracaoData) => {
    const oldConfig = modeloEmEdicao.configuracao;
    const oldTreinos = modeloEmEdicao.treinos || [];
    const oldExercicios = modeloEmEdicao.exercicios || {};

    const newFrequency = data.treinos_por_semana;
    const oldFrequency = oldConfig?.treinos_por_semana;

    let updatedTreinos = [...oldTreinos];
    const updatedExercicios = { ...oldExercicios };

    if (newFrequency !== undefined && newFrequency !== oldFrequency) {
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

    updateState({ configuracao: data, treinos: updatedTreinos, exercicios: updatedExercicios });
    setEtapa('treinos');
  };

  const handleAvancarTreinos = (data: TreinoTemp[]) => {
    const oldTreinos = modeloEmEdicao.treinos || [];
    const oldExercicios = modeloEmEdicao.exercicios || {};
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
      toast.info("Exercícios reiniciados", { description: "Os exercícios de alguns treinos foram reiniciados devido à mudança nos grupos musculares." });
    }

    updateState({ treinos: data, exercicios: newExercicios });
    setEtapa('exercicios');
  };

  const handleVoltar = () => {
    if (etapa === 'treinos') setEtapa('configuracao');
    else if (etapa === 'exercicios') setEtapa('treinos');
  };

  const handleCancelar = () => {
    navigate(`/meus-modelos?tab=${returnTab}`, { replace: true });
  };

  const renderEtapa = () => {
    switch (etapa) {
      case 'configuracao':
        return <ModeloConfiguracao onAvancar={handleAvancarConfiguracao} initialData={modeloEmEdicao.configuracao} onCancelar={handleCancelar} />;
      case 'treinos':
        return <ModeloTreinos onAvancar={handleAvancarTreinos} onVoltar={handleVoltar} initialData={modeloEmEdicao.treinos} configuracao={modeloEmEdicao.configuracao} onCancelar={handleCancelar} onUpdate={updateState} />;
      case 'exercicios':
        return <ModeloExercicios onFinalizar={handleSalvarAlteracoes} onVoltar={handleVoltar} initialData={modeloEmEdicao.exercicios} treinos={modeloEmEdicao.treinos || []} onUpdate={updateState} onCancelar={handleCancelar} isSaving={isSaving} />;
      default:
        return <ModeloConfiguracao onAvancar={handleAvancarConfiguracao} initialData={modeloEmEdicao.configuracao} onCancelar={handleCancelar} />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[calc(100vh-3rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando modelo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {renderEtapa()}
    </div>
  );
};

export default EditarModeloPadrao;