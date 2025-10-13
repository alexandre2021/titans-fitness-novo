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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, Link, Dumbbell, Filter, Check, Info, Plus } from 'lucide-react';
import Modal from 'react-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CustomSelect from '@/components/ui/CustomSelect';
import { Badge } from '@/components/ui/badge';
import { useExercicios } from '@/hooks/useExercicios';
import { ExercicioDetalhesModal } from '../execucao/shared/ExercicioDetalhesModal';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

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
  'Abdômen': 'bg-orange-100 text-orange-800 border-orange-200',
  'Glúteos': 'bg-violet-100 text-violet-800 border-violet-200',
  'Panturrilha': 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

const CORES_DIFICULDADES: {[key: string]: string} = {
  'Baixa': 'bg-green-100 text-green-800 border-green-200',
  'Média': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Alta': 'bg-red-100 text-red-800 border-red-200'
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (exercicios: Tables<'exercicios'>[], tipo: 'simples' | 'combinada') => void;
  gruposMuscularesFiltro: string[];
  exerciciosJaAdicionados: string[];
}

export const ExercicioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAdd,
  gruposMuscularesFiltro,
  exerciciosJaAdicionados
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

  const dificuldadeOptions = [{ value: 'todos', label: 'Todas' }, { value: 'Baixa', label: 'Baixa' }, { value: 'Média', label: 'Média' }, { value: 'Alta', label: 'Alta' }];

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
  const [exerciciosSelecionados, setExerciciosSelecionados] = useState<Tables<'exercicios'>[]>([]);

  // Estados para modal de detalhes
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [exercicioDetalhesId, setExercicioDetalhesId] = useState('');

  // Estado para controlar visibilidade dos filtros
  const [showFiltros, setShowFiltros] = useState(false);

  // Todos os exercícios disponíveis
  const exerciciosDisponiveis = [...exerciciosPadrao, ...exerciciosPersonalizados];

  // Resetar seleção quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      // Se há APENAS um grupo, filtra por ele. Se houver mais, começa mostrando todos.
      if (gruposMuscularesFiltro.length === 1) {
        setFiltros(prev => ({ ...prev, grupo_muscular: gruposMuscularesFiltro[0] }));
      } else {
        setFiltros(prev => ({ ...prev, grupo_muscular: 'todos' }));
      }
    }
  }, [isOpen, gruposMuscularesFiltro]);

  // Limpa a seleção quando o tipo de série muda
  useEffect(() => {
    setExerciciosSelecionados([]);
  }, [tipoSerie]);


  // Função para atualizar filtros
  const atualizarFiltro = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  // Filtrar exercícios
  const exerciciosFiltrados = exerciciosDisponiveis.filter(exercicio => {
    // 1. Filtro primário: apenas exercícios que pertencem aos grupos musculares do treino
    const pertenceAosGruposDoTreino = gruposMuscularesFiltro.length === 0 || (exercicio.grupo_muscular && gruposMuscularesFiltro.includes(exercicio.grupo_muscular));
    if (!pertenceAosGruposDoTreino) {
      return false;
    }

    // 2. Filtros secundários (da UI do modal)
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

  // Verificar se deve mostrar filtro de grupo muscular
  const mostrarFiltroGrupo = gruposMuscularesFiltro.length > 1;

  // Detectar se há filtros ativos
  const temFiltrosAtivos = 
    (filtros.grupo_muscular && filtros.grupo_muscular !== 'todos') ||
    (filtros.tipo && filtros.tipo !== 'todos') ||
    (filtros.equipamento && filtros.equipamento !== 'todos') ||
    (filtros.dificuldade && filtros.dificuldade !== 'todos');

  // Verificar se existem exercícios personalizados
  const temExerciciosPersonalizados = exerciciosDisponiveis.some(ex => ex.tipo === 'personalizado');

  // Função para mostrar detalhes do exercício
  const mostrarDetalhes = (exercicioId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExercicioDetalhesId(exercicioId);
    setModalDetalhesVisible(true);
  };

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltros({
      busca: '',
      grupo_muscular: 'todos',
      tipo: 'todos',
      equipamento: 'todos',
      dificuldade: 'todos'
    });
  };

  // Toggle seleção de exercício
  const toggleExercicioSelecionado = (exercicio: Tables<'exercicios'>) => {
    if (!podeSelecionarExercicio(exercicio) || exerciciosJaAdicionados.includes(exercicio.id)) return;

    const jaEstaSelecionado = exerciciosSelecionados.find(ex => ex.id === exercicio.id);
    
    if (jaEstaSelecionado) {
      // Remover seleção
      setExerciciosSelecionados(prev => prev.filter(ex => ex.id !== exercicio.id));
    } else {
      // Adicionar seleção
      if (tipoSerie === 'simples') {
        // Para série simples, substitui a seleção
        setExerciciosSelecionados([exercicio]);
      } else {
        // Para série combinada, permite até 2
        if (exerciciosSelecionados.length < 2) {
          setExerciciosSelecionados(prev => [...prev, exercicio]);
        }
      }
    }
  };

  // Verificar se pode selecionar exercício
  const podeSelecionarExercicio = (exercicio: Tables<'exercicios'>) => {
    const jaEstaSelecionado = exerciciosSelecionados.some(ex => ex.id === exercicio.id);
    
    if (jaEstaSelecionado) return true; // Sempre pode desselecionar
    
    if (tipoSerie === 'simples') {
      return true; // Para série simples, sempre pode selecionar (substituirá)
    } else {
      return exerciciosSelecionados.length < 2; // Para combinada, só se tiver menos de 2
    }
  };

  // Verificar se seleção é válida
  const isSelecaoValida = () => {
    if (tipoSerie === 'simples') {
      return exerciciosSelecionados.length === 1;
    } else {
      return exerciciosSelecionados.length === 2;
    }
  };

  // Confirmar seleção e adicionar exercício
  const handleConfirmar = () => {
    if (!isSelecaoValida()) return;    
    onAdd(exerciciosSelecionados, tipoSerie);    

    if (tipoSerie === 'simples' && exerciciosSelecionados.length === 1) {
      toast.success(`Exercício "${exerciciosSelecionados[0].nome}" adicionado.`);
    } else if (tipoSerie === 'combinada' && exerciciosSelecionados.length === 2) {
      toast.success(`Exercícios '${exerciciosSelecionados[0].nome}' e '${exerciciosSelecionados[1].nome}' adicionados.`);
    }

    // Limpa a seleção para permitir a próxima escolha, sem fechar o modal
    setExerciciosSelecionados([]);
  };

  // Texto para o contador de seleção
  const selecaoTexto = (() => {
    const count = exerciciosSelecionados.length;

    if (tipoSerie === 'combinada') {
      return `Selecione 2 exercícios (${count}/2)`;
    }
    
    // Para série simples
    return `Selecione 1 exercício (${count}/1)`;
  })();

  return (
    <>
      {/* Modal principal de exercícios */}
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 outline-none flex flex-col"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              <span className="font-semibold">Adicionar Exercício(s)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Área central com scroll */}
        <div className="flex-1 overflow-y-auto">
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
                className="justify-start"
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Série Simples
              </Button>
              <Button
                type="button"
                variant={tipoSerie === 'combinada' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTipoSerie('combinada')}
                className="justify-start"
              >
                <Link className="h-4 w-4 mr-2" />
                Série Combinada
              </Button>
            </div>

            {/* Busca + Botão Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Busca principal */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar exercício..."
                  value={filtros.busca}
                  onChange={(e) => atualizarFiltro('busca', e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Botão Filtros */}
              <Button
                variant="outline"
                onClick={() => setShowFiltros(prev => !prev)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>

            {/* Filtros avançados */}
            {showFiltros && (
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                {/* Filtro de Grupo Muscular */}
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

                {/* Filtro Tipo */}
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

                {/* Equipamento */}
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Equipamento</Label>
                  <CustomSelect
                    inputId="filtro-equipamento"
                    value={equipamentoOptions.find(opt => opt.value === filtros.equipamento)}
                    onChange={(option) => atualizarFiltro('equipamento', option ? String(option.value) : 'todos')}
                    options={equipamentoOptions}
                  />
                </div>

                {/* Dificuldade */}
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Dificuldade</Label>
                  <CustomSelect
                    inputId="filtro-dificuldade"
                    value={dificuldadeOptions.find(opt => opt.value === filtros.dificuldade)}
                    onChange={(option) => atualizarFiltro('dificuldade', option ? String(option.value) : 'todos')}
                    options={dificuldadeOptions}
                  />
                </div>

                {/* Botão Limpar */}
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

            {/* Contador de exercícios encontrados */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exerciciosFiltrados.map((exercicio: Tables<'exercicios'>) => {
                  const estaSelecionado = exerciciosSelecionados.find(ex => ex.id === exercicio.id);
                  const jaAdicionado = exerciciosJaAdicionados.includes(exercicio.id);
                  const podeSelecionar = !jaAdicionado && podeSelecionarExercicio(exercicio);

                  return (
                    <div
                      key={String(exercicio.id)}
                      className={`
                        relative p-4 border rounded-lg transition-all
                        ${estaSelecionado 
                          ? 'border-red-500 bg-red-50 ring-2 ring-red-200' 
                          : podeSelecionar
                            ? 'border-gray-200 cursor-pointer hover:border-red-300 hover:bg-red-50'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                        }
                      `}
                      onClick={() => podeSelecionar && toggleExercicioSelecionado(exercicio)}
                    >
                      {/* Ícones do canto superior direito */}
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {/* Botão de detalhes */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => mostrarDetalhes(exercicio.id, e)}
                          className="h-6 w-6 p-0 hover:bg-blue-100 rounded-full"
                          title="Ver detalhes do exercício"
                        >
                          <Info className="h-4 w-4 text-blue-600" />
                        </Button>

                        {jaAdicionado && !estaSelecionado && (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center" title="Já adicionado a este treino">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}

                        {/* Check de seleção */}
                        {estaSelecionado && (
                          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      <h4 className="font-medium text-gray-900 mb-2 pr-12">
                        {exercicio.nome}
                      </h4>

                      <div className="flex flex-wrap gap-2 mb-2">
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

                      {exercicio.descricao && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {exercicio.descricao}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer fixo */}
        <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-end">
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Concluir
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={!isSelecaoValida()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              <div className="text-sm text-gray-600 h-5">{selecaoTexto}</div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de detalhes do exercício */}
      <ExercicioDetalhesModal
        visible={modalDetalhesVisible}
        exercicioId={exercicioDetalhesId}
        onClose={() => setModalDetalhesVisible(false)}
      />
    </>
  );
};