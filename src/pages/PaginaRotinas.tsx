import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Modal from 'react-modal';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Dumbbell, 
  Target, 
  Clock, 
  Plus, 
  MoreVertical,
  ChevronDown,
  Eye,
  Play,
  Activity,
  Trash2,
  CheckCircle,
  Pause,
  Ban,
  Info,
  Calendar,
  CalendarCheck, // ✅ Adicionado
  FileText,
  FilePlus,
  BookCopy,
  Loader2,
  X,
  User
} from 'lucide-react';
import { BicepsFlexed } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExercicioLookup } from '@/hooks/useExercicioLookup';
import { toast } from 'sonner';
import RotinaDetalhesModal from '@/components/rotina/RotinaDetalhesModal';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ExercicioRotina, Serie } from '@/types/rotina.types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExercicioModelo } from './NovoModelo'; // Type for creation/editing state
import { Tables } from '@/integrations/supabase/types'; // Supabase generated types

// Componente de modal genérico usando react-modal
interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

const ResponsiveModal = ({ open, onOpenChange, title, children }: ResponsiveModalProps) => {
  const handleClose = () => onOpenChange(false);

  return (
    <Modal
      isOpen={open}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      className="bg-white rounded-lg max-w-md w-full mx-4 outline-none"
      overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </Modal>
  );
};

interface AlunoInfo {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
}

interface Rotina {
  id: string;
  nome: string;
  objetivo: string;
  data_inicio: string;
  duracao_semanas: number;
  treinos_por_semana: number;
  status: string;
  descricao?: string;
  dificuldade: string;
  valor_total: number;
  forma_pagamento: string;
  created_at: string;
  updated_at: string;
  professor_id: string;
  aluno_id: string;
  professores: {
    id: string;
    nome_completo: string;
  } | null;
}

interface PaginaRotinasProps {
  modo: 'professor' | 'aluno';
}

