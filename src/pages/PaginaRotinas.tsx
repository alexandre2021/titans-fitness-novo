import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Download,
  X
} from 'lucide-react';
import { BicepsFlexed } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExercicioLookup } from '@/hooks/useExercicioLookup';
import { useToast } from '@/hooks/use-toast';
import RotinaDetalhesModal from '@/components/rotina/RotinaDetalhesModal';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ExercicioRotina, Serie } from '@/types/rotina.types';

// Componente responsivo que escolhe entre Modal e Drawer
interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

const ResponsiveModal = ({ open, onOpenChange, title, children }: ResponsiveModalProps) => {
  const isMobile = !useMediaQuery("(min-width: 768px)");

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full flex-shrink-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>
          <div className="px-4 pb-4 overflow-y-auto flex-1">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
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
}

interface RotinaArquivada {
  id: string;
  aluno_id: string;
  nome_rotina: string;
  objetivo: string;
  treinos_por_semana: number;
  duracao_semanas: number;
  data_inicio: string;
  data_conclusao: string;
  sessoes_executadas: number;
  tempo_total_minutos: number;
  pdf_url: string;
  created_at: string;
}

interface PaginaRotinasProps {
  modo: 'personal' | 'aluno';
}

const PaginaRotinas = ({ modo }: PaginaRotinasProps) => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getExercicioInfo } = useExercicioLookup();
  const { toast } = useToast();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // Deriva o alunoId do contexto de rota (para PT) ou de autenticação (para Aluno)
  // O 'id' do useParams corresponde ao :id na rota /alunos-rotinas/:id
  const alunoId = modo === 'personal' ? params.id : user?.id;

  // Estados permanecem os mesmos
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [rotinasAtivas, setRotinasAtivas] = useState<Rotina[]>([]);
  const [rotinasArquivadas, setRotinasArquivadas] = useState<RotinaArquivada[]>([]);
  const [rotinasRascunho, setRotinasRascunho] = useState<Rotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"atual" | "rascunho" | "encerradas">("atual");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConcluidaDialog, setShowConcluidaDialog] = useState(false);
  const [showStatusInfoDialog, setShowStatusInfoDialog] = useState(false);
  const [selectedRotina, setSelectedRotina] = useState<Rotina | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [navegandoNovaRotina, setNavegandoNovaRotina] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);

  const handleNovaRotina = () => { // ✅ REGRA ATUALIZADA
    if (rotinasRascunho.length > 0) {
      toast({
        title: "Já existe um rascunho",
        description: "Finalize ou descarte o rascunho atual antes de criar uma nova rotina.",
        variant: "destructive",
      });
      return;
    }
    setNavegandoNovaRotina(true);
    navigate(`/rotinas-criar/${alunoId}/configuracao`);
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

      const exerciciosPorTreino: { [treinoId: string]: (ExercicioRotina & { series: Serie[] })[] } = {};
      for (const treino of treinos) {
        const { data: exercicios, error: exerciciosError } = await supabase.from('exercicios_rotina').select('*, series(*)').eq('treino_id', treino.id).order('ordem');
        if (exerciciosError) throw exerciciosError;
        exerciciosPorTreino[treino.id] = exercicios;
      }

      // 2. Montar o objeto para o sessionStorage
      const rotinaStorageData = {
        alunoId: alunoId!,
        draftId: rotina.id,
        configuracao: { ...rotina, valor_total: rotina.valor_total ?? 0 },
        treinos: treinos.map(t => ({ ...t, grupos_musculares: t.grupos_musculares.split(',') })),
        exercicios: exerciciosPorTreino,
        etapaAtual: 'revisao', // Leva para a última etapa para continuar
      };

      // 3. Salvar no sessionStorage e navegar
      sessionStorage.setItem('rotina_em_criacao', JSON.stringify(rotinaStorageData));
      
      toast({
        title: "Rascunho carregado",
        description: "Continue de onde parou.",
      });
      navigate(`/rotinas-criar/${alunoId}/configuracao`);

    } catch (error) {
      console.error("Erro ao carregar rascunho:", error);
      toast({
        title: "Erro ao carregar rascunho",
        variant: "destructive",
      });
      setNavegandoNovaRotina(false);
    }
  };

  useEffect(() => {
    const fetchDados = async () => {
      if (!alunoId || !user) return;

      try {
        // Otimização: Buscar todos os dados em paralelo
        const [alunoResult, rotinasResult, arquivadasResult] = await Promise.all([
          supabase.from('alunos').select('id, nome_completo, email, avatar_type, avatar_image_url, avatar_letter, avatar_color').eq('id', alunoId).single(),
          supabase.from('rotinas').select('*').eq('aluno_id', alunoId).order('created_at', { ascending: false }),
          supabase.from('rotinas_arquivadas').select('*').eq('aluno_id', alunoId).order('created_at', { ascending: false })
        ]);

        // Checar erros e tratar
        if (alunoResult.error) {
          console.error('Erro ao buscar aluno:', alunoResult.error);
          toast({
            title: "Erro",
            description: "Aluno não encontrado.",
            variant: "destructive",
          });
          navigate('/alunos');
          return;
        }

        setAluno(alunoResult.data);
        
        // ✅ Separar rotinas por status
        setRotinasAtivas((rotinasResult.data || []).filter(r => r.status === 'Ativa' || r.status === 'Bloqueada' || r.status === 'Cancelada'));
        setRotinasRascunho((rotinasResult.data || []).filter(r => r.status === 'Rascunho'));
        setRotinasArquivadas((arquivadasResult.data as RotinaArquivada[]) || []);

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do aluno.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [alunoId, user, navigate, toast, modo]);

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
      'Rascunho': 'bg-blue-100 text-blue-800',
      'Bloqueada': 'bg-red-100 text-red-800',      
      'Concluída': 'bg-gray-100 text-gray-800',
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
    const rotinaSelecionada = rotinasAtivas.find(r => r.id === rotinaId);
    setSelectedRotina(rotinaSelecionada || null);
    if (modo === 'personal') {
      // Para o PT, "Detalhes" leva à página de gerenciamento da rotina.
      navigate(`/alunos-rotinas/${alunoId}/${rotinaId}`);
    } else {
      setShowDetalhesModal(true);
    }
  };

  const handleTreinar = (rotinaId: string) => {
    // Passa o modo atual para a próxima página, para que ela saiba como buscar os dados.
    navigate(`/execucao-rotina/selecionar-treino/${rotinaId}`, {
      state: { modo: modo }
    });
  };

  const handleVisualizarPDF = async (pdfUrl: string, nomeRotina: string) => {
    try {
      // Extrair filename do URL
      const urlParts = pdfUrl.split('/');
      const filename = urlParts[urlParts.length - 1];

      // Obter URL assinada do Cloudflare
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/get-image-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          filename,
          bucket_type: 'rotinas'
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar URL do PDF');
      }

      const { url: signedUrl } = await response.json();
      
      // Abrir PDF em nova aba
      window.open(signedUrl, '_blank');

    } catch (error) {
      console.error('Erro ao visualizar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o PDF da rotina.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRotinaStatus = async (rotina: Rotina, novoStatus: 'Ativa' | 'Bloqueada') => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('rotinas')
        .update({ status: novoStatus })
        .eq('id', rotina.id)
        .eq('personal_trainer_id', user?.id);
  
      if (error) {
        console.error(`Erro ao alterar status para ${novoStatus}:`, error);
        toast({
          title: "Erro",
          description: `Não foi possível alterar o status da rotina. Tente novamente.`,
          variant: "destructive",
        });
      } else {
        // Atualizar lista local
        setRotinasAtivas(prev => prev.map(r => 
          r.id === rotina.id ? { ...r, status: novoStatus } : r
        ));
        
        toast({
          title: `Rotina ${novoStatus === 'Ativa' ? 'Ativada' : 'Bloqueada'}`,
          description: `O status da rotina foi atualizado.`,
        });
      }
    } catch (error) {
      console.error(`Erro inesperado ao alterar status para ${novoStatus}:`, error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExcluirRotina = (rotina: Rotina) => {
    setSelectedRotina(rotina);
    setShowDeleteDialog(true);
  };

  const handleConcluidaClick = (rotina: Rotina) => {
    setSelectedRotina(rotina);
    setShowConcluidaDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!selectedRotina) return;

    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('rotinas')
        .delete()
        .eq('id', selectedRotina.id)
        .eq('personal_trainer_id', user?.id);

      if (error) {
        console.error('Erro ao excluir rotina:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a rotina. Tente novamente.",
          variant: "destructive",
        });
      } else {
        // ✅ CORREÇÃO: Remover da lista local correta (Ativas ou Rascunhos)
        if (selectedRotina.status === 'Rascunho') {
          setRotinasRascunho(prev => prev.filter(r => r.id !== selectedRotina.id));
        } else {
          setRotinasAtivas(prev => prev.filter(r => r.id !== selectedRotina.id));
        }
        
        toast({
          title: "Rotina excluída",
          description: "A rotina foi removida com sucesso.",
        });
        
        setShowDeleteDialog(false);
        setSelectedRotina(null);
      }
    } catch (error) {
      console.error('Erro ao excluir rotina:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderMenuOpcoes = (rotina: Rotina) => {
    if (rotina.status === 'Concluída') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleConcluidaClick(rotina)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver Informações
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    if (rotina.status === 'Cancelada') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled>
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>Rotina Cancelada</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isUpdatingStatus}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleVerDetalhes(rotina.id)}>
            <Eye className="mr-2 h-4 w-4" />
            Detalhes
          </DropdownMenuItem>
          {rotina.status === 'Ativa' && modo === 'personal' && (
            <>
              <DropdownMenuItem onClick={() => handleTreinar(rotina.id)}>
                <Play className="mr-2 h-4 w-4" />
                Treinar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateRotinaStatus(rotina, 'Bloqueada')}>
                <Ban className="mr-2 h-4 w-4" />
                Bloquear
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExcluirRotina(rotina)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </>
          )}

          {rotina.status === 'Ativa' && modo === 'aluno' && (
            <DropdownMenuItem onClick={() => handleTreinar(rotina.id)}>
              <Play className="mr-2 h-4 w-4" />
              Treinar
            </DropdownMenuItem>
          )}

          {rotina.status === 'Bloqueada' && modo === 'aluno' && (
            <DropdownMenuItem disabled>Rotina Bloqueada</DropdownMenuItem>
          )}
          {rotina.status === 'Bloqueada' && modo === 'personal' && (
            <>
              <DropdownMenuItem onClick={() => handleUpdateRotinaStatus(rotina, 'Ativa')}>
                <Activity className="mr-2 h-4 w-4" />
                Reativar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExcluirRotina(rotina)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-lg text-muted-foreground">Carregando...</p>
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
              onClick={() => navigate(modo === 'personal' ? '/alunos' : '/index-aluno')}
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
      <div className="space-y-6 p-6">
        {/* Cabeçalho da Página (Apenas para Desktop) */}
        {isDesktop && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(modo === 'personal' ? '/alunos' : '/index-aluno')}
                className="h-10 w-10 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Rotinas</h1>
                <p className="text-muted-foreground">{modo === 'personal' ? `Gerencie as rotinas de ${aluno.nome_completo}` : 'Suas rotinas de treino'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Informações do Aluno */}
        {modo === 'personal' && <Card>
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
          <TabsList className={`grid w-full ${modo === 'personal' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="atual">
              Atual ({rotinasAtivas.length})
            </TabsTrigger>
            {modo === 'personal' && (
              <TabsTrigger value="rascunho">
                Rascunho ({rotinasRascunho.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="encerradas">
              Encerradas ({rotinasArquivadas.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab Atual */}
          <TabsContent value="atual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Dumbbell className="h-5 w-5" />
                  Rotina Atual
                  {modo === 'personal' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowStatusInfoDialog(true)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      title="Informações sobre status das rotinas"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rotinasAtivas.length === 0 ? (
                  <div className="text-center py-12">
                    <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma rotina</h3>
                    <p className="text-muted-foreground mb-6">
                      {modo === 'personal' ? 'Este aluno não possui nenhuma rotina no momento. Crie uma nova rotina personalizada.' : 'Você ainda não tem uma rotina. Fale com seu Personal Trainer.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rotinasAtivas.map((rotina) => (
                      <div key={rotina.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                        {/* Header da rotina */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold mb-2">{rotina.nome}</h4>
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
          {modo === 'personal' && (
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
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleContinuarRascunho(rotina.id)}><Play className="mr-2 h-4 w-4" /><span>Continuar</span></DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExcluirRotina(rotina)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Excluir</span></DropdownMenuItem>
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
                  <Dumbbell className="h-5 w-5" />
                  Rotinas Encerradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rotinasArquivadas.length === 0 ? (
                  <div className="text-center py-12">
                    <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma rotina encerrada</h3>
                    <p className="text-muted-foreground mb-6">
                      As rotinas concluídas aparecerão aqui com relatórios em PDF disponíveis para download.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rotinasArquivadas.map((rotina) => (
                      <div key={rotina.id} className="border rounded-lg p-4 md:p-6 hover:bg-muted/50 transition-colors">
                        {/* Header da rotina com título e badge de conclusão */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold mb-2">{rotina.nome_rotina}</h4>
                            <div className="flex items-center gap-2">
                              {getObjetivoBadge(rotina.objetivo)}
                            </div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                        </div>

                        {/* ✅ INFORMAÇÕES RESPONSIVAS - Desktop: 3 colunas, Mobile: 3 linhas */}
                        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-4 text-sm mb-4">
                          {/* Duração */}
                          <div className="flex items-center gap-2 md:justify-center">
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">Duração:</span>
                            <span className="font-medium">{rotina.duracao_semanas} semanas</span>
                          </div>
                          
                          {/* Frequência */}
                          <div className="flex items-center gap-2 md:justify-center">
                            <Dumbbell className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">Frequência:</span>
                            <span className="font-medium">{rotina.treinos_por_semana}x/semana</span>
                          </div>
                          
                          {/* Conclusão */}
                          <div className="flex items-center gap-2 md:justify-center">
                            <CalendarCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">Conclusão:</span>
                            <span className="font-medium">
                              {new Date(rotina.data_conclusao).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        {/* Botão Ver Relatório PDF */}
                        <Button
                          onClick={() => handleVisualizarPDF(rotina.pdf_url, rotina.nome_rotina)}
                          className="w-full mt-4"
                          variant="outline"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Detalhes (PDF)
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Confirmação de Exclusão - Versão Responsiva */}
<ResponsiveModal
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  title="Excluir Rotina"
>
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Tem certeza que deseja excluir a rotina <strong>{selectedRotina?.nome}</strong>? 
      Esta ação não pode ser desfeita e todos os treinos e exercícios da rotina serão removidos.
    </p>
    
    <div className="flex justify-end space-x-2 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowDeleteDialog(false)}
      >
        Cancelar
      </Button>
      <Button
        onClick={handleConfirmarExclusao}
        disabled={isDeleting}
        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
      >
        {isDeleting ? "Excluindo..." : "Excluir"}
      </Button>
    </div>
  </div>
</ResponsiveModal>

      {/* Modal para Rotina Concluída */}
      <Dialog open={showConcluidaDialog} onOpenChange={setShowConcluidaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Rotina Concluída
            </DialogTitle>
            <DialogDescription className="pt-4">
              A rotina <strong>{selectedRotina?.nome}</strong> foi concluída com sucesso! 
              Todos os treinos foram executados.
              <br /><br />
              Para visualizar o histórico completo e relatórios de progresso, 
              consulte a aba "Concluídas" no menu principal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowConcluidaDialog(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Informações sobre Status - Versão Responsiva */}
<ResponsiveModal
  open={showStatusInfoDialog}
  onOpenChange={setShowStatusInfoDialog}
  title="Status das Rotinas"
>
  <div className="space-y-1 mb-4">
    <p className="text-sm text-muted-foreground">
      Entenda o significado de cada status das rotinas de treino.
    </p>
  </div>
  
  <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
      <div>
        <p className="font-medium text-blue-800 mb-1">Rascunho</p>
        <p className="text-sm text-muted-foreground">
          Rotina em processo de criação pelo personal trainer, ainda não finalizada.
        </p>
      </div>
    </div>

  <div className="space-y-4">
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
      <div>
        <p className="font-medium text-green-800 mb-1">Ativa</p>
        <p className="text-sm text-muted-foreground">
          Aluno pode acessar e executar os treinos normalmente.
        </p>
      </div>
    </div>
    
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
      <div>
        <p className="font-medium text-red-800 mb-1">Bloqueada</p>
        <p className="text-sm text-muted-foreground">
          Acesso aos treinos foi suspenso temporariamente pelo personal trainer.
        </p>
      </div>
    </div>
    
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
      <div>
        <p className="font-medium text-orange-800 mb-1">Cancelada</p>
        <p className="text-sm text-muted-foreground">
          Rotina interrompida por uma ação administrativa, como a exclusão da conta do Personal Trainer.
        </p>
      </div>
    </div>

    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0"></div>
      <div>
        <p className="font-medium text-gray-800 mb-1">Concluída</p>
        <p className="text-sm text-muted-foreground">
          Todas as sessões da rotina foram executadas. Rotina finalizada automaticamente.
        </p>
      </div>
    </div>
  </div>
  
  <div className="flex justify-end pt-4 border-t mt-6">
    <Button onClick={() => setShowStatusInfoDialog(false)}>
      Entendi
    </Button>
  </div>
</ResponsiveModal>

      <RotinaDetalhesModal
        rotina={selectedRotina}
        open={showDetalhesModal}
        onOpenChange={setShowDetalhesModal}
        ResponsiveModal={ResponsiveModal}
      />

      {/* Botão Flutuante para Nova Rotina (Apenas para Personal) */}
      {modo === 'personal' && activeTab === 'atual' && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          {/* Mobile: Round floating button */}
          <Button
            onClick={handleNovaRotina}
            disabled={navegandoNovaRotina}
            className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
            aria-label="Nova Rotina"
          >
            <Plus />
          </Button>

          {/* Desktop: Standard floating button */}
          <Button
            onClick={handleNovaRotina}
            disabled={navegandoNovaRotina}
            className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
            size="lg"
          >
            <Plus />
            {navegandoNovaRotina ? "Navegando..." : "Nova Rotina"}
          </Button>
        </div>
      )}
    </>
  );
};

export default PaginaRotinas;