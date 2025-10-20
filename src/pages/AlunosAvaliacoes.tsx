import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Modal from 'react-modal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ArrowLeft, BarChart3, TrendingUp, Calendar, Plus, Eye, MoreVertical, Trash2, AlertTriangle, Info, User, LineChart as LineChartIcon, Camera } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatters } from '@/utils/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type ActiveLinesState = {
  pesoImc: string[];
  tronco: string[];
  superiores: string[];
  inferiores: string[];
};

const lineOptions = {
  pesoImc: [{ dataKey: 'peso', name: 'Peso (kg)', color: '#8884d8' }, { dataKey: 'imc', name: 'IMC', color: '#82ca9d' }],
  tronco: [{ dataKey: 'peito', name: 'Peito', color: '#8884d8' }, { dataKey: 'cintura', name: 'Cintura', color: '#82ca9d' }, { dataKey: 'quadril', name: 'Quadril', color: '#ffc658' }],
  superiores: [{ dataKey: 'braco_d', name: 'Braço D.', color: '#8884d8' }, { dataKey: 'braco_e', name: 'Braço E.', color: '#82ca9d' }, { dataKey: 'antebraco_d', name: 'Antebraço D.', color: '#ffc658' }, { dataKey: 'antebraco_e', name: 'Antebraço E.', color: '#ff7300' }],
  inferiores: [{ dataKey: 'coxa_d', name: 'Coxa D.', color: '#8884d8' }, { dataKey: 'coxa_e', name: 'Coxa E.', color: '#82ca9d' }, { dataKey: 'panturrilha_d', name: 'Panturrilha D.', color: '#ffc658' }, { dataKey: 'panturrilha_e', name: 'Panturrilha E.', color: '#ff7300' }],
};

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
        console.error('Erro ao excluir avaliação:', error);
        toast.error('Erro', {
          description: 'Não foi possível excluir a avaliação. Tente novamente.',
        });
      } else {
        setAvaliacoes(prev => prev.filter(a => a.id !== avaliacaoParaExcluir.id));
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
  const location = useLocation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // Estados principais
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFisica[]>([]);
  const [historicoPeriodo, setHistoricoPeriodo] = useState<string>('1ano');
  const [loading, setLoading] = useState(true);

  // ✅ NOVO: Estado para o filtro de data inicial
  const [startDateIndex, setStartDateIndex] = useState(0);
  
  // ✅ NOVO: Estados para a aba de comparação de imagens
  const [avaliacaoInicialImagem, setAvaliacaoInicialImagem] = useState<AvaliacaoFisica | null>(null);
  const [urlsAssinadas, setUrlsAssinadas] = useState<{
    inicial: { frente?: string; lado?: string; costas?: string };
    final: { frente?: string; lado?: string; costas?: string };
  }>({
    inicial: {},
    final: {},
  });

  // ✅ NOVO: Estado para controlar as linhas visíveis nos gráficos
  const [activeLines, setActiveLines] = useState<ActiveLinesState>({
    pesoImc: ['peso', 'imc'],
    tronco: ['peito', 'cintura', 'quadril'],
    superiores: ['braco_d', 'braco_e', 'antebraco_d', 'antebraco_e'],
    inferiores: ['coxa_d', 'coxa_e', 'panturrilha_d', 'panturrilha_e'],
  });

  // ✅ NOVO: Função para alternar a visibilidade de uma linha
  const toggleLine = (chart: keyof ActiveLinesState, dataKey: string) => {
    setActiveLines(prev => {
      const currentLines = prev[chart];
      const newLines = currentLines.includes(dataKey) ? currentLines.filter(line => line !== dataKey) : [...currentLines, dataKey];
      return { ...prev, [chart]: newLines };
    });
  };

  // ✅ CORREÇÃO: Memoiza a criação de chartData para evitar recálculos desnecessários
  const chartData = useMemo(() => {
    return avaliacoes.length > 1
      ? [...avaliacoes].reverse().map(a => ({
          name: formatters.date(a.data_avaliacao),
          peso: a.peso,
          imc: parseFloat(a.imc.toFixed(1)),
          peito: a.peito_busto,
          cintura: a.cintura,
          quadril: a.quadril,
          braco_d: a.braco_direito || 0,
          braco_e: a.braco_esquerdo || 0,
          antebraco_d: a.antebraco_direito || 0,
          antebraco_e: a.antebraco_esquerdo || 0,
          coxa_d: a.coxa_direita || 0,
          coxa_e: a.coxa_esquerda || 0,
          panturrilha_d: a.panturrilha_direita || 0,
          panturrilha_e: a.panturrilha_esquerda || 0,
        }))
      : [];
  }, [avaliacoes]);

  // ✅ ATUALIZADO: Filtra os dados do gráfico com base na data inicial selecionada
  const filteredChartData = useMemo(() => {
    if (chartData.length < 2) return [];
    return chartData.slice(startDateIndex);
  }, [chartData, startDateIndex]);

  // ✅ NOVO: Função para calcular e formatar a diferença total para uma medida
  const renderTotalDifference = (dataKey: keyof typeof chartData[0], label: string, unit: string) => {
    if (filteredChartData.length < 2) return null;

    const firstValue = filteredChartData[0][dataKey] as number;
    const lastValue = filteredChartData[filteredChartData.length - 1][dataKey] as number;

    if (typeof firstValue !== 'number' || typeof lastValue !== 'number' || firstValue === 0 || lastValue === 0) return null;

    const diff = lastValue - firstValue;
    const sign = diff > 0 ? '+' : '';
    // Para peso e IMC, aumento é ruim (vermelho). Para medidas, aumento é bom (verde).
    const isBadGrowth = ['peso', 'imc'].includes(dataKey);
    const color = diff > 0 ? (isBadGrowth ? 'text-red-600' : 'text-green-600') : (diff < 0 ? (isBadGrowth ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground');

    return (
      <span className={`text-xs font-bold ${color}`}>
        {label}: {sign}{diff.toFixed(1)} {unit}
      </span>
    );
  };

  // ✅ NOVO: Função para obter URL assinada da imagem
  const getImageUrl = useCallback(async (filename: string): Promise<string | null> => {
    if (!filename || typeof filename !== 'string') return null;
    try {
      const { data, error } = await supabase.functions.invoke('get-image-url', {
        body: { filename, bucket_type: 'avaliacoes' },
      });
      if (error) throw error;
      return data?.url || null;
    } catch (error) {
      console.error('Erro ao obter URL da imagem:', error);
      return null;
    }
  }, []);

  // ✅ NOVO: Efeito para carregar URLs assinadas quando as avaliações de imagem mudam
  useEffect(() => {
    const carregarUrls = async () => {
      const ultimaAvaliacao = avaliacoes[0];
      if (!ultimaAvaliacao && !avaliacaoInicialImagem) return;

      const urlsFinais = {
        frente: await getImageUrl(ultimaAvaliacao?.foto_frente_url || ''),
        lado: await getImageUrl(ultimaAvaliacao?.foto_lado_url || ''),
        costas: await getImageUrl(ultimaAvaliacao?.foto_costas_url || ''),
      };
      const urlsIniciais = {
        frente: await getImageUrl(avaliacaoInicialImagem?.foto_frente_url || ''),
        lado: await getImageUrl(avaliacaoInicialImagem?.foto_lado_url || ''),
        costas: await getImageUrl(avaliacaoInicialImagem?.foto_costas_url || ''),
      };
      setUrlsAssinadas({ inicial: urlsIniciais, final: urlsFinais });
    };
    carregarUrls();
  }, [avaliacaoInicialImagem, avaliacoes, getImageUrl]);

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

        // ✅ NOVO: Define a avaliação inicial para comparação de imagens
        if (avaliacoesData && avaliacoesData.length > 1) {
          setAvaliacaoInicialImagem(avaliacoesData[avaliacoesData.length - 1]);
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

  // ✅ CORREÇÃO: Define a interface para as props do CustomTooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-background/80 border rounded-md shadow-lg">
          <p className="label text-sm font-bold">{`${label}`}</p>
          {payload.map((pld) => <p key={pld.dataKey} style={{ color: pld.color }} className="text-sm">{`${pld.name}: ${pld.value}`}</p>)}
        </div>
      );
    }
    return null;
  };

  const calcularProgressoGeral = () => {
    if (avaliacoes.length < 2) return null;
    
    const primeira = avaliacoes[avaliacoes.length - 1];
    const ultima = avaliacoes[0];

    return {
      primeiraData: primeira.data_avaliacao,
      ultimaData: ultima.data_avaliacao,
      peso: {
        inicial: primeira.peso,
        final: ultima.peso,
        diferenca: ultima.peso - primeira.peso,
      },
      imc: {
        inicial: primeira.imc,
        final: ultima.imc,
        diferenca: ultima.imc - primeira.imc,
      },
      medidasTronco: {
        diferenca: ((ultima.peito_busto || 0) + (ultima.cintura || 0) + (ultima.quadril || 0)) - ((primeira.peito_busto || 0) + (primeira.cintura || 0) + (primeira.quadril || 0)),
      },
      medidasMembros: {
        diferenca: ((ultima.braco_direito || 0) + (ultima.braco_esquerdo || 0) + (ultima.coxa_direita || 0) + (ultima.coxa_esquerda || 0)) - ((primeira.braco_direito || 0) + (primeira.braco_esquerdo || 0) + (primeira.coxa_direita || 0) + (primeira.coxa_esquerda || 0)),
      },
    };
  };

  const progressoGeral = calcularProgressoGeral();

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
    navigate(`/alunos-avaliacoes/${id}/${avaliacaoId}`, { state: { from: location.pathname } });
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
    <div className="space-y-6 pb-40 md:pb-16">
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

      <Tabs defaultValue="historico" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="fotos">Antes X Depois</TabsTrigger>
        </TabsList>

        {/* Aba de Histórico */}
        <TabsContent value="historico">
          {avaliacoes.length === 0 ? (
            <Card className="border-dashed min-h-[180px]">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação encontrada</h3>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={historicoPeriodo} onValueChange={setHistoricoPeriodo} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger value="1ano" className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Último ano</TabsTrigger>
                <TabsTrigger value="2anos" className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">2 anos</TabsTrigger>
                <TabsTrigger value="3anos" className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">3 anos</TabsTrigger>
                <TabsTrigger value="todas" className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Todas</TabsTrigger>
              </TabsList>
              {(['1ano', '2anos', '3anos', 'todas'] as const).map(periodo => {
                const getFilteredAvaliacoes = () => {
                  const now = new Date();
                  if (periodo === '1ano') {
                    const oneYearAgo = new Date(new Date().setFullYear(now.getFullYear() - 1));
                    return avaliacoes.filter(a => new Date(a.data_avaliacao) >= oneYearAgo);
                  }
                  if (periodo === '2anos') {
                    const twoYearsAgo = new Date(new Date().setFullYear(now.getFullYear() - 2));
                    return avaliacoes.filter(a => new Date(a.data_avaliacao) >= twoYearsAgo);
                  }
                  if (periodo === '3anos') {
                    const threeYearsAgo = new Date(new Date().setFullYear(now.getFullYear() - 3));
                    return avaliacoes.filter(a => new Date(a.data_avaliacao) >= threeYearsAgo);
                  }
                  return avaliacoes;
                };
                const filteredAvaliacoes = getFilteredAvaliacoes();

                return (
                  <TabsContent key={periodo} value={periodo} className="mt-4">
                    {filteredAvaliacoes.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">
                          Nenhuma avaliação encontrada
                        </h3>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredAvaliacoes.map(avaliacao => {
                          const imcClass = getIMCClassification(avaliacao.imc);
                          return (
                            <div key={avaliacao.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                {avaliacao.professores ? (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="h-3 w-3" /><span>Realizada por {user?.id === avaliacao.professor_id ? 'você' : avaliacao.professores.nome_completo}</span></div>
                                ) : <div />}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4"><MoreVertical /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem onClick={() => handleVerDetalhes(avaliacao.id)} className="text-base md:text-sm"><Eye className="mr-2 h-4 w-4" /><span>Detalhes</span></DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExcluirAvaliacao(avaliacao)} className="text-base md:text-sm text-destructive focus:text-destructive" disabled={user?.id !== avaliacao.professor_id}><Trash2 className="mr-2 h-4 w-4" /><span>Excluir</span></DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><p className="text-sm text-muted-foreground">Data</p><p className="font-semibold">{formatters.date(avaliacao.data_avaliacao)}</p></div>
                                <div><p className="text-sm text-muted-foreground">Peso</p><p className="font-semibold">{avaliacao.peso} kg</p></div>
                                <div><p className="text-sm text-muted-foreground">Altura</p><p className="font-semibold">{avaliacao.altura} cm</p></div>
                                <div>
                                  <p className="text-sm text-muted-foreground">IMC</p>
                                  <div className="flex items-center gap-2"><span className="font-semibold">{avaliacao.imc.toFixed(1)}</span><Badge className={`${imcClass.color} text-white text-xs`}>{imcClass.text}</Badge></div>
                                </div>
                              </div>
                              {avaliacao.observacoes && (
                                <div className="mt-3 pt-3 border-t"><p className="text-xs text-muted-foreground mb-1">Observações:</p><p className="text-sm text-muted-foreground line-clamp-2">{avaliacao.observacoes}</p></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </TabsContent>

        {/* Aba de Evolução (Gráficos) */}
        <TabsContent value="graficos">
          <Card>
            <CardContent className="space-y-8 pt-6">
              {avaliacoes.length > 1 ? (
                <>
                  {/* ✅ NOVO: Dropdown para selecionar a data inicial */}
                  <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
                    <Label htmlFor="date-range-select" className="font-medium">Período de Análise</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(startDateIndex)}
                        onValueChange={(value) => setStartDateIndex(Number(value))}
                      >
                        <SelectTrigger id="date-range-select" className="w-[180px]">
                          <SelectValue placeholder="Data Inicial" />
                        </SelectTrigger>
                        <SelectContent>
                          {chartData.slice(0, -1).map((data, index) => (
                            <SelectItem key={index} value={String(index)}>{data.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">até</span>
                      <div className="px-3 py-2 border rounded-md bg-background text-sm font-medium">
                        {chartData[chartData.length - 1]?.name || '--'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2">
                      <h4 className="font-medium mb-2">Peso e IMC</h4>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lineOptions.pesoImc.map(line => (
                        <Badge
                          key={line.dataKey}
                          onClick={() => toggleLine('pesoImc', line.dataKey)}
                          variant={activeLines.pesoImc.includes(line.dataKey) ? 'default' : 'outline'}
                          className="cursor-pointer transition-all"
                          style={activeLines.pesoImc.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}
                        >
                          {line.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                      {activeLines.pesoImc.includes('peso') && renderTotalDifference('peso', 'Peso', 'kg')}
                      {activeLines.pesoImc.includes('imc') && renderTotalDifference('imc', 'IMC', '')}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="#8884d8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />                        
                        {activeLines.pesoImc.includes('peso') && <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#8884d8" activeDot={{ r: 8 }} />}
                        {activeLines.pesoImc.includes('imc') && <Line yAxisId="right" type="monotone" dataKey="imc" name="IMC" stroke="#82ca9d" />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h4 className="font-medium mb-2">Tronco (cm)</h4>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                      {activeLines.tronco.includes('peito') && renderTotalDifference('peito', 'Peito', 'cm')}
                      {activeLines.tronco.includes('cintura') && renderTotalDifference('cintura', 'Cintura', 'cm')}
                      {activeLines.tronco.includes('quadril') && renderTotalDifference('quadril', 'Quadril', 'cm')}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lineOptions.tronco.map(line => (
                        <Badge
                          key={line.dataKey}
                          onClick={() => toggleLine('tronco', line.dataKey)}
                          variant={activeLines.tronco.includes(line.dataKey) ? 'default' : 'outline'}
                          className="cursor-pointer transition-all"
                          style={activeLines.tronco.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}
                        >
                          {line.name}
                        </Badge>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        {activeLines.tronco.includes('peito') && <Line type="monotone" dataKey="peito" name="Peito" stroke="#8884d8" />}
                        {activeLines.tronco.includes('cintura') && <Line type="monotone" dataKey="cintura" name="Cintura" stroke="#82ca9d" />}
                        {activeLines.tronco.includes('quadril') && <Line type="monotone" dataKey="quadril" name="Quadril" stroke="#ffc658" />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h4 className="font-medium mb-2">Membros Superiores (cm)</h4>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                      {activeLines.superiores.includes('braco_d') && renderTotalDifference('braco_d', 'Braço D.', 'cm')}
                      {activeLines.superiores.includes('braco_e') && renderTotalDifference('braco_e', 'Braço E.', 'cm')}
                      {activeLines.superiores.includes('antebraco_d') && renderTotalDifference('antebraco_d', 'Antebraço D.', 'cm')}
                      {activeLines.superiores.includes('antebraco_e') && renderTotalDifference('antebraco_e', 'Antebraço E.', 'cm')}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lineOptions.superiores.map(line => (
                        <Badge
                          key={line.dataKey}
                          onClick={() => toggleLine('superiores', line.dataKey)}
                          variant={activeLines.superiores.includes(line.dataKey) ? 'default' : 'outline'}
                          className="cursor-pointer transition-all"
                          style={activeLines.superiores.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}
                        >
                          {line.name}
                        </Badge>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        {activeLines.superiores.includes('braco_d') && <Line type="monotone" dataKey="braco_d" name="Braço D." stroke="#8884d8" />}
                        {activeLines.superiores.includes('braco_e') && <Line type="monotone" dataKey="braco_e" name="Braço E." stroke="#82ca9d" />}
                        {activeLines.superiores.includes('antebraco_d') && <Line type="monotone" dataKey="antebraco_d" name="Antebraço D." stroke="#ffc658" />}
                        {activeLines.superiores.includes('antebraco_e') && <Line type="monotone" dataKey="antebraco_e" name="Antebraço E." stroke="#ff7300" />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h4 className="font-medium mb-2">Membros Inferiores (cm)</h4>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                      {activeLines.inferiores.includes('coxa_d') && renderTotalDifference('coxa_d', 'Coxa D.', 'cm')}
                      {activeLines.inferiores.includes('coxa_e') && renderTotalDifference('coxa_e', 'Coxa E.', 'cm')}
                      {activeLines.inferiores.includes('panturrilha_d') && renderTotalDifference('panturrilha_d', 'Panturrilha D.', 'cm')}
                      {activeLines.inferiores.includes('panturrilha_e') && renderTotalDifference('panturrilha_e', 'Panturrilha E.', 'cm')}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lineOptions.inferiores.map(line => (
                        <Badge
                          key={line.dataKey}
                          onClick={() => toggleLine('inferiores', line.dataKey)}
                          variant={activeLines.inferiores.includes(line.dataKey) ? 'default' : 'outline'}
                          className="cursor-pointer transition-all"
                          style={activeLines.inferiores.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}
                        >
                          {line.name}
                        </Badge>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        {activeLines.inferiores.includes('coxa_d') && <Line type="monotone" dataKey="coxa_d" name="Coxa D." stroke="#8884d8" />}
                        {activeLines.inferiores.includes('coxa_e') && <Line type="monotone" dataKey="coxa_e" name="Coxa E." stroke="#82ca9d" />}
                        {activeLines.inferiores.includes('panturrilha_d') && <Line type="monotone" dataKey="panturrilha_d" name="Panturrilha D." stroke="#ffc658" />}
                        {activeLines.inferiores.includes('panturrilha_e') && <Line type="monotone" dataKey="panturrilha_e" name="Panturrilha E." stroke="#ff7300" />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                  <div className="text-center py-12">
                    <LineChartIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Necessário pelo menos duas avaliações para comparar.</h3>
                  </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Progresso Geral */}
        <TabsContent value="fotos">
          <Card>
            <CardContent className="pt-6">
              {avaliacoes.length > 1 ? (
                <div className="space-y-6">
                  <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
                    <Label htmlFor="image-comparison-select" className="font-medium">Antes X Depois</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={avaliacaoInicialImagem?.id || ''}
                        onValueChange={(id) => {
                          const avaliacaoSelecionada = avaliacoes.find(a => a.id === id);
                          setAvaliacaoInicialImagem(avaliacaoSelecionada || null);
                        }}
                      >
                        <SelectTrigger id="image-comparison-select" className="w-[180px]">
                          <SelectValue placeholder="Data Inicial" />
                        </SelectTrigger>
                        <SelectContent>
                          {avaliacoes.slice(1).map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {formatters.date(a.data_avaliacao)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">X</span>
                      <div className="px-3 py-2 border rounded-md bg-background text-sm font-medium">
                        {avaliacoes[0] ? formatters.date(avaliacoes[0].data_avaliacao) : '--'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['frente', 'lado', 'costas'] as const).map(tipo => (
                      <div key={tipo} className="space-y-4">
                        <h4 className="font-semibold text-center capitalize">Foto de {tipo}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Imagem Inicial */}
                          <div className="space-y-2">
                            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                              {urlsAssinadas.inicial[tipo] ? <img src={urlsAssinadas.inicial[tipo]!} alt={`Inicial ${tipo}`} className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">Sem imagem</span>}
                            </div>
                            <p className="text-xs text-center text-muted-foreground">{avaliacaoInicialImagem ? formatters.date(avaliacaoInicialImagem.data_avaliacao) : 'N/A'}</p>
                          </div>
                          {/* Imagem Final */}
                          <div className="space-y-2">
                            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                              {urlsAssinadas.final[tipo] ? <img src={urlsAssinadas.final[tipo]!} alt={`Final ${tipo}`} className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">Sem imagem</span>}
                            </div>
                            <p className="text-xs text-center text-muted-foreground">{avaliacoes[0] ? formatters.date(avaliacoes[0].data_avaliacao) : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Necessário pelo menos duas avaliações para comparar.</h3>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
        <Button
          onClick={handleNovaAvaliacao}
          className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
          aria-label="Nova Avaliação"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
};

export default AlunosAvaliacoes;