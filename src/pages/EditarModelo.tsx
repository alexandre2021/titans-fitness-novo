import { useState, useEffect, FormEvent, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useExercicioLookup } from "@/hooks/useExercicioLookup";
import { SerieSimplesModelo } from "@/components/rotinasModelo/SerieSimplesModelo";
import { SerieCombinadaModelo } from "@/components/rotinasModelo/SerieCombinadaModelo";
import { ExercicioModalModelo } from "@/components/rotinasModelo/ExercicioModalModelo";

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

// --- Tipos ---
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
              <Select onValueChange={(value) => handleInputChange('objetivo', value)} value={formData.objetivo}>
                <SelectTrigger id="objetivo"><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger>
                <SelectContent>{OBJETIVOS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              {errors.objetivo && <p className="text-sm text-destructive mt-1">{errors.objetivo}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dificuldade">Dificuldade</Label>
              <Select onValueChange={(value) => handleInputChange('dificuldade', value)} value={formData.dificuldade}>
                <SelectTrigger id="dificuldade"><SelectValue placeholder="Selecione a dificuldade" /></SelectTrigger>
                <SelectContent>{DIFICULDADES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              {errors.dificuldade && <p className="text-sm text-destructive mt-1">{errors.dificuldade}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequencia">Frequência</Label>
              <Select onValueChange={(value) => handleInputChange('treinos_por_semana', Number(value))} value={formData.treinos_por_semana ? String(formData.treinos_por_semana) : ""}>
                <SelectTrigger id="frequencia"><SelectValue placeholder="Treinos por semana" /></SelectTrigger>
                <SelectContent>{FREQUENCIAS.map(f => <SelectItem key={f} value={String(f)}>{f}x / semana</SelectItem>)}</SelectContent>
              </Select>
              {errors.treinos_por_semana && <p className="text-sm text-destructive mt-1">{errors.treinos_por_semana}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duracao">Duração</Label>
              <Select onValueChange={(value) => handleInputChange('duracao_semanas', Number(value))} value={formData.duracao_semanas ? String(formData.duracao_semanas) : ""}>
                <SelectTrigger id="duracao"><SelectValue placeholder="Duração em semanas" /></SelectTrigger>
                <SelectContent>
                  <SelectScrollUpButton><ChevronUp /></SelectScrollUpButton>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map(semana => (
                    <SelectItem key={semana} value={String(semana)}>{semana} semana{semana > 1 ? 's' : ''}</SelectItem>
                  ))}
                  <SelectScrollDownButton><ChevronDown /></SelectScrollDownButton>
                </SelectContent>
              </Select>
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
            <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={onCancelar} className="w-1/2" size="lg">
                    Cancelar
                </Button>
                <Button type="submit" size="lg" className="w-1/2">
                  Avançar
                </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// --- Etapa 2: Componente de Treinos (mesmo de NovoModelo) ---
const ModeloTreinos = ({ onAvancar, onVoltar, initialData, configuracao, onCancelar }: ModeloTreinosProps) => {
  const [treinos, setTreinos] = useState<TreinoTemp[]>([]);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setTreinos(initialData);
    } else if (configuracao?.treinos_por_semana) {
      const frequencia = configuracao.treinos_por_semana;
      const treinosIniciais: TreinoTemp[] = [];
      const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      for (let i = 0; i < frequencia; i++) {
        treinosIniciais.push({ id: `treino_draft_${Date.now()}_${i}`, nome: `Treino ${nomesTreinos[i]}`, grupos_musculares: [], ordem: i + 1 });
      }
      setTreinos(treinosIniciais);
    }
  }, [initialData, configuracao]);

  const adicionarGrupoMuscular = (treinoIndex: number, grupo: string) => {
    setTreinos(prev => prev.map((treino, index) => index === treinoIndex && !treino.grupos_musculares.includes(grupo) ? { ...treino, grupos_musculares: [...treino.grupos_musculares, grupo] } : treino));
  };

  const removerGrupoMuscular = (treinoIndex: number, grupo: string) => {
    setTreinos(prev => prev.map((treino, index) => index === treinoIndex ? { ...treino, grupos_musculares: treino.grupos_musculares.filter(g => g !== grupo) } : treino));
  };

  const atualizarTreino = (treinoIndex: number, campo: keyof TreinoTemp, valor: string | number) => {
    setTreinos(prev => prev.map((treino, index) => index === treinoIndex ? { ...treino, [campo]: valor } : treino));
  };

  const treinosCompletos = treinos.filter(t => t.nome && t.nome.trim().length >= 2 && t.grupos_musculares.length > 0).length;
  const requisitosAtendidos = treinosCompletos === treinos.length;

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
          <div className="space-y-4">
            {treinos.map((treino, index) => (
              <Card key={treino.id || index}>
                <CardHeader className="pb-4"><CardTitle className="text-lg">Treino {String.fromCharCode(65 + index)}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`nome_${index}`}>Nome do Treino</Label>
                    <Input id={`nome_${index}`} value={treino.nome} onChange={(e) => atualizarTreino(index, 'nome', e.target.value)} placeholder={`Ex: Treino ${String.fromCharCode(65 + index)} - Peito e Tríceps`} />
                  </div>
                  <div className="space-y-2">
                    <Label>Grupos Musculares</Label>
                    <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-gray-50">
                      {treino.grupos_musculares.length > 0 ? treino.grupos_musculares.map(grupo => (
                        <Badge key={grupo} variant="secondary" className={`${CORES_GRUPOS_MUSCULARES[grupo] || 'bg-gray-100 text-gray-800'} cursor-pointer hover:opacity-80`} onClick={() => removerGrupoMuscular(index, grupo)}>{grupo} <Trash2 className="h-3 w-3 ml-1" /></Badge>
                      )) : <span className="text-gray-500 text-sm">Selecione abaixo</span>}
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
            ))}
          </div>

          {/* Espaçamento para botões fixos */}
          <div className="pb-20 md:pb-6" />

          {/* Botões de navegação - Desktop */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t p-4 hidden md:flex justify-between items-center z-50 px-6 lg:px-8">
              <Button type="button" variant="outline" onClick={onVoltar} size="lg">
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
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onVoltar} className="flex-1" size="lg">Voltar</Button>
                <Button type="button" variant="ghost" onClick={onCancelar} className="flex-1" size="lg">Cancelar</Button>
                <Button onClick={() => onAvancar(treinos)} disabled={!requisitosAtendidos} className="flex-1" size="lg">Avançar</Button>
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
  const { getExercicioInfo } = useExercicioLookup();

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
      exerciciosParaAdicionar.push({ id: `ex_modelo_${Date.now()}`, exercicio_1_id: exerciciosSelecionados[0].id, exercicio_2_id: exerciciosSelecionados[1].id, tipo: 'combinada', series: [{ id: `serie_comb_${Date.now()}`, numero_serie: 1, repeticoes_1: 12, carga_1: 10, repeticoes_2: 12, carga_2: 10, intervalo_apos_serie: 90 }], intervalo_apos_exercicio: 120 });
    } else {
      exerciciosParaAdicionar = exerciciosSelecionados.map(ex => ({ id: `ex_modelo_${Date.now()}_${Math.random()}`, exercicio_1_id: ex.id, tipo: 'simples', series: [{ id: `serie_${Date.now()}`, numero_serie: 1, repeticoes: 12, carga: 10, intervalo_apos_serie: 60 }], intervalo_apos_exercicio: 90 }));
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
            {treinos.map(treino => (
              <Card key={treino.id}>
                <CardHeader><CardTitle className="text-lg">{treino.nome}</CardTitle><p className="text-sm text-muted-foreground">{treino.grupos_musculares.join(', ')}</p></CardHeader>
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
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoverExercicio(treino.id, ex.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            {ex.tipo === 'simples' ? (
                              <SerieSimplesModelo exercicio={ex} treinoId={treino.id} isUltimoExercicio={isUltimoExercicioDoTreino} onUpdate={dados => handleAtualizarExercicio(treino.id, ex.id, dados)} />
                            ) : (
                              <SerieCombinadaModelo exercicio={ex} treinoId={treino.id} isUltimoExercicio={isUltimoExercicioDoTreino} onUpdate={dados => handleAtualizarExercicio(treino.id, ex.id, dados)} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8"><Dumbbell className="h-10 w-10 mx-auto text-gray-300 mb-4" /><p className="text-muted-foreground">Nenhum exercício adicionado.</p></div>
                  )}
                  <div className="mt-6 pt-4 border-t border-dashed">
                    <Button type="button" variant="outline" onClick={() => handleAbrirModal(treino)} className="w-full"><Plus className="h-4 w-4 mr-2" /> Adicionar Exercício</Button>
                  </div>
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
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-2" />Salvar Alterações</>
                  )}
                </Button>
              </div>
          </div>

          {/* Botões de navegação - Mobile */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-50">
            <div className="flex gap-2">
                <Button variant="outline" onClick={onVoltar} className="flex-1" size="lg" disabled={isSaving}>Voltar</Button>
                <Button variant="ghost" onClick={onCancelar} className="flex-1" size="lg" disabled={isSaving}>Cancelar</Button>
                <Button onClick={onFinalizar} disabled={!requisitosAtendidos || isSaving} className="flex-1 bg-green-600 hover:bg-green-700" size="lg">
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
                  ) : (
                    "Salvar"
                  )}
                </Button>
            </div>
          </div>
        </div>
        {isModalOpen && <ExercicioModalModelo isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleAdicionarExercicios} gruposMuscularesFiltro={treinoAtual?.grupos_musculares || []} />}
      </CardContent>
    </Card>
  );
};

