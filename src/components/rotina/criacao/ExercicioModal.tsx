// src/components/rotinasModelo/ExercicioModalModelo.tsx

/**
 * Modal de seleção de exercícios para criação de MODELOS de rotina.
 * 
 * DUPLICAÇÃO INTENCIONAL: Este é uma réplica do ExercicioModal.tsx da criação de rotinas,
 * adaptado especificamente para o contexto de modelos. A duplicação é intencional para:
 * - Manter a funcionalidade existente de criação de rotinas intacta
 * - Ter controle total sobre customizações específicas de modelos
 * - Evitar dependências complexas entre contextos diferentes
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Search, Link, Dumbbell, Filter, Check, Info, Plus, ShoppingBag, Trash2, List, Camera, ChevronUp, ChevronDown } from 'lucide-react';
import Modal from 'react-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CustomSelect from '@/components/ui/CustomSelect';
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
import { useExercicios } from '@/hooks/useExercicios';
import { ExercicioDetalhesModal } from '../execucao/shared/ExercicioDetalhesModal';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Constantes
const EQUIPAMENTOS = [
  'Barra',
  'Halteres',
  'Máquina', 
  'Peso Corporal',
  'Cabo',
  'Kettlebell',
  'Fitas de Suspensão',
  'Elásticos',
  'Bola Suíça',
  'Bolas Medicinais',
  'Landmine',
  'Bola Bosu'
];

const CORES_GRUPOS_MUSCULARES: {[key: string]: string} = {
  'Peito': 'bg-red-100 text-red-800 border-red-200',
  'Costas': 'bg-blue-100 text-blue-800 border-blue-200',
  'Pernas': 'bg-green-100 text-green-800 border-green-200',
  'Ombros': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Bíceps': 'bg-purple-100 text-purple-800 border-purple-200',
  'Tríceps': 'bg-pink-100 text-pink-800 border-pink-200',
  'Antebraço': 'bg-teal-100 text-teal-800 border-teal-200',
  'Abdômen': 'bg-orange-100 text-orange-800 border-orange-200',
  'Glúteos': 'bg-violet-100 text-violet-800 border-violet-200',
  'Panturrilha': 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

const CORES_DIFICULDADES: {[key: string]: string} = {
  'Baixa': 'bg-green-100 text-green-800 border-green-200',
  'Média': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Alta': 'bg-red-100 text-red-800 border-red-200'
};

// Tipos para a sacola
type ExercicioSimples = {
  tipo: 'simples';
  exercicio: Tables<'exercicios'>;
};

type CombinacaoCompleta = {
  tipo: 'combinacao';
  exercicios: [Tables<'exercicios'>, Tables<'exercicios'>];
};

type CombinacaoIncompleta = {
  tipo: 'combinacao_incompleta';
  exercicio: Tables<'exercicios'>;
};

export type ItemSacola = ExercicioSimples | CombinacaoCompleta | CombinacaoIncompleta;

// Componente interno para exibir mídia do exercício
const ExercicioMedia: React.FC<{ exercicio: Tables<'exercicios'> }> = ({ exercicio }) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVideo, setIsVideo] = useState(false);

  useEffect(() => {
    const loadMedia = async () => {
      setIsLoading(true);

      const coverColumnName = exercicio.cover_media_url;
      let mediaPath: string | null = null;
      let isVideoType = false;

      // Prioridade 1: Se cover_media_url é 'video_url', usar thumbnail
      if (coverColumnName === 'video_url' && exercicio.video_thumbnail_path) {
        mediaPath = exercicio.video_thumbnail_path;
        isVideoType = true;
      } else {
        // Prioridade 2: Usar a coluna especificada em cover_media_url
        if (coverColumnName) {
          mediaPath = (exercicio[coverColumnName as keyof Tables<'exercicios'>] as string | null) || null;
          isVideoType = coverColumnName === 'video_url';
        }

        // Prioridade 3: Fallback para imagem_1_url ou imagem_2_url
        if (!mediaPath) {
          mediaPath = exercicio.imagem_1_url || exercicio.imagem_2_url || null;
        }
      }

      if (mediaPath) {
        try {
          const bucketType = exercicio.tipo === 'padrao' ? 'exercicios-padrao' : 'exercicios';
          const { data, error } = await supabase.functions.invoke('get-image-url', {
            body: { filename: mediaPath, bucket_type: bucketType }
          });

          if (!error && data?.url) {
            setMediaUrl(data.url);
            setIsVideo(isVideoType);
          }
        } catch (error) {
          console.error('Erro ao carregar mídia:', error);
        }
      }

      setIsLoading(false);
    };

    loadMedia();
  }, [exercicio]);

  return (
    <div className="relative h-32 bg-muted/30 border-b flex items-center justify-center overflow-hidden">
      {isLoading ? (
        <div className="animate-pulse bg-muted-foreground/20 w-full h-full" />
      ) : mediaUrl ? (
        <div className="w-full h-full flex items-center justify-center relative">
          <img
            src={mediaUrl}
            alt={exercicio.nome}
            className="max-w-full max-h-full object-contain"
          />
          {isVideo && (
            <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
              Vídeo
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground/40">
          <Camera className="h-8 w-8 mb-1" />
          <span className="text-xs">Sem mídia</span>
        </div>
      )}
    </div>
  );
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConcluir: (itens: ItemSacola[]) => void; // ✅ CORREÇÃO: Prop para lidar com a sacola inteira
  gruposMuscularesFiltro: string[];
  exerciciosJaAdicionados: string[];
  exerciciosIniciais?: ItemSacola[]; // Nova prop para preencher a sacola ao abrir na edição
}

export const ExercicioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConcluir,
  gruposMuscularesFiltro,
  exerciciosJaAdicionados,
  exerciciosIniciais = []
}) => {
  const grupoMuscularOptions = useMemo(() => [
    { value: 'todos', label: 'Todos os grupos' },
    ...gruposMuscularesFiltro.map((grupo: string) => ({ value: grupo, label: grupo }))
  ], [gruposMuscularesFiltro]);

  const tipoOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'padrao', label: 'Padrão' },
    { value: 'personalizado', label: 'Personalizado' }
  ];

  const equipamentoOptions = useMemo(() => [
    { value: 'todos', label: 'Todos' },
    ...EQUIPAMENTOS.sort().map((equipamento: string) => ({ value: equipamento, label: equipamento }))
  ], []);

  const dificuldadeOptions = [
    { value: 'todos', label: 'Todas' }, 
    { value: 'Baixa', label: 'Baixa' }, 
    { value: 'Média', label: 'Média' }, 
    { value: 'Alta', label: 'Alta' }
  ];

  const { exerciciosPadrao, exerciciosPersonalizados, loading } = useExercicios();
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    grupo_muscular: 'todos',
    tipo: 'todos',
    equipamento: 'todos',
    dificuldade: 'todos'
  });

  // Estados de seleção
  const [tipoSerie, setTipoSerie] = useState<'simples' | 'combinada'>('simples');
  const [sacola, setSacola] = useState<ItemSacola[]>([]);
  const [viewAtiva, setViewAtiva] = useState<'selecao' | 'sacola'>('selecao');

  // Estados para modal de detalhes
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [exercicioDetalhesId, setExercicioDetalhesId] = useState('');

  // Estado para controlar visibilidade dos filtros
  const [showFiltros, setShowFiltros] = useState(false);

  // Estado para controlar o diálogo de confirmação ao limpar sacola
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  // Estado para controlar o diálogo de confirmação ao remover item individual
  const [itemParaRemover, setItemParaRemover] = useState<number | null>(null);

  // Usar ref para rastrear mudanças (não causa re-render)
  const temMudancasRef = useRef(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Todos os exercícios disponíveis
  const exerciciosDisponiveis = [...exerciciosPadrao, ...exerciciosPersonalizados];

  // IDs dos exercícios que estão sendo editados (vieram via exerciciosIniciais)
  const idsEmEdicao = useMemo(() => {
    return exerciciosIniciais.flatMap(item => {
      if (item.tipo === 'simples') {
        return [item.exercicio.id];
      } else if (item.tipo === 'combinacao') {
        return [item.exercicios[0].id, item.exercicios[1].id];
      } else if (item.tipo === 'combinacao_incompleta') {
        return [item.exercicio.id];
      }
      return [];
    });
  }, [exerciciosIniciais]);

  // Filtrar exerciciosJaAdicionados para excluir os que estão sendo editados
  const exerciciosJaAdicionadosFiltrados = useMemo(() => {
    return exerciciosJaAdicionados.filter(id => !idsEmEdicao.includes(id));
  }, [exerciciosJaAdicionados, idsEmEdicao]);

  // Resetar quando modal abre
  useEffect(() => {
    if (isOpen) {
      setViewAtiva('selecao');
      temMudancasRef.current = false; // Reseta flag ao abrir

      if (gruposMuscularesFiltro.length === 1) {
        setFiltros(prev => ({ ...prev, grupo_muscular: gruposMuscularesFiltro[0] }));
      } else {
        setFiltros(prev => ({ ...prev, grupo_muscular: 'todos' }));
      }

      if (exerciciosIniciais && exerciciosIniciais.length > 0) {
        setSacola(exerciciosIniciais);
      } else {
        setSacola([]);
      }
    }
  }, [isOpen, gruposMuscularesFiltro]);

  // Quando troca o tipo de série, descarta combinação incompleta
  useEffect(() => {
    // ✅ CORREÇÃO: Usa a forma funcional do setSacola para evitar a dependência.
    // Isso garante que a lógica execute apenas quando `tipoSerie` mudar,
    // mas ainda tenha acesso ao valor mais recente da `sacola`.
    setSacola(prevSacola => prevSacola.filter(item => item.tipo !== 'combinacao_incompleta'));
  }, [tipoSerie]);

  // Calcular contadores da sacola
  const itensSacolaCompletos = useMemo(() => {
    return sacola.filter(item => item.tipo !== 'combinacao_incompleta');
  }, [sacola]);

  const combinacaoIncompleta = useMemo(() => {
    return sacola.find(item => item.tipo === 'combinacao_incompleta') as CombinacaoIncompleta | undefined;
  }, [sacola]);

  const countSacola = itensSacolaCompletos.length;

  // Função para atualizar filtros
  const atualizarFiltro = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  // Verificar se tem filtros ativos (exceto busca)
  const temFiltrosAvancadosAtivos =
    filtros.grupo_muscular !== 'todos' ||
    filtros.tipo !== 'todos' ||
    filtros.equipamento !== 'todos' ||
    filtros.dificuldade !== 'todos';

  // Filtrar exercícios
  const exerciciosFiltrados = exerciciosDisponiveis.filter(exercicio => {
    const pertenceAosGruposDoTreino = gruposMuscularesFiltro.length === 0 || 
      (exercicio.grupo_muscular && gruposMuscularesFiltro.includes(exercicio.grupo_muscular));
    if (!pertenceAosGruposDoTreino) return false;

    const buscaMatch = !filtros.busca || 
      exercicio.nome.toLowerCase().includes(filtros.busca.toLowerCase());
    const grupoMatch = filtros.grupo_muscular === 'todos' || 
      exercicio.grupo_muscular === filtros.grupo_muscular;
    const tipoMatch = filtros.tipo === 'todos' || 
      exercicio.tipo === filtros.tipo;
    const dificuldadeMatch = filtros.dificuldade === 'todos' ||
      exercicio.dificuldade === filtros.dificuldade;
    const equipamentoMatch = filtros.equipamento === 'todos' || 
      exercicio.equipamento === filtros.equipamento;

    return buscaMatch && grupoMatch && tipoMatch && equipamentoMatch && dificuldadeMatch;
  });

  const mostrarFiltroGrupo = gruposMuscularesFiltro.length > 1;
  const temFiltrosAtivos = 
    (filtros.grupo_muscular && filtros.grupo_muscular !== 'todos') ||
    (filtros.tipo && filtros.tipo !== 'todos') ||
    (filtros.equipamento && filtros.equipamento !== 'todos') ||
    (filtros.dificuldade && filtros.dificuldade !== 'todos');
  const temExerciciosPersonalizados = exerciciosDisponiveis.some(ex => ex.tipo === 'personalizado');

  // Verificar se exercício está na sacola
  const exercicioEstaNaSacola = useCallback((exercicioId: string): boolean => {
    return sacola.some(item => {
      if (item.tipo === 'simples') {
        return item.exercicio.id === exercicioId;
      } else if (item.tipo === 'combinacao') {
        return item.exercicios.some(ex => ex.id === exercicioId);
      } else if (item.tipo === 'combinacao_incompleta') {
        return item.exercicio.id === exercicioId;
      }
      return false;
    });
  }, [sacola]);

  // Função para mostrar detalhes do exercício
  const mostrarDetalhes = (exercicioId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExercicioDetalhesId(exercicioId);
    setModalDetalhesVisible(true);
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({
      busca: '',
      grupo_muscular: 'todos',
      tipo: 'todos',
      equipamento: 'todos',
      dificuldade: 'todos'
    });
  };

  // Clique no exercício
  const handleClickExercicio = (exercicio: Tables<'exercicios'>) => {
    console.log('🔍 Click no exercício:', {
      nome: exercicio.nome,
      id: exercicio.id,
      tipoSerie,
      jaAdicionadoAoTreino: exerciciosJaAdicionadosFiltrados.includes(exercicio.id),
      estaNaSacola: exercicioEstaNaSacola(exercicio.id),
      combinacaoIncompleta: combinacaoIncompleta ? combinacaoIncompleta.exercicio.nome : 'nenhuma',
      sacolaAtual: sacola.map(item => ({
        tipo: item.tipo,
        exercicio: item.tipo === 'simples' || item.tipo === 'combinacao_incompleta'
          ? item.exercicio.nome
          : `${item.exercicios[0].nome} + ${item.exercicios[1].nome}`
      }))
    });

    // Se já foi adicionado ao treino, não faz nada
    if (exerciciosJaAdicionadosFiltrados.includes(exercicio.id)) {
      console.log('❌ Exercício já adicionado ao treino');
      return;
    }

    // Se já está na sacola (em qualquer forma), mostra toast
    if (exercicioEstaNaSacola(exercicio.id)) {
      console.log('📦 Exercício já está na sacola - mostrando toast');
      toast.info('Este exercício já foi adicionado à sacola');
      return;
    }

    // Adicionar à sacola
    if (tipoSerie === 'simples') {
      console.log('✅ Adicionando como série simples');
      setSacola(prev => [...prev, { tipo: 'simples', exercicio }]);
      temMudancasRef.current = true; // Marca que há mudanças
    } else {
      // Modo combinada
      if (combinacaoIncompleta) {
        console.log('✅ Completando combinação');
        // Completa a combinação
        setSacola(prev => [
          ...prev.filter(item => item.tipo !== 'combinacao_incompleta'),
          {
            tipo: 'combinacao',
            exercicios: [combinacaoIncompleta.exercicio, exercicio]
          }
        ]);
        temMudancasRef.current = true; // Marca que há mudanças
      } else {
        console.log('✅ Iniciando nova combinação (1/2)');
        // Inicia uma combinação
        setSacola(prev => [...prev, { tipo: 'combinacao_incompleta', exercicio }]);
        temMudancasRef.current = true; // Marca que há mudanças
      }
    }
  };

  // Remover item da sacola
  const removerItemSacola = (index: number) => {
    setItemParaRemover(index);
  };

  const confirmarRemocaoItem = () => {
    if (itemParaRemover === null) return;

    const novaSacola = sacola.filter((_, i) => i !== itemParaRemover);
    setSacola(novaSacola);
    setItemParaRemover(null);
    setViewAtiva('selecao');
    temMudancasRef.current = true; // Marca que há mudanças
  };

  // Mover item na sacola (reordenar)
  const moverItemSacola = (index: number, direcao: 'cima' | 'baixo') => {
    console.log('🔄 Movendo item, marcando temMudancas=true');
    const novoArray = [...sacola];
    const novoIndice = direcao === 'cima' ? index - 1 : index + 1;

    [novoArray[index], novoArray[novoIndice]] = [novoArray[novoIndice], novoArray[index]];

    setSacola(novoArray);
    temMudancasRef.current = true; // Marca que há mudanças
    console.log('✅ temMudancas setado para true');
  };

  // Cancelar combinação incompleta
  const cancelarCombinacaoIncompleta = () => {
    setSacola(prev => prev.filter(item => item.tipo !== 'combinacao_incompleta'));
    temMudancasRef.current = true; // Marca que há mudanças
  };

  // Limpar toda a sacola
  const limparSacola = () => {
    setSacola([]);
    setViewAtiva('selecao');
    temMudancasRef.current = true; // Marca que há mudanças
  };

  // Tentar fechar o modal
  const handleTentarFechar = useCallback(() => {
    console.log('❌ Tentando fechar, temMudancas:', temMudancasRef.current);
    if (temMudancasRef.current) {
      console.log('⚠️ Há mudanças, abrindo modal de confirmação');
      setShowConfirmClose(true);
    } else {
      console.log('✅ Sem mudanças, fechando direto');
      onClose();
    }
  }, [onClose]);

  // Confirmar e salvar mudanças ao fechar
  const handleConfirmarFechamento = () => {
    const itensCompletos = sacola.filter(item => item.tipo !== 'combinacao_incompleta');
    onConcluir(itensCompletos);
    temMudancasRef.current = false;
    setShowConfirmClose(false);
    onClose();
  };

  // Adicionar exercícios ao treino
  const handleConcluirSelecao = () => {
    if (countSacola === 0) return;

    // ✅ CORREÇÃO: Passa a sacola inteira para o componente pai lidar de uma vez.
    onConcluir(itensSacolaCompletos);

    // Alerta se tem combinação incompleta
    if (combinacaoIncompleta) {
      toast.warning('1 exercício descartado (combinação incompleta)');
    }

    temMudancasRef.current = false; // Reseta flag de mudanças
    onClose(); // ✅ CORREÇÃO: Fecha o modal ao concluir.
  };

  // Mensagem do contador
  const mensagemContador = useMemo(() => {
    if (tipoSerie === 'combinada') {
      if (combinacaoIncompleta) {
        return 'Selecione 2 exercícios (1/2)';
      }
      return 'Selecione 2 exercícios (0/2)';
    }
    return `Selecione exercícios (${countSacola} na sacola)`;
  }, [tipoSerie, combinacaoIncompleta, countSacola]);

  return (
    <>
      {/* Modal principal de exercícios */}
      <Modal
        isOpen={isOpen}
        onRequestClose={handleTentarFechar}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full outline-none flex flex-col"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            {/* Toggle entre views */}
            <div className="flex gap-2">
              <Button
                variant={viewAtiva === 'selecao' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewAtiva('selecao')}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Seleção
              </Button>
              <Button
                variant={viewAtiva === 'sacola' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewAtiva('sacola')}
                className="flex items-center gap-2 relative"
              >
                <ShoppingBag className="h-4 w-4" />
                Sacola
                {countSacola > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-red-600 text-white">
                    {countSacola}
                  </Badge>
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleTentarFechar}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Área central com scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* VIEW SELEÇÃO */}
          {viewAtiva === 'selecao' && (
            <>
              {/* Filtros */}
              <div className="px-6 py-4 border-b bg-gray-50 space-y-4">
                {/* Grupos musculares do treino */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Grupos musculares do treino:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {gruposMuscularesFiltro.map((grupo: string) => (
                      <Badge 
                        key={String(grupo)}
                        variant="secondary"
                        className={CORES_GRUPOS_MUSCULARES[grupo] || 'bg-gray-100 text-gray-800'}
                      >
                        {grupo}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tipo de série */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={tipoSerie === 'simples' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoSerie('simples')}
                    className={`justify-start ${tipoSerie === 'simples' ? 'bg-[#ba3c15] hover:bg-[#9a3212] text-white' : 'border-[#ba3c15] text-[#ba3c15] hover:bg-[#ba3c15]/10'}`}
                  >
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Série Simples
                  </Button>
                  <Button
                    type="button"
                    variant={tipoSerie === 'combinada' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoSerie('combinada')}
                    className={`justify-start ${tipoSerie === 'combinada' ? 'bg-[#004B87] hover:bg-[#003d6e] text-white' : 'border-[#004B87] text-[#004B87] hover:bg-[#004B87]/10'}`}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Série Combinada
                  </Button>
                </div>

                {/* Busca + Botão Filtros */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar exercício..."
                      value={filtros.busca}
                      onChange={(e) => atualizarFiltro('busca', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowFiltros(prev => !prev)}
                    className="flex items-center gap-2 relative"
                  >
                    <Filter className="h-4 w-4" />
                    Filtros
                    {temFiltrosAvancadosAtivos && (
                      <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-secondary ring-1 ring-background" />
                    )}
                  </Button>
                </div>

                {/* Filtros avançados */}
                {showFiltros && (
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    {mostrarFiltroGrupo && (
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm font-medium">Grupo Muscular</Label>
                        <CustomSelect
                          inputId="filtro-grupo-muscular"
                          value={grupoMuscularOptions.find(opt => opt.value === filtros.grupo_muscular)}
                          onChange={(option) => atualizarFiltro('grupo_muscular', option ? String(option.value) : 'todos')}
                          options={grupoMuscularOptions}
                        />
                      </div>
                    )}

                    {temExerciciosPersonalizados && (
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm font-medium">Tipo</Label>
                        <CustomSelect
                          inputId="filtro-tipo"
                          value={tipoOptions.find(opt => opt.value === filtros.tipo)}
                          onChange={(option) => atualizarFiltro('tipo', option ? String(option.value) : 'todos')}
                          options={tipoOptions}
                        />
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <Label className="text-sm font-medium">Equipamento</Label>
                      <CustomSelect
                        inputId="filtro-equipamento"
                        value={equipamentoOptions.find(opt => opt.value === filtros.equipamento)}
                        onChange={(option) => atualizarFiltro('equipamento', option ? String(option.value) : 'todos')}
                        options={equipamentoOptions}
                      />
                    </div>

                    <div className="flex-1 space-y-2">
                      <Label className="text-sm font-medium">Dificuldade</Label>
                      <CustomSelect
                        inputId="filtro-dificuldade"
                        value={dificuldadeOptions.find(opt => opt.value === filtros.dificuldade)}
                        onChange={(option) => atualizarFiltro('dificuldade', option ? String(option.value) : 'todos')}
                        options={dificuldadeOptions}
                      />
                    </div>

                    {temFiltrosAtivos && (
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={limparFiltros}
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Limpar
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  <span className="text-gray-600">
                    {exerciciosFiltrados.length} exercício(s) encontrado(s)
                  </span>
                </div>
              </div>

              {/* Lista de exercícios */}
              <div className="px-6 py-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="ml-2 text-gray-600">Carregando exercícios...</span>
                  </div>
                ) : exerciciosFiltrados.length === 0 ? (
                  <div className="text-center py-12">
                    <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum exercício encontrado
                    </h3>
                    <p className="text-gray-600">
                      Tente ajustar os filtros para encontrar exercícios.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {exerciciosFiltrados.map((exercicio: Tables<'exercicios'>) => {
                      const estaNaSacola = exercicioEstaNaSacola(exercicio.id);
                      const jaAdicionado = exerciciosJaAdicionadosFiltrados.includes(exercicio.id);
                      const podeSelecionar = !jaAdicionado;

                      return (
                        <div
                          key={String(exercicio.id)}
                          className={`
                            relative border rounded-lg transition-all overflow-hidden
                            ${estaNaSacola
                              ? 'border-[#ba3c15] bg-[#ba3c15]/5 ring-2 ring-[#ba3c15]/30 cursor-pointer'
                              : podeSelecionar
                                ? 'border-gray-200 cursor-pointer hover:border-[#ba3c15] hover:bg-[#ba3c15]/5'
                                : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                            }
                          `}
                          onClick={() => podeSelecionar && handleClickExercicio(exercicio)}
                          title={estaNaSacola ? 'Clique para ver na sacola' : jaAdicionado ? 'Já adicionado ao treino' : 'Clique para selecionar'}
                        >
                          {/* Conteúdo do card */}
                          <div className="p-4">
                            {/* Ícones do canto superior direito */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                            {/* Botão de detalhes */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                mostrarDetalhes(exercicio.id, e);
                              }}
                              className="h-6 w-6 p-0 hover:bg-blue-100 rounded-full"
                              title="Ver detalhes do exercício"
                            >
                              <Info className="h-4 w-4 text-blue-600" />
                            </Button>

                            {jaAdicionado && !estaNaSacola && (
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center" title="Já adicionado a este treino">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}

                            {/* Check de seleção + Badge S ou C */}
                            {estaNaSacola && (
                              <>
                                <div className="w-6 h-6 bg-[#ba3c15] rounded-full flex items-center justify-center">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                                {/* Badge indicando tipo */}
                              {sacola.some(item => item.tipo === 'simples' && item.exercicio.id === exercicio.id) && (
                                  <div className="w-5 h-5 bg-[#ba3c15] rounded text-white text-[10px] font-bold flex items-center justify-center" title="Série Simples">
                                    S
                                  </div>
                                )}
                              {sacola.some(item => item.tipo === 'combinacao' && item.exercicios.some(ex => ex.id === exercicio.id)) && (
                                  <div className="w-5 h-5 bg-[#004B87] rounded text-white text-[10px] font-bold flex items-center justify-center" title="Série Combinada">
                                    C
                                  </div>
                                )}
                              {/* ✅ CORREÇÃO: Badge amarelo para combinação incompleta */}
                              {sacola.some(item => item.tipo === 'combinacao_incompleta' && item.exercicio.id === exercicio.id) && (
                                <div className="w-5 h-5 bg-amber-500 rounded text-white text-[10px] font-bold flex items-center justify-center" title="Série Combinada (pendente)">
                                  C
                                </div>
                              )}
                              </>
                            )}
                          </div>

                          <h4 className="font-medium text-gray-900 mb-2 pr-12">
                            {exercicio.nome}
                          </h4>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge
                              variant="outline"
                              className={CORES_GRUPOS_MUSCULARES[exercicio.grupo_muscular] || 'bg-gray-100'}
                            >
                              {exercicio.grupo_muscular}
                            </Badge>
                            <Badge variant="outline">
                              {exercicio.equipamento}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={CORES_DIFICULDADES[exercicio.dificuldade] || 'bg-gray-100'}
                            >
                              {exercicio.dificuldade}
                            </Badge>
                            {exercicio.tipo === 'personalizado' && (
                              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                                Personalizado
                              </Badge>
                            )}
                          </div>
                          </div>

                          {/* Mídia do exercício */}
                          <ExercicioMedia exercicio={exercicio} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* VIEW SACOLA */}
          {viewAtiva === 'sacola' && (
            <div className="px-6 py-4">
              {sacola.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sacola vazia
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Nenhum exercício selecionado ainda.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setViewAtiva('selecao')}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Ir para Seleção
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Lista Unificada de Exercícios */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Exercícios na Sacola ({sacola.length})
                    </h4>
                    <div className="space-y-2">
                      {sacola.map((item, index) => (
                        <div key={index}>
                          {item.tipo === 'simples' ? (
                            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#ba3c15]/20 hover:border-[#ba3c15] transition-colors">
                              <div className="flex items-center gap-2 flex-1">
                                {/* Setas de reordenação */}
                                <div className="flex flex-col -space-y-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moverItemSacola(index, 'cima')}
                                    disabled={index === 0}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <ChevronUp className="h-5 w-5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moverItemSacola(index, 'baixo')}
                                    disabled={index === sacola.length - 1}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <ChevronDown className="h-5 w-5" />
                                  </Button>
                                </div>

                                <div className="w-6 h-6 bg-[#ba3c15] rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-xs font-bold">S</span>
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm font-medium">{item.exercicio.nome}</span>
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {item.exercicio.grupo_muscular}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {item.exercicio.equipamento}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removerItemSacola(index)}
                                className="h-8 w-8 p-0 hover:bg-red-100 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : item.tipo === 'combinacao' ? (
                            <div className="bg-white p-3 rounded-lg border border-[#004B87]/20 hover:border-[#004B87] transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {/* Setas de reordenação */}
                                  <div className="flex flex-col -space-y-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moverItemSacola(index, 'cima')}
                                      disabled={index === 0}
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    >
                                      <ChevronUp className="h-5 w-5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moverItemSacola(index, 'baixo')}
                                      disabled={index === sacola.length - 1}
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    >
                                      <ChevronDown className="h-5 w-5" />
                                    </Button>
                                  </div>

                                  <div className="w-6 h-6 bg-[#004B87] rounded flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">C</span>
                                  </div>
                                  <span className="text-xs font-medium text-gray-600">
                                    Combinação
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removerItemSacola(index)}
                                  className="h-6 w-6 p-0 hover:bg-red-100"
                                >
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                              <div className="space-y-2 pl-3">
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-400 text-sm">1.</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{item.exercicios[0].nome}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {item.exercicios[0].grupo_muscular}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-400 text-sm">2.</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{item.exercicios[1].nome}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {item.exercicios[1].grupo_muscular}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Combinação Incompleta */}
                  {combinacaoIncompleta && (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-yellow-800 flex items-center gap-1">
                          ⚠️ Combinação em construção
                        </span>
                      </div>
                      <p className="text-xs text-yellow-700 mb-2">
                        Esta combinação será descartada se não for completada.
                      </p>
                      <div className="space-y-1 pl-3">
                        <div className="flex items-start gap-2">
                          <span className="text-yellow-600 text-sm">1.</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{combinacaoIncompleta.exercicio.nome}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {combinacaoIncompleta.exercicio.grupo_muscular}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-yellow-600 text-sm">2.</span>
                          <p className="text-sm text-gray-500 italic">Aguardando seleção...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botão Limpar Tudo */}
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setShowClearConfirmation(true)}
                      className="w-full flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Limpar Tudo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer fixo - SÓ APARECE NA VIEW SELEÇÃO */}
        {viewAtiva === 'selecao' && (
          <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {/* Botão Cancelar - só aparece quando tem combinação incompleta */}
                  {combinacaoIncompleta && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelarCombinacaoIncompleta}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                  )}
                  
                  <Button
                    type="button"
                    onClick={handleConcluirSelecao}
                    disabled={countSacola === 0}
                    className="bg-[#ba3c15] hover:bg-[#9a3212] text-white disabled:bg-gray-300"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Concluir
                  </Button>
                </div>
                {/* ✅ CORREÇÃO: Exibe a mensagem apenas para séries combinadas */}
                {tipoSerie === 'combinada' && (
                  <div className={`text-sm h-6 flex items-center justify-center px-2 rounded-md transition-all ${
                    combinacaoIncompleta 
                      ? 'bg-amber-500 text-white font-medium' 
                      : 'text-gray-600'
                  }`}>
                    {mensagemContador}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Diálogo de confirmação para remover item individual */}
      <AlertDialog open={itemParaRemover !== null} onOpenChange={(open) => !open && setItemParaRemover(null)}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Exercício?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este exercício da sacola? As alterações serão salvas automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemParaRemover(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarRemocaoItem}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação para limpar sacola */}
      <AlertDialog open={showClearConfirmation} onOpenChange={setShowClearConfirmation}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Sacola?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover todos os exercícios da sacola? Você precisará clicar em "Concluir" para salvar as alterações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                limparSacola();
                setShowClearConfirmation(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação ao fechar com mudanças */}
      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar Alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você fez alterações na sacola. Deseja salvar antes de fechar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowConfirmClose(false); onClose(); }}>
              Descartar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarFechamento}
              className="bg-[#ba3c15] hover:bg-[#9a3212] text-white"
            >
              Salvar e Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de detalhes do exercício */}
      <ExercicioDetalhesModal
        visible={modalDetalhesVisible}
        exercicioId={exercicioDetalhesId}
        onClose={() => setModalDetalhesVisible(false)}
      />
    </>
  );
};