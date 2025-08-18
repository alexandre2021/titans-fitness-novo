// src/components/rotina/exercicios/ExercicioModal.tsx

/**
 * Modal de seleção de exercícios para criação de rotinas.
 * 
 * FUNCIONALIDADE ADICIONADA: Visualização de detalhes dos exercícios
 * Para melhorar a experiência do Personal Trainer durante a criação de rotinas,
 * adicionamos a possibilidade de visualizar detalhes completos de cada exercício
 * através de um ícone 'i' presente em cada card.
 * 
 * RESPONSIVIDADE APRIMORADA:
 * - Mobile (< 768px): Drawer que desliza de baixo para cima
 * - Desktop (≥ 768px): Modal tradicional no centro
 * - Textos otimizados para cada dispositivo
 */

import React, { useState } from 'react';
import { X, Search, Link, Dumbbell, Filter, Check, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRotinaExerciciosContext } from '@/context/useRotinaExerciciosContext';
import { ExercicioDetalhesModal } from '../execucao/shared/ExercicioDetalhesModal';

// Hook para detectar mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
};

// Constantes do sistema de exercícios
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
  'Bolas Medicinais'
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

// Componente de conteúdo compartilhado
const ExercicioModalContent: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const {
    isModalOpen,
    fecharModal,
    loading,
    exerciciosFiltrados,
    exerciciosDisponiveis,
    filtros,
    atualizarFiltro,
    tipoSerie,
    setTipoSerie,
    exerciciosSelecionados,
    toggleExercicioSelecionado,
    podeSelecionarExercicio,
    isSelecaoValida,
    criarExercicioSimples,
    criarExercicioCombinado,
    adicionarExercicio,
    treinoSelecionado,
    gruposFiltro
  } = useRotinaExerciciosContext();

  // Estado para controlar visibilidade dos filtros
  const [showFiltros, setShowFiltros] = useState(false);

  // Estados para modal de detalhes
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [exercicioDetalhesId, setExercicioDetalhesId] = useState('');

  // Verificar se deve mostrar filtro de grupo muscular
  const mostrarFiltroGrupo = gruposFiltro.length > 1;

  // Detectar se há filtros ativos
  const temFiltrosAtivos = 
    (filtros.grupo_muscular && filtros.grupo_muscular !== 'todos') ||
    (filtros.tipo && filtros.tipo !== 'todos') ||
    (filtros.equipamento && filtros.equipamento !== 'todos');

  // Verificar se existem exercícios personalizados
  const temExerciciosPersonalizados = exerciciosDisponiveis.some(ex => ex.tipo === 'personalizado');

  // Função para mostrar detalhes do exercício
  const mostrarDetalhes = (exercicioId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Impede que o card seja selecionado
    setExercicioDetalhesId(exercicioId);
    setModalDetalhesVisible(true);
  };

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    atualizarFiltro('grupo_muscular', 'todos');
    atualizarFiltro('tipo', 'todos');
    atualizarFiltro('equipamento', 'todos');
  };

  // Confirmar seleção e adicionar exercício
  const handleConfirmar = () => {
    if (!isSelecaoValida()) return;

    try {
      let exercicioParaAdicionar;

      if (tipoSerie === 'simples') {
        exercicioParaAdicionar = criarExercicioSimples(exerciciosSelecionados[0]);
      } else {
        exercicioParaAdicionar = criarExercicioCombinado(exerciciosSelecionados);
      }

      adicionarExercicio(treinoSelecionado, exercicioParaAdicionar);
    } catch (error) {
      console.error('Erro ao adicionar exercício:', error);
    }
  };

  // Equipamentos únicos dos exercícios filtrados
  const equipamentosDisponiveis = Array.from(
    new Set(exerciciosFiltrados.map(ex => ex.equipamento).filter(Boolean))
  ).sort();

  return (
    <>
      {/* Header */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          <span className="font-semibold">Adicionar Exercício</span>
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
              {gruposFiltro.map((grupo: string) => (
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
            <div className={`flex flex-col sm:flex-row gap-4 ${temFiltrosAtivos ? 'items-start' : 'items-end'}`}>
              {/* Filtro de Grupo Muscular */}
              {mostrarFiltroGrupo && (
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Grupo Muscular</Label>
                  <Select
                    value={filtros.grupo_muscular || 'todos'}
                    onValueChange={(value) => atualizarFiltro('grupo_muscular', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os grupos</SelectItem>
                      {gruposFiltro.map((grupo: string) => (
                        <SelectItem key={String(grupo)} value={grupo}>
                          {grupo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro Tipo */}
              {temExerciciosPersonalizados && (
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Tipo</Label>
                  <Select
                    value={filtros.tipo}
                    onValueChange={(value) => atualizarFiltro('tipo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="padrao">Padrão</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Equipamento */}
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-medium">Equipamento</Label>
                <Select
                  value={filtros.equipamento}
                  onValueChange={(value) => atualizarFiltro('equipamento', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {equipamentosDisponiveis.map((equipamento: string) => (
                      <SelectItem key={String(equipamento)} value={equipamento}>
                        {equipamento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          {/* Informação sobre seleção */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {exerciciosFiltrados.length} exercício(s) encontrado(s)
            </span>
            <span className="text-gray-600">
              {tipoSerie === 'simples' 
                ? 'Selecione 1 exercício' 
                : `Selecione 2 exercícios (${exerciciosSelecionados.length}/2)`
              }
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
              {exerciciosFiltrados.map((exercicio: import('@/types/rotina.types').ExercicioInfo) => {
                const estaSelecionado = exerciciosSelecionados.find(ex => ex.id === exercicio.id);
                const podeSelecionar = podeSelecionarExercicio(exercicio);

                return (
                  <div
                    key={String(exercicio.id)}
                    className={`
                      relative p-4 border rounded-lg cursor-pointer transition-all
                      ${estaSelecionado 
                        ? 'border-red-500 bg-red-50 ring-2 ring-red-200' 
                        : podeSelecionar
                          ? 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
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
      <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0 flex items-center justify-between">
        {/* Desktop: Mostra contador de selecionados */}
        {!isMobile && (
          <div className="text-sm text-gray-600">
            {exerciciosSelecionados.length > 0 && (
              <span>
                {exerciciosSelecionados.length} exercício(s) selecionado(s)
              </span>
            )}
          </div>
        )}

        {/* Mobile: Sem contador (espaço otimizado) */}
        {isMobile && <div />}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={fecharModal}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          
          <Button
            type="button"
            onClick={handleConfirmar}
            disabled={!isSelecaoValida()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            {/* Desktop: Texto completo, Mobile: Texto reduzido */}
            {isMobile 
              ? 'Adicionar' 
              : `Adicionar ${tipoSerie === 'simples' ? 'Exercício' : 'Exercícios'}`
            }
          </Button>
        </div>
      </div>

      {/* Modal de detalhes do exercício */}
      <ExercicioDetalhesModal
        visible={modalDetalhesVisible}
        exercicioId={exercicioDetalhesId}
        onClose={() => setModalDetalhesVisible(false)}
      />
    </>
  );
};

export const ExercicioModal: React.FC = () => {
  const { isModalOpen, fecharModal } = useRotinaExerciciosContext();
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile: Drawer
    return (
      <Drawer open={isModalOpen} onOpenChange={fecharModal}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <ExercicioModalContent isMobile={true} />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog
  return (
    <Dialog open={isModalOpen} onOpenChange={fecharModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <ExercicioModalContent isMobile={false} />
      </DialogContent>
    </Dialog>
  );
};

export default ExercicioModal;