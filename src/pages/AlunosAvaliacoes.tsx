import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge'; 
import { useMediaQuery } from '@/hooks/use-media-query';
import { ArrowLeft, BarChart3, TrendingUp, Calendar, Plus, Eye, MoreVertical, Trash2, AlertTriangle, Info, ChevronDown, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatters } from '@/utils/formatters';

interface AlunoInfo {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
}

interface AvaliacaoFisica {
  id: string;
  data_avaliacao: string;
  peso: number;
  altura: number;
  imc: number;
  peito_busto?: number;
  cintura?: number;
  quadril?: number;
  coxa_direita?: number;
  coxa_esquerda?: number;
  braco_direito?: number;
  braco_esquerdo?: number;
  antebraco_direito?: number;
  antebraco_esquerdo?: number;
  panturrilha_direita?: number;
  panturrilha_esquerda?: number;
  observacoes?: string;
  foto_frente_url?: string;
  foto_lado_url?: string;
  foto_costas_url?: string;
  professor_id?: string;
  professores: {
    id: string;
    nome_completo: string;
  } | null;
}

const AlunosAvaliacoes = () => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState<AvaliacaoFisica | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para o modal de aviso de intervalo
  const [showIntervalWarning, setShowIntervalWarning] = useState(false);
  const [intervalDays, setIntervalDays] = useState(0);

  const handleExcluirAvaliacao = (avaliacao: AvaliacaoFisica) => {
    setAvaliacaoParaExcluir(avaliacao);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!avaliacaoParaExcluir) return;

    // Adicionando verificação de permissão no frontend
    if (avaliacaoParaExcluir.professor_id !== user?.id) {
      toast.error("Permissão negada", {
        description: "Você só pode excluir avaliações que você mesmo criou.",
      });
      setShowDeleteDialog(false);
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Buscar URLs das imagens antes de excluir o registro
      const { data: avaliacaoData, error: fetchError } = await supabase
        .from('avaliacoes_fisicas')
        .select('foto_frente_url, foto_lado_url, foto_costas_url')
        .eq('id', avaliacaoParaExcluir.id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar avaliação para exclusão de imagens:', fetchError);
        // Não impede a exclusão do registro, mas loga o erro
      }

      // 2. Deletar imagens do Cloudflare, se existirem
      const deletePromises = [];
      const filesToDelete = [];

      if (avaliacaoData?.foto_frente_url) filesToDelete.push(avaliacaoData.foto_frente_url);
      if (avaliacaoData?.foto_lado_url) filesToDelete.push(avaliacaoData.foto_lado_url);
      if (avaliacaoData?.foto_costas_url) filesToDelete.push(avaliacaoData.foto_costas_url);

      for (const fileUrl of filesToDelete) {
        const filename = fileUrl.split('?')[0].split('/').pop();
        if (filename) {
          deletePromises.push(
            supabase.functions.invoke('delete-media', {
              body: {
                filename,
                bucket_type: 'avaliacoes' // Especifica o bucket correto
              }
            }).then(({ data, error }) => {
              if (error) {
                console.error(`Erro ao deletar imagem ${filename} do Cloudflare:`, error);
              } else if (data && data.success) {
                console.log(`Imagem ${filename} deletada do Cloudflare com sucesso.`);
              } else {
                console.warn(`Falha ao deletar imagem ${filename} do Cloudflare:`, data);
              }
            }).catch(err => {
              console.error(`Erro inesperado ao chamar Edge Function para ${filename}:`, err);
            })
          );
        }
      }
      
      await Promise.all(deletePromises); // Espera todas as deleções de imagem

      // 3. Excluir registro do banco de dados
      const { error } = await supabase
        .from('avaliacoes_fisicas')
        .delete()
        .eq('id', avaliacaoParaExcluir.id);
        // A segurança de quem pode excluir é garantida pela RLS no Supabase
        // que deve verificar se o `professor_id` da avaliação é o mesmo do `auth.uid()`

      if (error) {
        toast.error('Erro', {
          description: 'Não foi possível excluir a avaliação. Tente novamente.',
        });
      } else {
        setAvaliacoes(prev => prev.filter(a => a.id !== avaliacaoParaExcluir.id));
        toast.success('Avaliação excluída', {
          description: 'A avaliação foi removida com sucesso.',
        });
        setShowDeleteDialog(false);
        setAvaliacaoParaExcluir(null);
      }
    } catch (error) {
      console.error('Erro inesperado na exclusão da avaliação:', error);
      toast.error('Erro', {
        description: 'Ocorreu um erro inesperado. Tente novamente.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelarExclusao = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
    setAvaliacaoParaExcluir(null);
  };

  const handleCancelarIntervalo = () => {
    setShowIntervalWarning(false);
  };

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // Estados principais
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFisica[]>([]);
  const [loading, setLoading] = useState(true);

  // useEffect principal para buscar dados
  useEffect(() => {
    const fetchDados = async () => {
      if (!id || !user) return;

      try {
        // MUDANÇA: Verificar se o professor tem permissão para ver este aluno (se o aluno o segue)
        const { data: relacao, error: relacaoError } = await supabase.from('alunos_professores').select('aluno_id').eq('aluno_id', id).eq('professor_id', user.id).single();

        if (relacaoError || !relacao) throw new Error("Você não tem permissão para ver este aluno.");

        // Buscar informações do aluno
        const { data: alunoData, error: alunoError } = await supabase
          .from('alunos')
          .select('id, nome_completo, email, avatar_type, avatar_image_url, avatar_letter, avatar_color')
          .eq('id', id)
          .single();

        if (alunoError) {
          console.error('Erro ao buscar aluno:', alunoError);
          toast.error("Erro", {
            description: "Aluno não encontrado."
          });
          navigate('/alunos');
          return;
        }

        setAluno(alunoData);

        // Buscar avaliações físicas
        const { data: avaliacoesData, error: avaliacoesError } = await supabase
          .from('avaliacoes_fisicas')
          .select('*, professores(id, nome_completo)')
          .eq('aluno_id', id)
          .order('created_at', { ascending: false }); // Ordenar por created_at (mais recente primeiro)

        if (avaliacoesError) {
          console.error('Erro ao buscar avaliações:', avaliacoesError);
        } else {
          setAvaliacoes((avaliacoesData as unknown as AvaliacaoFisica[]) || []);
        }

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast.error("Erro", {
          description: "Erro ao carregar dados do aluno."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDados();  }, [id, user, navigate]);

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

  const getIMCClassification = (imc: number) => {
    if (imc < 18.5) return { text: 'Abaixo do peso', color: 'bg-blue-500' };
    if (imc < 25) return { text: 'Normal', color: 'bg-green-500' };
    if (imc < 30) return { text: 'Sobrepeso', color: 'bg-yellow-500' };
    return { text: 'Obesidade', color: 'bg-red-500' };
  };

  const calcularProgressoPeso = () => {
    if (avaliacoes.length < 2) return null;
    
    const primeira = avaliacoes[avaliacoes.length - 1];
    const ultima = avaliacoes[0];
    const diferenca = ultima.peso - primeira.peso;
    
    return {
      diferenca,
      percentual: ((diferenca / primeira.peso) * 100).toFixed(1)
    };
  };

  const progressoPeso = calcularProgressoPeso();

  const handleNovaAvaliacao = () => {
    // Se existem avaliações, verificar o intervalo
    if (avaliacoes && avaliacoes.length > 0) {
      const ultimaAvaliacaoData = avaliacoes[0].data_avaliacao; // Formato "YYYY-MM-DD"
      
      // Lógica de data robusta para evitar bugs de fuso horário
      const [year, month, day] = ultimaAvaliacaoData.split('-').map(Number);
      // new Date(year, month-1, day) cria a data à meia-noite no fuso horário LOCAL
      const ultimaAvaliacao = new Date(year, month - 1, day);
      
      const hoje = new Date();
      // Zera a hora para comparar apenas os dias
      hoje.setHours(0, 0, 0, 0);

      const diffTime = hoje.getTime() - ultimaAvaliacao.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30) {
        setIntervalDays(diffDays);
        setShowIntervalWarning(true);
      } else {
        navigate(`/alunos-avaliacoes/${id}/nova`);
      }
    } else {
      // Se não houver nenhuma avaliação, navega direto
      navigate(`/alunos-avaliacoes/${id}/nova`);
    }
  };

  const handleVerDetalhes = (avaliacaoId: string) => {
    navigate(`/alunos-avaliacoes/${id}/${avaliacaoId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando avaliações...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Aluno não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página (Apenas para Desktop) */}
      {isDesktop && (
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/alunos')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Avaliações do Aluno</h1>
            <p className="text-muted-foreground">Histórico de avaliações físicas e evolução</p>
          </div>
        </div>
      )}
      {/* Informações do Aluno */}
      <Card>
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
      </Card>

      {/* Resumo de Progresso */}
      {progressoPeso && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5" />
              Evolução de Peso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {progressoPeso.diferenca > 0 ? '+' : ''}{progressoPeso.diferenca.toFixed(1)} kg
                </p>
                <p className="text-sm text-muted-foreground">
                  {progressoPeso.percentual}% de variação
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Primeira avaliação: {avaliacoes[avaliacoes.length - 1]?.peso}kg</p>
                <p>Última avaliação: {avaliacoes[0]?.peso}kg</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5" />
            Histórico de Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {avaliacoes.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação</h3>
              <p className="text-muted-foreground mb-4">
                Recomendamos um intervalo mínimo de 30 dias entre avaliações para resultados mais precisos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {avaliacoes.map((avaliacao) => {
                const imcClass = getIMCClassification(avaliacao.imc);
                return (
                  <div key={avaliacao.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      {avaliacao.professores ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          <span>
                            Realizada por {user?.id === avaliacao.professor_id ? 'você' : avaliacao.professores.nome_completo}
                          </span>
                        </div>
                      ) : <div />} {/* Empty div to keep alignment */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          {isDesktop ? (
                            <Button variant="outline" size="sm" className="ml-auto">
                              Ações <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="default" className="h-10 w-10 rounded-full p-0 flex-shrink-0 [&_svg]:size-6">
                              <MoreVertical />
                            </Button>
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleVerDetalhes(avaliacao.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleExcluirAvaliacao(avaliacao)} 
                            className="text-destructive focus:text-destructive"
                            disabled={user?.id !== avaliacao.professor_id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Data</p>
                        <p className="font-semibold">{avaliacao.data_avaliacao.split('-').reverse().join('/')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Peso</p>
                        <p className="font-semibold">{avaliacao.peso} kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Altura</p>
                        <p className="font-semibold">{avaliacao.altura} cm</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">IMC</p>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{avaliacao.imc.toFixed(1)}</span>
                          <Badge className={`${imcClass.color} text-white text-xs`}>
                            {imcClass.text}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Fotos disponíveis removidas */}

                    {/* Observações preview */}
                    {avaliacao.observacoes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Observações:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {avaliacao.observacoes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Exclusão - React Modal BLOQUEADA */}
      <Modal
        isOpen={showDeleteDialog}
        onRequestClose={() => {}} // Não permite fechar
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Excluir Avaliação</h2>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Tem certeza que deseja excluir a avaliação de{" "}
            <span className="font-semibold text-gray-900">
              {avaliacaoParaExcluir ? avaliacaoParaExcluir.data_avaliacao.split('-').reverse().join('/') : ''}
            </span>?
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Esta ação não pode ser desfeita.
          </p>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={handleCancelarExclusao}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirmarExclusao} 
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Excluir
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* Modal de Aviso de Intervalo - React Modal */}
      <Modal
        isOpen={showIntervalWarning}
        onRequestClose={() => {}} // Bloqueada também
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Intervalo entre avaliações</h2>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            A última avaliação foi realizada há apenas {intervalDays} dia(s). O ideal é aguardar pelo menos 30 dias para obter uma comparação de resultados mais precisa.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Deseja criar uma nova avaliação mesmo assim?
          </p>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={handleCancelarIntervalo}
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              setShowIntervalWarning(false);
              navigate(`/alunos-avaliacoes/${id}/nova`);
            }}
          >
            Criar mesmo assim
          </Button>
        </div>
      </Modal>

      {/* Botão Flutuante para Nova Avaliação */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        {/* Mobile: Round floating button */}
        <Button
          onClick={handleNovaAvaliacao}
          className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
          aria-label="Nova Avaliação"
        >
          <Plus />
        </Button>

        {/* Desktop: Standard floating button */}
        <Button
          onClick={handleNovaAvaliacao}
          className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
          size="lg"
        >
          <Plus />
          Nova Avaliação
        </Button>
      </div>
    </div>
  );
};

export default AlunosAvaliacoes;