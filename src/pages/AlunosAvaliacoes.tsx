import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from "@/hooks/use-media-query";
import { ArrowLeft, BarChart3, TrendingUp, Calendar, Plus, Eye, MoreVertical, Trash2, Info } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResponsiveAlertDialog } from '@/components/ui/responsive-alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
        .eq('id', avaliacaoParaExcluir.id)
        .eq('aluno_id', id); // Garante que apenas o PT do aluno pode excluir

      if (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível excluir a avaliação. Tente novamente.',
          variant: 'destructive',
        });
      } else {
        setAvaliacoes(prev => prev.filter(a => a.id !== avaliacaoParaExcluir.id));
        toast({
          title: 'Avaliação excluída',
          description: 'A avaliação foi removida com sucesso.',
        });
        setShowDeleteDialog(false);
        setAvaliacaoParaExcluir(null);
      }
    } catch (error) {
      console.error('Erro inesperado na exclusão da avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { toast } = useToast();
  
  // Estados principais
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFisica[]>([]);
  const [loading, setLoading] = useState(true);

  // useEffect principal para buscar dados
  useEffect(() => {
    const fetchDados = async () => {
      if (!id || !user) return;

      try {
        // Buscar informações do aluno
        const { data: alunoData, error: alunoError } = await supabase
          .from('alunos')
          .select('id, nome_completo, email, avatar_type, avatar_image_url, avatar_letter, avatar_color')
          .eq('id', id)
          .eq('personal_trainer_id', user.id)
          .single();

        if (alunoError) {
          console.error('Erro ao buscar aluno:', alunoError);
          toast({
            title: "Erro",
            description: "Aluno não encontrado.",
            variant: "destructive",
          });
          navigate('/alunos');
          return;
        }

        setAluno(alunoData);

        // Buscar avaliações físicas
        const { data: avaliacoesData, error: avaliacoesError } = await supabase
          .from('avaliacoes_fisicas')
          .select('*')
          .eq('aluno_id', id)
          .order('created_at', { ascending: false }); // Ordenar por created_at (mais recente primeiro)

        if (avaliacoesError) {
          console.error('Erro ao buscar avaliações:', avaliacoesError);
        } else {
          setAvaliacoes(avaliacoesData || []);
        }

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
  }, [id, user, navigate, toast]);

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
          <p className="text-lg text-muted-foreground">Carregando...</p>
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
    <div className="space-y-6 p-6">
      {/* Cabeçalho da Página (Apenas para Desktop) */}
      {isDesktop && (
        <div className="items-center justify-between">
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
                As avaliações físicas realizadas aparecerão aqui. Recomendamos um intervalo mínimo de 30 dias entre avaliações para resultados mais precisos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {avaliacoes.map((avaliacao) => {
                const imcClass = getIMCClassification(avaliacao.imc);
                return (
                  <div key={avaliacao.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{avaliacao.data_avaliacao.split('-').reverse().join('/')}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleVerDetalhes(avaliacao.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExcluirAvaliacao(avaliacao)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      {/* Medidas removidas */}
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

      {/* Modal de Confirmação de Exclusão */}
      <ResponsiveAlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Excluir Avaliação"
        description={
          <>
            Tem certeza que deseja excluir a avaliação de <strong>{avaliacaoParaExcluir ? avaliacaoParaExcluir.data_avaliacao.split('-').reverse().join('/') : ''}</strong>? 
            Esta ação não pode ser desfeita.
          </>
        }
      >
        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
        <Button onClick={handleConfirmarExclusao} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
          {isDeleting ? 'Excluindo...' : 'Excluir'}
        </Button>
      </ResponsiveAlertDialog>

      {/* Modal de Aviso de Intervalo */}
      <ResponsiveAlertDialog
        open={showIntervalWarning}
        onOpenChange={setShowIntervalWarning}
        title="Intervalo entre avaliações"
        description={
          <>
            A última avaliação foi realizada há apenas {intervalDays} dia(s). O ideal é aguardar pelo menos 30 dias para obter uma comparação de resultados mais precisa.
            <br/><br/>
            Deseja criar uma nova avaliação mesmo assim?
          </>
        }
      >
        <Button variant="outline" onClick={() => setShowIntervalWarning(false)}>Cancelar</Button>
        <Button onClick={() => {
          setShowIntervalWarning(false);
          navigate(`/alunos-avaliacoes/${id}/nova`);
        }}>
          Criar mesmo assim
        </Button>
      </ResponsiveAlertDialog>

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