// --- Componente Principal ---
const EditarModelo = () => {
  const { modeloId } = useParams<{ modeloId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getExercicioInfo } = useExercicioLookup();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [etapa, setEtapa] = useState<"configuracao" | "treinos" | "exercicios">("configuracao");
  const [modeloEmEdicao, setModeloEmEdicao] = useState<ModeloEmEdicao>({});

  useEffect(() => {
    const fetchModelo = async () => {
      if (!modeloId || !user) {
        toast({ title: "Erro", description: "ID do modelo ou usuário inválido.", variant: "destructive" });
        navigate("/meus-modelos");
        return;
      }

      try {
        const { data: rotina, error: rotinaError } = await supabase.from("modelos_rotina").select("*").eq("id", modeloId).eq("personal_trainer_id", user.id).single();
        if (rotinaError || !rotina) throw new Error("Modelo de rotina não encontrado ou você não tem permissão para editá-lo.");

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
            treinos_por_semana: rotina.treinos_por_semana,
            duracao_semanas: rotina.duracao_semanas,
            observacoes_rotina: rotina.observacoes_rotina || "",
          },
          treinos: treinos.map(t => ({ ...t, id: t.id })),
          exercicios: exerciciosPorTreino,
        });

      } catch (error) {
        toast({ title: "Erro ao carregar modelo", description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido", variant: "destructive" });
        navigate("/meus-modelos");
      } finally {
        setLoading(false);
      }
    };

    fetchModelo();
  }, [modeloId, user, navigate, toast]);

  const handleSalvarAlteracoes = async () => {
    if (!user || !modeloId) return;
    setIsSaving(true);

    const { configuracao, treinos, exercicios } = modeloEmEdicao;
    if (!configuracao || !treinos || !exercicios) {
      toast({ title: "Dados incompletos", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    try {
      const { error: updateRotinaError } = await supabase.from("modelos_rotina").update({
        nome: configuracao.nome,
        objetivo: configuracao.objetivo,
        dificuldade: configuracao.dificuldade,
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
            repeticoes: serie.repeticoes ?? null,
            carga: serie.carga ?? null,
            repeticoes_1: serie.repeticoes_1 ?? null,
            carga_1: serie.carga_1 ?? null,
            repeticoes_2: serie.repeticoes_2 ?? null,
            carga_2: serie.carga_2 ?? null,
            tem_dropset: serie.tem_dropset ?? false,
            carga_dropset: serie.carga_dropset ?? null,
            intervalo_apos_serie: serie.intervalo_apos_serie ?? null,
          }));
          if (seriesParaInserir.length > 0) {
            const { error: erroSeries } = await supabase.from("modelos_serie").insert(seriesParaInserir);
            if (erroSeries) throw erroSeries;
          }
        }
      }

      toast({ title: "Modelo atualizado!", description: "Suas alterações foram salvas com sucesso." });
      navigate("/meus-modelos");

    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast({ title: "Erro ao Salvar", description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido", variant: "destructive" });
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
    const oldExercicios = modeloEmEdicao.exercicios || {};
    const newExercicios = { ...oldExercicios };
    let hasChanges = false;

    // Helper to compare muscle group arrays regardless of order
    const compareMuscleGroups = (arr1: string[], arr2: string[]) => {
      if (arr1.length !== arr2.length) return false;
      const sorted1 = [...arr1].sort();
      const sorted2 = [...arr2].sort();
      return sorted1.every((value, index) => value === sorted2[index]);
    };

    data.forEach(newTreino => {
      const oldTreino = modeloEmEdicao.treinos?.find(t => t.id === newTreino.id);

      // Check if muscle groups have actually changed
      if (oldTreino && !compareMuscleGroups(oldTreino.grupos_musculares, newTreino.grupos_musculares)) {
        const exercisesForThisTreino = newExercicios[newTreino.id] || [];

        if (exercisesForThisTreino.length > 0) {
          const filteredExercises = exercisesForThisTreino.filter(ex => {
            const info1 = getExercicioInfo(ex.exercicio_1_id);

            if (info1.grupo_muscular && newTreino.grupos_musculares.includes(info1.grupo_muscular)) {
              return true;
            }

            if (ex.exercicio_2_id) {
              const info2 = getExercicioInfo(ex.exercicio_2_id);
              if ((info1.grupo_muscular && newTreino.grupos_musculares.includes(info1.grupo_muscular)) ||
                  (info2.grupo_muscular && newTreino.grupos_musculares.includes(info2.grupo_muscular))) {
                return true;
              }
            }
            return false;
          });

          if (filteredExercises.length < exercisesForThisTreino.length) {
            toast({ title: `Exercícios removidos do Treino ${newTreino.nome}`, description: "Alguns exercícios foram removidos por não pertencerem mais aos grupos musculares selecionados." });
          }

          newExercicios[newTreino.id] = filteredExercises;
          hasChanges = true;
        }
      }
    });

    updateState({ treinos: data, exercicios: hasChanges ? newExercicios : oldExercicios });
    setEtapa('exercicios');
  };

  const handleVoltar = () => {
    if (etapa === 'treinos') setEtapa('configuracao');
    else if (etapa === 'exercicios') setEtapa('treinos');
  };

  const handleCancelar = () => {
    navigate('/meus-modelos');
  };

  const renderEtapa = () => {
    switch (etapa) {
      case 'configuracao':
        return <ModeloConfiguracao onAvancar={handleAvancarConfiguracao} initialData={modeloEmEdicao.configuracao} onCancelar={handleCancelar} />;
      case 'treinos':
        return <ModeloTreinos onAvancar={handleAvancarTreinos} onVoltar={handleVoltar} initialData={modeloEmEdicao.treinos} configuracao={modeloEmEdicao.configuracao} onCancelar={handleCancelar} />;
      case 'exercicios':
        return <ModeloExercicios onFinalizar={handleSalvarAlteracoes} onVoltar={handleVoltar} initialData={modeloEmEdicao.exercicios} treinos={modeloEmEdicao.treinos || []} onUpdate={updateState} onCancelar={handleCancelar} isSaving={isSaving} />;
      default:
        return <ModeloConfiguracao onAvancar={handleAvancarConfiguracao} initialData={modeloEmEdicao.configuracao} onCancelar={handleCancelar} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Editar Modelo de Rotina</h1>
            <p className="text-muted-foreground">Modifique o modelo de treino para reutilizar com seus alunos.</p>
          </div>
        </div>
      </div>
      <div className="mt-6">{renderEtapa()}</div>
    </div>
  );
};

export default EditarModelo;