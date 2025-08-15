// src/hooks/rotina/useExerciciosModal.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FiltrosExercicio, ExercicioInfo } from '@/types/rotina.types';
import { ExercicioRotinaLocal, SerieConfig } from '@/types/rotina.types';

export const useExerciciosModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treinoSelecionado, setTreinoSelecionado] = useState('');
  const [gruposFiltro, setGruposFiltro] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exerciciosDisponiveis, setExerciciosDisponiveis] = useState<ExercicioInfo[]>([]);
  const [tipoSerie, setTipoSerie] = useState<'simples' | 'combinada'>('simples');
  const [exerciciosSelecionados, setExerciciosSelecionados] = useState<ExercicioInfo[]>([]);

  const [filtros, setFiltros] = useState<FiltrosExercicio>({
    tipo: 'todos',
    equipamento: 'todos',
    busca: ''
  });

  // Buscar exercícios no Supabase
  const buscarExercicios = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .eq('is_ativo', true)
        .in('grupo_muscular', gruposFiltro)
        .order('nome');

      if (error) throw error;

      const exerciciosFormatados: ExercicioInfo[] = (data || []).map(ex => ({
        id: ex.id,
        nome: ex.nome,
        equipamento: ex.equipamento || '',
        grupo_muscular: ex.grupo_muscular || '',
        dificuldade: ex.dificuldade || '',
        tipo: ex.tipo || 'padrao',
        descricao: ex.descricao || ''
      }));

      setExerciciosDisponiveis(exerciciosFormatados);
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
      setExerciciosDisponiveis([]);
    } finally {
      setLoading(false);
    }
  }, [gruposFiltro]);

  // Buscar exercícios disponíveis quando o modal abrir
  useEffect(() => {
    if (isModalOpen && gruposFiltro.length > 0) {
      buscarExercicios();
    }
  }, [isModalOpen, gruposFiltro, buscarExercicios]);

  // ✅ FILTRAR EXERCÍCIOS BASEADO NOS FILTROS - CORRIGIDO COM FILTRO DE GRUPO
  const exerciciosFiltrados = exerciciosDisponiveis.filter(exercicio => {
    const matchTipo = filtros.tipo === 'todos' || 
                     (filtros.tipo === 'padrao' && exercicio.tipo === 'padrao') ||
                     (filtros.tipo === 'personalizado' && exercicio.tipo === 'personalizado');
    
    const matchEquipamento = filtros.equipamento === 'todos' || 
                             exercicio.equipamento === filtros.equipamento;
    
    const matchBusca = filtros.busca === '' || 
                       exercicio.nome.toLowerCase().includes(filtros.busca.toLowerCase()) ||
                       exercicio.descricao?.toLowerCase().includes(filtros.busca.toLowerCase());

    // ✅ ADICIONADO: Filtro por grupo muscular
    const matchGrupo = !filtros.grupo_muscular || 
                       filtros.grupo_muscular === 'todos' || 
                       exercicio.grupo_muscular === filtros.grupo_muscular;

    return matchTipo && matchEquipamento && matchBusca && matchGrupo;
  });

  // Atualizar filtro
  const atualizarFiltro = useCallback(<T extends keyof FiltrosExercicio>(
    campo: T, 
    valor: FiltrosExercicio[T]
  ) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  }, []);

  // Toggle seleção de exercício
  const toggleExercicioSelecionado = useCallback((exercicio: ExercicioInfo) => {
    setExerciciosSelecionados(prev => {
      const jaEstaSelecionado = prev.find(ex => ex.id === exercicio.id);
      
      if (jaEstaSelecionado) {
        return prev.filter(ex => ex.id !== exercicio.id);
      }

      // Limitar seleção baseada no tipo de série
      if (tipoSerie === 'simples') {
        return [exercicio]; // Apenas 1 para série simples
      } else {
        if (prev.length >= 2) {
          return [prev[1], exercicio]; // Máximo 2 para série combinada
        }
        return [...prev, exercicio];
      }
    });
  }, [tipoSerie]);

  // Limpar seleção
  const limparSelecao = useCallback(() => {
    setExerciciosSelecionados([]);
  }, []);

  // Abrir modal
  const abrirModal = useCallback((treinoId: string, grupos: string[]) => {
    setTreinoSelecionado(treinoId);
    setGruposFiltro(grupos);
    setIsModalOpen(true);
    setExerciciosSelecionados([]);
    setTipoSerie('simples');
    setFiltros({
      tipo: 'todos',
      equipamento: 'todos',
      busca: ''
    });
  }, []);

  // Fechar modal
  const fecharModal = useCallback(() => {
    setIsModalOpen(false);
    setTreinoSelecionado('');
    setGruposFiltro([]);
    setExerciciosSelecionados([]);
    setExerciciosDisponiveis([]);
  }, []);

  // Criar exercício simples
  const criarExercicioSimples = useCallback((exercicio: ExercicioInfo): ExercicioRotinaLocal => {
    const serieInicial: SerieConfig = {
      id: `serie-1-${Date.now()}`,
      numero_serie: 1,
      repeticoes: 12,
      carga: 0,
      intervalo_apos_serie: 90,
      tem_dropset: false
    };

    return {
      id: `exercicio-${Date.now()}`,
      exercicio_1_id: exercicio.id,
      tipo: 'simples',
      ordem: 1, // Será ajustado na hora de adicionar
      intervalo_apos_exercicio: 90,
      series: [serieInicial]
    };
  }, []);

  // Criar exercício combinado
  const criarExercicioCombinado = useCallback((exercicios: ExercicioInfo[]): ExercicioRotinaLocal => {
    if (exercicios.length !== 2) {
      throw new Error('Exercício combinado requer exatamente 2 exercícios');
    }

    const serieInicial: SerieConfig = {
      id: `serie-1-${Date.now()}`,
      numero_serie: 1,
      repeticoes_1: 12,
      carga_1: 0,
      repeticoes_2: 12,
      carga_2: 0,
      intervalo_apos_serie: 90,
      tem_dropset: false
    };

    return {
      id: `exercicio-${Date.now()}`,
      exercicio_1_id: exercicios[0].id,
      exercicio_2_id: exercicios[1].id,
      tipo: 'combinada',
      ordem: 1, // Será ajustado na hora de adicionar
      intervalo_apos_exercicio: 90,
      series: [serieInicial]
    };
  }, []);

  // ✅ PADRONIZADO: Verificar se pode selecionar exercício (sempre esconder selecionados)
  const podeSelecionarExercicio = useCallback((exercicio: ExercicioInfo): boolean => {
    // Sempre verificar se já foi selecionado, independente do tipo de série
    return !exerciciosSelecionados.find(ex => ex.id === exercicio.id);
  }, [exerciciosSelecionados]);

  // Verificar se seleção é válida
  const isSelecaoValida = useCallback((): boolean => {
    if (tipoSerie === 'simples') {
      return exerciciosSelecionados.length === 1;
    }
    return exerciciosSelecionados.length === 2;
  }, [tipoSerie, exerciciosSelecionados]);

  return {
    // Estado do modal
    isModalOpen,
    treinoSelecionado,
    gruposFiltro,
    loading,
    
    // Dados dos exercícios
    exerciciosDisponiveis,
    exerciciosFiltrados,
    
    // Filtros
    filtros,
    atualizarFiltro,
    
    // Tipo de série
    tipoSerie,
    setTipoSerie,
    
    // Seleção
    exerciciosSelecionados,
    toggleExercicioSelecionado,
    limparSelecao,
    
    // Controle do modal
    abrirModal,
    fecharModal,
    
    // Criação de exercícios
    criarExercicioSimples,
    criarExercicioCombinado,
    
    // Validações
    podeSelecionarExercicio,
    isSelecaoValida
  };
};

export default useExerciciosModal;