const PaginaRotinas = ({ modo }: PaginaRotinasProps) => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getExercicioInfo } = useExercicioLookup();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // Deriva o alunoId do contexto de rota (para PT) ou de autenticação (para Aluno)
  // O 'id' do useParams corresponde ao :id na rota /alunos-rotinas/:id
  const alunoId = modo === 'professor' ? params.id : user?.id;

  // Estados permanecem os mesmos
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [rotinasAtivas, setRotinasAtivas] = useState<Rotina[]>([]);
  const [rotinasEncerradas, setRotinasEncerradas] = useState<Rotina[]>([]);
  const [rotinasRascunho, setRotinasRascunho] = useState<Rotina[]>([]); // Mantém a lógica correta aqui
  const [activeTab, setActiveTab] = useState<"atual" | "rascunho" | "encerradas">("atual");
  const [showConcluidaDialog, setShowConcluidaDialog] = useState(false);
  const [showStatusInfoDialog, setShowStatusInfoDialog] = useState(false);
  const [selectedRotina, setSelectedRotina] = useState<Rotina | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [navegandoNovaRotina, setNavegandoNovaRotina] = useState(false);
  const [showCriarModal, setShowCriarModal] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [temModelos, setTemModelos] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  
  const handleNovaRotinaClick = async () => {
    // ✅ NOVA VERIFICAÇÃO: Checar se já existe uma rotina ativa ou bloqueada
    if (rotinasAtivas.some(r => r.status === 'Ativa' || r.status === 'Bloqueada')) {
      toast.error("Rotina já existe", {
        description: "Este aluno já possui uma rotina (ativa ou bloqueada). Finalize ou exclua a rotina atual antes de criar uma nova.",
      });
      return;
    }

    if (rotinasRascunho.length > 0) {
      toast.error("Já existe um rascunho", {
        description: "Finalize ou descarte o rascunho atual antes de criar uma nova rotina.",
      });
      return;
    }

    // Check if PT has models to decide which options to show
    setLoadingModelos(true);
    try {
        if (!user) return;
        const { count, error } = await supabase
            .from('modelos_rotina')
            .select('*', { count: 'exact', head: true })
            .eq('professor_id', user.id);

        if (error) throw error;
        setTemModelos((count || 0) > 0);
    } catch (error) {
        console.error("Erro ao verificar modelos:", error);
        setTemModelos(false); // Assume no models on error
    } finally {
        setLoadingModelos(false);
    }

    setShowCriarModal(true);
  };

  const handleCriarDoZero = () => {
    setShowCriarModal(false);
    // Limpa qualquer rascunho anterior para este aluno específico, compatível com a nova página
    sessionStorage.removeItem(`rotina_em_criacao_${alunoId}`);
    setNavegandoNovaRotina(true);
    // Navega para a nova página única de criação de rotina
    navigate(`/rotinas-criar/${alunoId}`);
  };

  const handleUsarModelo = () => {
    setShowCriarModal(false);
    setNavegandoNovaRotina(true);
    navigate(`/selecionar-modelo?alunoId=${alunoId}`);
  };

  // ✅ NOVA FUNÇÃO: Carrega um rascunho para o sessionStorage e navega para edição
  const handleContinuarRascunho = async (rotinaId: string) => {
    setNavegandoNovaRotina(true);
    try {
      // 1. Buscar todos os dados do rascunho
      const { data: rotina, error: rotinaError } = await supabase.from('rotinas').select('*').eq('id', rotinaId).single();
      if (rotinaError) throw rotinaError;

      const { data: treinos, error: treinosError } = await supabase.from('treinos').select('*').eq('rotina_id', rotinaId).order('ordem');
      if (treinosError) throw treinosError;

      const exerciciosPorTreino: Record<string, ExercicioModelo[]> = {};
      for (const treino of treinos) {
        const { data: exerciciosDb, error: exerciciosError } = await supabase.from('exercicios_rotina').select('*, series(*)').eq('treino_id', treino.id).order('ordem');
        if (exerciciosError) throw exerciciosError;

        exerciciosPorTreino[treino.id] = exerciciosDb.map(ex => ({
          id: ex.id,
          exercicio_1_id: ex.exercicio_1_id,
          exercicio_2_id: ex.exercicio_2_id ?? undefined,
          tipo: ex.exercicio_2_id ? 'combinada' : 'simples',
          series: ex.series.map((s: Tables<'series'>) => ({
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

      // 2. Montar o objeto para o sessionStorage
      const rotinaStorageData = {
        draftId: rotina.id, // Adiciona o ID do rascunho para o processo de atualização
        configuracao: {
          nome: rotina.nome || '',
          objetivo: rotina.objetivo || '',
          dificuldade: rotina.dificuldade || '',
          duracao_semanas: rotina.duracao_semanas ?? undefined,
          treinos_por_semana: rotina.treinos_por_semana ?? undefined,
          data_inicio: rotina.data_inicio || new Date().toISOString().split('T')[0],
          descricao: rotina.descricao || ''
        },
        treinos: treinos.map(t => ({ ...t, grupos_musculares: t.grupos_musculares ? t.grupos_musculares.split(',') : [] })),
        exercicios: exerciciosPorTreino,
        etapaAtual: 'configuracao', // Começar pela configuração para o usuário revisar
      };

      // 3. Salvar no sessionStorage e navegar
      sessionStorage.setItem(`rotina_em_criacao_${alunoId}`, JSON.stringify(rotinaStorageData));

      navigate(`/rotinas-criar/${alunoId}`);

    } catch (error) {
      console.error("Erro ao carregar rascunho:", error);
      toast.error("Erro ao carregar rascunho", {
        description: "Não foi possível carregar o rascunho. Tente novamente.",
      });
      setNavegandoNovaRotina(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect fetchDados executado');
    console.log('📊 Estados:', { alunoId, user: !!user });
    
    const fetchDados = async () => {
      if (!alunoId || !user) {
        console.log('⚠️ Condições não atendidas:', { alunoId: !!alunoId, user: !!user });
        return;
      }

      console.log('📡 Buscando dados...');
      // ... resto da função
      try {
        // Otimização: Buscar todos os dados em paralelo
        const [alunoResult, rotinasResult] = await Promise.all([
          supabase.from('alunos').select('id, nome_completo, email, avatar_type, avatar_image_url, avatar_letter, avatar_color').eq('id', alunoId).single(),
          supabase.from('rotinas').select('*, professores(id, nome_completo)').eq('aluno_id', alunoId).order('created_at', { ascending: false })
        ]);

        // Checar erros e tratar
        if (alunoResult.error) {
          console.error('Erro ao buscar aluno:', alunoResult.error);
          toast.error("Erro", {
            description: "Aluno não encontrado.",
          });
          navigate('/alunos');
          return;
        }

        setAluno(alunoResult.data);
        
        // ✅ Separar rotinas por status
        const rotinasDoAluno = (rotinasResult.data as Rotina[] || []);
        setRotinasAtivas(rotinasDoAluno.filter(r => r.status === 'Ativa' || r.status === 'Bloqueada'));
        setRotinasRascunho(rotinasDoAluno.filter(r => r.status === 'Rascunho' && r.professor_id === user.id));
        setRotinasEncerradas(rotinasDoAluno.filter(r => r.status === 'Concluída' || r.status === 'Cancelada')); // Mantém a lógica correta aqui

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast.error("Erro", {
          description: "Erro ao carregar dados do aluno.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [alunoId, user, navigate, modo]);

  const renderAvatar = () => {
    if (!aluno) return null;
    
    if (aluno.avatar_type === 'image' && aluno.avatar_image_url) {
      return <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />;
    }
    
    return (
      <AvatarFallback 
        style={{ backgroundColor: aluno.avatar_color }}
        className="text-white font-semibold"
      >
        {aluno.avatar_letter || aluno.nome_completo.charAt(0).toUpperCase()}
      </AvatarFallback>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'Ativa': 'bg-green-100 text-green-800',
      'Rascunho': 'bg-gray-100 text-gray-800',
      'Bloqueada': 'bg-red-100 text-red-800',      
      'Concluída': 'bg-blue-100 text-blue-800',
      'Cancelada': 'bg-orange-100 text-orange-800'
    };
    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
    return (
      <Badge className={colorClass}>
        {status}
      </Badge>
    );
  };

  const getObjetivoBadge = (objetivo: string) => {
    const objetivoColors = {
      'Emagrecimento': 'bg-orange-100 text-orange-800',
      'Ganho de massa': 'bg-blue-100 text-blue-800',
      'Definição muscular': 'bg-purple-100 text-purple-800',
      'Condicionamento físico': 'bg-green-100 text-green-800',
      'Reabilitação': 'bg-yellow-100 text-yellow-800',
      'Performance esportiva': 'bg-indigo-100 text-indigo-800'
    };
    
    const colorClass = objetivoColors[objetivo as keyof typeof objetivoColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={colorClass}>
        {objetivo}
      </Badge>
    );
  };

  const getDificuldadeBadge = (dificuldade: string) => {
    const dificuldadeColors = {
      'Baixa': 'bg-green-100 text-green-800',
      'Média': 'bg-yellow-100 text-yellow-800',
      'Alta': 'bg-red-100 text-red-800'
    };
    
    const colorClass = dificuldadeColors[dificuldade as keyof typeof dificuldadeColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={colorClass}>
        {dificuldade}
      </Badge>
    );
  };

  const handleVerDetalhes = (rotinaId: string) => {
    // ✅ CORREÇÃO: Busca a rotina em todas as listas para garantir que os detalhes de rotinas encerradas também possam ser vistos.
    const rotinaSelecionada = [...rotinasAtivas, ...rotinasEncerradas, ...rotinasRascunho].find(
      (r) => r.id === rotinaId
    );
    setSelectedRotina(rotinaSelecionada || null);
    // ✅ ALTERAÇÃO: Unifica o comportamento para ambos os perfis.
    navigate(`/alunos-rotinas/${alunoId}/${rotinaId}`);
  };

  const handleTreinar = (rotinaId: string) => {
    // Passa o modo atual para a próxima página, para que ela saiba como buscar os dados.
    navigate(`/execucao-rotina/selecionar-treino/${rotinaId}`, {
      state: { modo: modo }
    });
  };

  const handleUpdateRotinaStatus = async (rotina: Rotina, novoStatus: 'Ativa' | 'Bloqueada') => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('rotinas')
        .update({ status: novoStatus })
        .eq('id', rotina.id)
        .eq('professor_id', user?.id);
  
      if (error) {
        console.error(`Erro ao alterar status para ${novoStatus}:`, error);
        toast.error("Erro", {
          description: `Não foi possível alterar o status da rotina. Tente novamente.`,
        });
      } else {
        // Atualizar lista local
        setRotinasAtivas(prev => prev.map(r => 
          r.id === rotina.id ? { ...r, status: novoStatus } : r
        ));
      }
    } catch (error) {
      console.error(`Erro inesperado ao alterar status para ${novoStatus}:`, error);
      toast.error("Erro", {
        description: "Ocorreu um erro inesperado. Tente novamente.",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelarExclusao = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
    setSelectedRotina(null);
  };

  const handleAlunoExcluirRotina = async () => {
    if (!selectedRotina || modo !== 'aluno') return;
    setIsDeleting(true);
    try {
      // Ação correta: DELETAR a rotina do banco de dados
      const { error } = await supabase.from('rotinas').delete().eq('id', selectedRotina.id);
      if (error) throw error;

      // Atualização otimista da UI
      setRotinasAtivas(prev => prev.filter(r => r.id !== selectedRotina.id));

      // Enviar notificação para o professor
      if (aluno && selectedRotina.professor_id) {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            destinatario_id: selectedRotina.professor_id,
            conteudo: `O aluno ${aluno.nome_completo} excluiu a rotina de treino "${selectedRotina.nome}".`
          }
        });
      }

      toast.success("Rotina excluída com sucesso.");
    } catch (error) {
      toast.error("Erro ao excluir rotina", { description: "Você pode não ter permissão para esta ação. Tente novamente." });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExcluirRotina = (rotina: Rotina) => {
    setSelectedRotina(rotina);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!selectedRotina) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('rotinas')
        .delete()
        .eq('id', selectedRotina.id)
        .eq('professor_id', user?.id);

      if (error) {
        throw error;
      }

      // Enviar notificação para o aluno
      if (user && selectedRotina.aluno_id) {
        const { data: professorProfile } = await supabase.from('professores').select('nome_completo').eq('id', user.id).single();
        if (professorProfile) {
          await supabase.functions.invoke('enviar-notificacao', {
            body: {
              destinatario_id: selectedRotina.aluno_id,
              conteudo: `O professor ${professorProfile.nome_completo} excluiu sua rotina de treino "${selectedRotina.nome}".`
            }
          });
        }
      }

      if (selectedRotina.status === 'Rascunho') {
        setRotinasRascunho(prev => prev.filter(r => r.id !== selectedRotina.id));
      } else {
        setRotinasAtivas(prev => prev.filter(r => r.id !== selectedRotina.id));
      }

    } catch (error) {
      console.error("Erro ao excluir rotina:", error);
      toast.error("Erro", {
        description: "Não foi possível excluir a rotina. Tente novamente.",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedRotina(null);
    }
  };
  const handleConcluidaClick = (rotina: Rotina) => {
    setSelectedRotina(rotina);
    // ✅ ALTERAÇÃO: Reutiliza o modal de detalhes da rotina em vez de um diálogo específico.
    navigate(`/alunos-rotinas/${alunoId}/${rotina.id}`);
  };

  const renderMenuOpcoes = (rotina: Rotina) => {
    // ✅ ALTERAÇÃO: Unifica o menu para rotinas Concluídas e Canceladas
    if (rotina.status === 'Concluída' || rotina.status === 'Cancelada') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4"><MoreVertical /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleVerDetalhes(rotina.id)}>
              <Eye className="mr-2 h-5 w-5" />
              <span className="text-base">Ver Detalhes</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleExcluirRotina(rotina)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-5 w-5" />
              <span className="text-base">Excluir</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p--0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4" disabled={isUpdatingStatus}><MoreVertical /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleVerDetalhes(rotina.id)}>
            <Eye className="mr-2 h-5 w-5" />
          <span className="text-base">Detalhes</span>
          </DropdownMenuItem>
        {rotina.status === 'Ativa' && modo === 'professor' && rotina.professor_id === user?.id && (
            <>
              <DropdownMenuItem onClick={() => handleTreinar(rotina.id)}>
                <Play className="mr-2 h-5 w-5" />
                <span className="text-base">Treinar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateRotinaStatus(rotina, 'Bloqueada')}>
                <Ban className="mr-2 h-5 w-5" />
                <span className="text-base">Bloquear</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExcluirRotina(rotina)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-5 w-5" />
                <span className="text-base">Excluir</span>
              </DropdownMenuItem>
            </>
          )}

          {rotina.status === 'Ativa' && modo === 'aluno' && (
            <DropdownMenuItem onClick={() => handleTreinar(rotina.id)}>
              <Play className="mr-2 h-5 w-5" />
              <span className="text-base">Treinar</span>
            </DropdownMenuItem>
          )}

          {(rotina.status === 'Ativa' || rotina.status === 'Bloqueada') && modo === 'aluno' && (
            <DropdownMenuItem
              onClick={() => handleExcluirRotina(rotina)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-5 w-5" /><span className="text-base">Excluir Rotina</span>
            </DropdownMenuItem>
          )}

        {rotina.status === 'Bloqueada' && modo === 'professor' && rotina.professor_id === user?.id && (
            <>
              <DropdownMenuItem onClick={() => handleUpdateRotinaStatus(rotina, 'Ativa')}>
                <Activity className="mr-2 h-5 w-5" />
                <span className="text-base">Reativar</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExcluirRotina(rotina)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-5 w-5" />
                <span className="text-base">Excluir</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const formatDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${horas}h`;
    } else {
      return `${horas}h ${mins}min`;
    }
  };

  if (loading || navegandoNovaRotina) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">
              {navegandoNovaRotina ? "Preparando editor..." : "Carregando rotinas..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
            onClick={() => navigate(modo === 'professor' ? '/alunos' : '/index-aluno')}
              className="h-10 w-10 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Rotinas</h1>
              <p className="text-muted-foreground">Rotinas de treino personalizadas</p>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Aluno não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-24 md:pb-8">
        {/* Cabeçalho da Página (Apenas para Desktop) */}
        {isDesktop && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {modo === 'professor' && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/alunos')}
                  className="h-10 w-10 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">Rotinas do Aluno</h1>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowStatusInfoDialog(true)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Informações sobre status das rotinas"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground">{modo === 'professor' ? `Gerencie as rotinas de ${aluno.nome_completo}` : 'Suas rotinas de treino'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Informações do Aluno */}
        {modo === 'professor' && <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                {renderAvatar()}
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{aluno.nome_completo}</h3>
                <p className="text-sm text-muted-foreground">{aluno.email}</p>
              </div>
            </div>
          </CardHeader>
        </Card>}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "atual" | "rascunho" | "encerradas")}>
          <TabsList className={`grid w-full ${modo === 'professor' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {modo === 'professor' && (
              <TabsTrigger 
                value="rascunho"
                onClick={() => console.log('📌 Clicou tab Rascunho')}
              >
                Rascunho ({rotinasRascunho.length})
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="atual"
              onClick={() => console.log('📌 Clicou tab Atual')}
            >
              Atual ({rotinasAtivas.length})
            </TabsTrigger>
            <TabsTrigger 
              value="encerradas"
              onClick={() => console.log('📌 Clicou tab Encerradas')}
            >
              Encerradas ({rotinasEncerradas.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab Atual */}
          <TabsContent value="atual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  Rotina Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rotinasAtivas.length === 0 ? (
                  <div className="text-center py-12">
                    <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma rotina</h3>
                    <p className="text-muted-foreground mb-6">
                      {modo === 'professor' ? 'Este aluno não possui nenhuma rotina no momento. Crie uma nova rotina personalizada.' : 'Você ainda não tem uma rotina. Fale com seu Professor.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rotinasAtivas.map((rotina) => (
                      <div key={rotina.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                        {/* Header da rotina */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold">{rotina.nome}</h4>
                            {/* Exibe o criador da rotina para ambos os modos */}
                            {rotina.professores && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 mb-2">
                                <User className="h-3 w-3" />
                                <span>
                                  {modo === 'professor' && rotina.professor_id === user?.id
                                    ? 'Criada por você'
                                    : `Criada por ${rotina.professores.nome_completo}`}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(rotina.status)}
                            </div>
                          </div>
                          
                          {/* Menu de ações adaptativo */}
                          {renderMenuOpcoes(rotina)}
                        </div>

                        {/* Informações principais */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          {/* Objetivo */}
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Objetivo</p>
                              <p className="font-medium capitalize">{rotina.objetivo}</p>
                            </div>
                          </div>
                          {/* Dificuldade */}
                          <div className="flex items-center gap-2">
                            <BicepsFlexed className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Dificuldade</p>
                              <p className="font-medium capitalize">{rotina.dificuldade}</p>
                            </div>
                          </div>
                          {/* Duração */}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Duração</p>
                              <p className="font-medium">{rotina.duracao_semanas} semanas</p>
                            </div>
                          </div>
                          {/* Frequência */}
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Frequência</p>
                              <p className="font-medium">{rotina.treinos_por_semana}x por semana</p>
                            </div>
                          </div>
                        </div>

                        {/* Descrição (se houver) */}
                        {rotina.descricao && (
                          <div className="pt-3 border-t">
                            <p className="text-sm text-muted-foreground mb-1">Descrição:</p>
                            <p className="text-sm">{rotina.descricao}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ✅ NOVA ABA: Rascunho */}
          {modo === 'professor' && (
            <TabsContent value="rascunho" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    Rotinas em Rascunho
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rotinasRascunho.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum rascunho</h3>
                      <p className="text-muted-foreground mb-6">
                        As rotinas que você começar a criar e salvar como rascunho aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rotinasRascunho.map((rotina) => (
                        <Card key={rotina.id}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{rotina.nome}</h4>
                              <p className="text-sm text-muted-foreground">
                                Criado em: {new Date(rotina.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4"><MoreVertical /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleContinuarRascunho(rotina.id)}>
                                  <Play className="mr-2 h-5 w-5" /><span className="text-base">Continuar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExcluirRotina(rotina)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-5 w-5" /><span className="text-base">Excluir</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tab Concluídas - Layout responsivo melhorado */}
          <TabsContent value="encerradas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  Rotinas Encerradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rotinasEncerradas.length === 0 ? (
                  <div className="text-center py-12">
                    <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma rotina encerrada</h3>
                    <p className="text-muted-foreground mb-6">
                      As rotinas concluídas ou canceladas aparecerão aqui como histórico.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rotinasEncerradas.map((rotina) => (
                      <div key={rotina.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                        {/* Header da rotina */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold">{rotina.nome}</h4>
                            {rotina.professores && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 mb-2">
                                <User className="h-3 w-3" />
                                <span>
                                  {modo === 'professor' && rotina.professor_id === user?.id
                                    ? 'Criada por você'
                                    : `Criada por ${rotina.professores.nome_completo}`}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(rotina.status)}
                            </div>
                          </div>
                          
                          {renderMenuOpcoes(rotina)}
                        </div>

                        {/* Informações principais */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          {/* Objetivo */}
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Objetivo</p>
                              <p className="font-medium capitalize">{rotina.objetivo}</p>
                            </div>
                          </div>
                          {/* Dificuldade */}
                          <div className="flex items-center gap-2">
                            <BicepsFlexed className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Dificuldade</p>
                              <p className="font-medium capitalize">{rotina.dificuldade}</p>
                            </div>
                          </div>
                          {/* Duração */}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Duração</p>
                              <p className="font-medium">{rotina.duracao_semanas} semanas</p>
                            </div>
                          </div>
                          {/* Frequência */}
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Frequência</p>
                              <p className="font-medium">{rotina.treinos_por_semana}x por semana</p>
                            </div>
                          </div>
                        </div>

                        {/* ✅ NOVO: Data de encerramento, igual ao RotinasPT.tsx */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Encerrada em:</span>
                            <span className="font-medium">{new Date(rotina.updated_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Modal
        isOpen={showConcluidaDialog}
        onRequestClose={() => setShowConcluidaDialog(false)}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className="bg-white rounded-lg max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Rotina Concluída
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowConcluidaDialog(false)} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            A rotina <strong>{selectedRotina?.nome}</strong> foi concluída com sucesso! Todos os treinos foram executados.
            <br /><br />
            Para visualizar o histórico completo e relatórios de progresso, consulte a aba "Encerradas" no menu principal.
          </p>
        </div>
      </Modal>

      {/* Modal de Informações sobre Status - Versão Responsiva */}
<ResponsiveModal
  open={showStatusInfoDialog}
  onOpenChange={setShowStatusInfoDialog}
  title="Situação das Rotinas"
>
  <div className="space-y-4 pt-2">
    <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0"></div>
        <div>
          <p className="font-medium text-gray-800 mb-1">Rascunho</p>
          <p className="text-sm text-muted-foreground">
            Rotina em processo de criação pelo professor, ainda não finalizada.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
        <div>
          <p className="font-medium text-green-800 mb-1">Ativa</p>
          <p className="text-sm text-muted-foreground">
            Aluno pode acessar e executar os treinos normalmente. A rotina é exibida na aba "Atual".
          </p>
        </div>
      </div>
      
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
        <div>
          <p className="font-medium text-red-800 mb-1">Bloqueada</p>
          <p className="text-sm text-muted-foreground">
            Acesso aos treinos foi suspenso temporariamente pelo professor. A rotina é exibida na aba "Atual".
          </p>
        </div>
      </div>
      
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
        <div>
          <p className="font-medium text-orange-800 mb-1">Cancelada</p>
          <p className="text-sm text-muted-foreground">
            Rotina interrompida por uma ação administrativa, como a exclusão da conta do Professor. A rotina é movida para a aba "Encerradas" como parte do histórico.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
        <div>
          <p className="font-medium text-blue-800 mb-1">Concluída</p>
          <p className="text-sm text-muted-foreground">
            Todas as sessões da rotina foram executadas. A rotina é movida para a aba "Encerradas" como parte do histórico.
          </p>
        </div>
      </div>
  </div>
</ResponsiveModal>

      <RotinaDetalhesModal
        rotina={selectedRotina}
        open={showDetalhesModal}
        onOpenChange={setShowDetalhesModal}
        ResponsiveModal={ResponsiveModal}
      />

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rotina?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a rotina "{selectedRotina?.nome}"?
              {modo === 'professor'
                ? ' Esta ação não pode ser desfeita e todos os dados associados serão removidos.'
                : ' Você não poderá mais acessar esta rotina.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelarExclusao} disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={modo === 'professor' ? handleConfirmarExclusao : handleAlunoExcluirRotina}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Botão Flutuante para Nova Rotina (Apenas para Professor) */}
      {modo === 'professor' && activeTab === 'atual' && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            onClick={handleNovaRotinaClick}
            disabled={navegandoNovaRotina}
            className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
            aria-label="Nova Rotina"
          >
            <Plus />
          </Button>
        </div>
      )}

      {/* Modal de Criação de Rotina */}
      <ResponsiveModal
        open={showCriarModal}
        onOpenChange={setShowCriarModal}
        title="Como criar a rotina"
      >
        <div className="space-y-4">
          <Button onClick={handleCriarDoZero} className="w-full" size="lg">
            Rotina em Branco
          </Button>
          {loadingModelos ? (
              <Button disabled className="w-full" size="lg">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando modelos...
              </Button>
          ) : temModelos ? (
              <Button onClick={handleUsarModelo} className="w-full" variant="outline" size="lg">
                  Usar um Modelo
              </Button>
          ) : (
            <div className="mt-6 pt-4 border-t border-dashed">
              <div className="flex items-start gap-3 text-sm">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground">
                    Dica: Agilize seu trabalho com Modelos de Rotina.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ResponsiveModal>
    </>
  );
};

export default PaginaRotinas;