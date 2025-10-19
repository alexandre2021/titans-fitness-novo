import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMediaQuery } from '@/hooks/use-media-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Users, Target, Clock, Plus, FileText, MoreVertical, Eye, Play, Ban, Activity, Trash2, BicepsFlexed, Repeat, User as UserIcon, Info, Search, Filter, X, Loader2, CalendarCheck, BarChart3, AlertTriangle, LineChart as LineChartIcon, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatters } from '@/utils/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Tables } from '@/integrations/supabase/types';

type AlunoInfo = {
  id: string;
  nome_completo: string;
  avatar_image_url: string | null;
  avatar_type: string | null;
  avatar_letter: string | null;
  avatar_color: string | null;
};

type Avaliacao = Tables<'avaliacoes_fisicas'> & {
  aluno: AlunoInfo | null;
};

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

type ChartDataPoint = {
  name: string;
  peso?: number | null;
  imc?: number | null;
  peito?: number | null;
  cintura?: number | null;
  quadril?: number | null;
  braco_d: number;
  braco_e: number;
  antebraco_d: number;
  antebraco_e: number;
  coxa_d: number;
  coxa_e: number;
  panturrilha_d: number;
  panturrilha_e: number;
};

const ComparacaoFotos = ({ avaliacoes, avaliacaoInicial, onAvaliacaoInicialChange, getImageUrl, alunoId }: { avaliacoes: Avaliacao[], avaliacaoInicial: Avaliacao | null, onAvaliacaoInicialChange: (id: string) => void, getImageUrl: (filename: string | null | undefined) => Promise<string | null>, alunoId: string }) => {
  const [urls, setUrls] = useState<{ inicial: { frente?: string; lado?: string; costas?: string }; final: { frente?: string; lado?: string; costas?: string } }>({ inicial: {}, final: {} });
  const avaliacaoFinal = avaliacoes[0];

  useEffect(() => {
    const carregarUrls = async () => {
      if (!avaliacaoInicial && !avaliacaoFinal) return;
      const urlsIniciais = { frente: await getImageUrl(avaliacaoInicial?.foto_frente_url), lado: await getImageUrl(avaliacaoInicial?.foto_lado_url), costas: await getImageUrl(avaliacaoInicial?.foto_costas_url) };
      const urlsFinais = { frente: await getImageUrl(avaliacaoFinal?.foto_frente_url), lado: await getImageUrl(avaliacaoFinal?.foto_lado_url), costas: await getImageUrl(avaliacaoFinal?.foto_costas_url) };
      setUrls({ inicial: urlsIniciais, final: urlsFinais });
    };
    void carregarUrls();
  }, [alunoId, avaliacaoInicial, avaliacaoFinal, getImageUrl]);

  if (avaliacoes.length <= 1) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Camera className="h-12 w-12 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Necessário pelo menos duas avaliações para comparar.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
        <Label htmlFor={`image-comparison-select-${alunoId}`} className="font-medium">Antes X Depois</Label>
        <div className="flex items-center gap-2">
          <Select value={avaliacaoInicial?.id || ''} onValueChange={onAvaliacaoInicialChange}>
            <SelectTrigger id={`image-comparison-select-${alunoId}`} className="w-[180px]"><SelectValue placeholder="Data Inicial" /></SelectTrigger>
            <SelectContent>{avaliacoes.slice(1).map(a => (<SelectItem key={a.id} value={a.id}>{formatters.date(a.data_avaliacao)}</SelectItem>))}</SelectContent>
          </Select>
          <span className="text-muted-foreground">X</span>
          <div className="px-3 py-2 border rounded-md bg-background text-sm font-medium">{avaliacaoFinal ? formatters.date(avaliacaoFinal.data_avaliacao) : '--'}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['frente', 'lado', 'costas'] as const).map(tipo => (
          <div key={tipo} className="space-y-4">
            <h4 className="font-semibold text-center capitalize">Foto de {tipo}</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">{urls.inicial[tipo] ? <img src={urls.inicial[tipo]!} alt={`Inicial ${tipo}`} className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">Sem imagem</span>}</div>
                <p className="text-xs text-center text-muted-foreground">{avaliacaoInicial ? formatters.date(avaliacaoInicial.data_avaliacao) : 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">{urls.final[tipo] ? <img src={urls.final[tipo]!} alt={`Final ${tipo}`} className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">Sem imagem</span>}</div>
                <p className="text-xs text-center text-muted-foreground">{avaliacaoFinal ? formatters.date(avaliacaoFinal.data_avaliacao) : 'N/A'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AvaliacoesPT = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const [allAvaliacoes, setAllAvaliacoes] = useState<Avaliacao[]>([]);
  const [alunos, setAlunos] = useState<AlunoInfo[]>([]);
  const [busca, setBusca] = useState('');
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const [historicoPeriodoTabs, setHistoricoPeriodoTabs] = useState<Record<string, string>>({});

  // Estados para gráficos e fotos
  const [startDateIndex, setStartDateIndex] = useState<Record<string, number>>({});
  const [activeLines, setActiveLines] = useState<Record<string, ActiveLinesState>>({});
  const [avaliacaoInicialImagem, setAvaliacaoInicialImagem] = useState<Record<string, Avaliacao | null>>({});
  const getImageUrl = useCallback(async (filename: string | null | undefined): Promise<string | null> => {
    if (!filename) return null;
    const { data } = await supabase.functions.invoke('get-image-url', { body: { filename, bucket_type: 'avaliacoes' } });
    return data?.url || null;
  }, []);

  // Estados para exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState<Avaliacao | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    const fetchDados = async () => {
      if (!user) return;

      try {
        const { data: alunosData, error: alunosError } = await supabase
          .from('alunos_professores')
          .select('alunos(*)')
          .eq('professor_id', user.id);

        if (alunosError) throw new Error(`Erro ao buscar alunos: ${alunosError.message}`);

        const alunosList = (alunosData?.map(item => item.alunos).filter(Boolean) as AlunoInfo[]) || [];
        setAlunos(alunosList);

        const alunoIds = alunosList.map(aluno => aluno.id);

        if (alunoIds.length === 0) {
          setAllAvaliacoes([]);
          return;
        }

        const { data: avaliacoesData, error: avaliacoesError } = await supabase
          .from('avaliacoes_fisicas')
          .select('*, aluno:alunos!avaliacoes_fisicas_aluno_id_fkey(id, nome_completo, avatar_image_url, avatar_type, avatar_letter, avatar_color)')
          .in('aluno_id', alunoIds)
          .order('data_avaliacao', { ascending: false });

        if (avaliacoesError) throw avaliacoesError;

        setAllAvaliacoes((avaliacoesData as unknown as Avaliacao[]) || []);
      } catch (error) {
        console.error("Erro ao buscar dados de avaliações:", error);
        toast.error("Erro ao carregar dados", { description: "Não foi possível buscar as avaliações dos alunos." });
      } finally {
        setLoading(false);
      }
    };

    void fetchDados();
  }, [user]);

  const alunosComAvaliacoesFiltradas = useMemo(() => {
    const alunosFiltrados = alunos.filter(aluno => {
      if (busca !== '' && !aluno.nome_completo.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });

    return alunosFiltrados.map(aluno => {
      const avaliacoesDoAluno = allAvaliacoes.filter(a => a.aluno_id === aluno.id);

      // Inicializa estados para cada aluno
      if (!activeLines[aluno.id]) {
        setActiveLines(prev => ({ ...prev, [aluno.id]: { pesoImc: ['peso', 'imc'], tronco: ['peito', 'cintura', 'quadril'], superiores: ['braco_d', 'braco_e'], inferiores: ['coxa_d', 'coxa_e'] } }));
      }
      if (avaliacoesDoAluno.length > 1 && startDateIndex[aluno.id] === undefined) {
        setStartDateIndex(prev => ({ ...prev, [aluno.id]: 0 }));
      }
      if (avaliacoesDoAluno.length > 1 && avaliacaoInicialImagem[aluno.id] === undefined) {
        setAvaliacaoInicialImagem(prev => ({ ...prev, [aluno.id]: avaliacoesDoAluno[avaliacoesDoAluno.length - 1] }));
      }

      return { aluno, avaliacoes: avaliacoesDoAluno };
    });
  }, [alunos, busca, allAvaliacoes, activeLines, startDateIndex, avaliacaoInicialImagem]);

  const getIMCClassification = (imc: number) => {
    if (imc < 18.5) return { text: 'Abaixo do peso', color: 'bg-blue-500' };
    if (imc < 25) return { text: 'Normal', color: 'bg-green-500' };
    if (imc < 30) return { text: 'Sobrepeso', color: 'bg-yellow-500' };
    return { text: 'Obesidade', color: 'bg-red-500' };
  };

  const handleNovaAvaliacao = (alunoId: string) => {
    navigate(`/alunos-avaliacoes/${alunoId}/nova`);
  };

  const toggleLine = (alunoId: string, chart: keyof ActiveLinesState, dataKey: string) => {
    setActiveLines(prev => {
      const currentLines = prev[alunoId]?.[chart] || [];
      const newLines = currentLines.includes(dataKey) ? currentLines.filter(line => line !== dataKey) : [...currentLines, dataKey];
      return { ...prev, [alunoId]: { ...prev[alunoId], [chart]: newLines } };
    });
  };


  const handleExcluirAvaliacao = (avaliacao: Avaliacao) => {
    setAvaliacaoParaExcluir(avaliacao);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!avaliacaoParaExcluir) return;

    if (avaliacaoParaExcluir.professor_id !== user?.id) {
      toast.error("Permissão negada", {
        description: "Você só pode excluir avaliações que você mesmo criou.",
      });
      setShowDeleteDialog(false);
      return;
    }

    setIsDeleting(true);
    try {
      const { data: avaliacaoData, error: fetchError } = await supabase
        .from('avaliacoes_fisicas')
        .select('foto_frente_url, foto_lado_url, foto_costas_url')
        .eq('id', avaliacaoParaExcluir.id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar avaliação para exclusão de imagens:', fetchError);
      }

      const filesToDelete = [
        avaliacaoData?.foto_frente_url,
        avaliacaoData?.foto_lado_url,
        avaliacaoData?.foto_costas_url,
      ].filter(Boolean) as string[];

      for (const fileUrl of filesToDelete) {
        const filename = fileUrl.split('?')[0].split('/').pop();
        if (filename) {
          await supabase.functions.invoke('delete-media', {
            body: { filename, bucket_type: 'avaliacoes' }
          });
        }
      }

      const { error } = await supabase
        .from('avaliacoes_fisicas')
        .delete()
        .eq('id', avaliacaoParaExcluir.id);

      if (error) throw error;

      setAllAvaliacoes(prev => prev.filter(a => a.id !== avaliacaoParaExcluir.id));
      toast.success("Avaliação excluída com sucesso.");

    } catch (error) {
      console.error('Erro inesperado na exclusão da avaliação:', error);
      toast.error('Erro', {
        description: 'Ocorreu um erro inesperado. Tente novamente.',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setAvaliacaoParaExcluir(null);
    }
  };

  const handleCancelarExclusao = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
    setAvaliacaoParaExcluir(null);
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (<div className="p-2 bg-background/80 border rounded-md shadow-lg"><p className="label text-sm font-bold">{`${label}`}</p>{payload.map((pld) => <p key={String(pld.dataKey)} style={{ color: pld.color }} className="text-sm">{`${pld.name}: ${pld.value}`}</p>)}</div>);
    }
    return null;
  };

  const renderTotalDifference = (data: ChartDataPoint[], dataKey: keyof ChartDataPoint, label: string, unit: string) => {
    if (data.length < 2) return null;
    const firstValue = data[0][dataKey] as number;
    const lastValue = data[data.length - 1][dataKey] as number;
    if (typeof firstValue !== 'number' || typeof lastValue !== 'number') return null;
    const diff = lastValue - firstValue;
    const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
    const isBadGrowth = ['peso', 'imc'].includes(dataKey as string);
    const color = diff > 0 ? (isBadGrowth ? 'text-red-600' : 'text-green-600') : (diff < 0 ? (isBadGrowth ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground');
    return (<span className={`text-xs font-bold ${color}`}>{label}: {sign}{Math.abs(diff).toFixed(1)} {unit}</span>);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Carregando avaliações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isDesktop && (
        <div>
          <h1 className="text-3xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground">Acompanhe o histórico de avaliações de todos os seus alunos.</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome do aluno..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {alunosComAvaliacoesFiltradas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma avaliação encontrada</h3>
            {alunos.length === 0 && (
              <p className="text-muted-foreground mb-6 max-w-md">Você ainda não tem alunos com avaliações. Adicione alunos e realize avaliações para começar.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 pb-32 md:pb-20 max-w-5xl mx-auto">
          {alunosComAvaliacoesFiltradas.map(({ aluno, avaliacoes }) => (
            <Card key={aluno.id} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {aluno.avatar_type === 'image' && aluno.avatar_image_url ? (
                        <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />
                      ) : (
                        <AvatarFallback style={{ backgroundColor: aluno.avatar_color || '#ccc' }} className="text-white font-semibold">
                          {aluno.avatar_letter}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <Link to={`/alunos-avaliacoes/${aluno.id}`} className="hover:underline">
                      {aluno.nome_completo}
                    </Link>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-20">
                <Tabs
                  value={activeTabs[aluno.id] || 'historico'}
                  onValueChange={(tab) => setActiveTabs(prev => ({ ...prev, [aluno.id]: tab }))}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                    <TabsTrigger value="graficos">Evolução (Gráficos)</TabsTrigger>
                    <TabsTrigger value="fotos">Evolução (Fotos)</TabsTrigger>
                  </TabsList>

                  <TabsContent value="historico" className="mt-4">
                    <Tabs
                      value={historicoPeriodoTabs[aluno.id] || '1ano'}
                      onValueChange={(nestedTab) => setHistoricoPeriodoTabs(prev => ({ ...prev, [aluno.id]: nestedTab }))}
                      className="w-full"
                    >
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
                                        {avaliacao.professor_id ? (
                                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <UserIcon className="h-3 w-3" />
                                            <span>Realizada por {user?.id === avaliacao.professor_id ? 'você' : 'outro professor'}</span>
                                          </div>
                                        ) : <div />}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-4"><MoreVertical /></Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem onClick={() => navigate(`/alunos-avaliacoes/${aluno.id}/${avaliacao.id}`, { state: { from: '/avaliacoes' } })}>
                                              <Eye className="mr-2 h-4 w-4" />
                                              <span>Detalhes</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExcluirAvaliacao(avaliacao)} className="text-destructive focus:text-destructive" disabled={user?.id !== avaliacao.professor_id}>
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              <span>Excluir</span>
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div><p className="text-sm text-muted-foreground">Data</p><p className="font-semibold">{formatters.date(avaliacao.data_avaliacao)}</p></div>
                                        <div><p className="text-sm text-muted-foreground">Peso</p><p className="font-semibold">{avaliacao.peso} kg</p></div>
                                        <div><p className="text-sm text-muted-foreground">Altura</p><p className="font-semibold">{avaliacao.altura} cm</p></div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">IMC</p>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold">{avaliacao.imc.toFixed(1)}</span>
                                            <Badge className={`${imcClass.color} text-white text-xs`}>{imcClass.text}</Badge>
                                          </div>
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
                  </TabsContent>

                  <TabsContent value="graficos" className="mt-4">
                    {(() => {
                      const chartData = avaliacoes.length > 1 ? [...avaliacoes].reverse().map(a => ({ name: formatters.date(a.data_avaliacao), peso: a.peso, imc: parseFloat(a.imc.toFixed(1)), peito: a.peito_busto, cintura: a.cintura, quadril: a.quadril, braco_d: a.braco_direito || 0, braco_e: a.braco_esquerdo || 0, antebraco_d: a.antebraco_direito || 0, antebraco_e: a.antebraco_esquerdo || 0, coxa_d: a.coxa_direita || 0, coxa_e: a.coxa_esquerda || 0, panturrilha_d: a.panturrilha_direita || 0, panturrilha_e: a.panturrilha_esquerda || 0 })) : [];
                      const currentStartDateIndex = startDateIndex[aluno.id] || 0;
                      const filteredChartData = chartData.slice(currentStartDateIndex);
                      const currentActiveLines = activeLines[aluno.id] || { pesoImc: [], tronco: [], superiores: [], inferiores: [] };

                      return avaliacoes.length > 1 ? (
                        <div className="space-y-8">
                          <div className="space-y-2 rounded-lg border p-4 bg-muted/30"><Label htmlFor={`date-range-select-${aluno.id}`} className="font-medium">Período de Análise</Label><div className="flex items-center gap-2"><Select value={String(currentStartDateIndex)} onValueChange={(value) => setStartDateIndex(prev => ({ ...prev, [aluno.id]: Number(value) }))}><SelectTrigger id={`date-range-select-${aluno.id}`} className="w-[180px]"><SelectValue placeholder="Data Inicial" /></SelectTrigger><SelectContent>{chartData.slice(0, -1).map((data, index) => (<SelectItem key={index} value={String(index)}>{data.name}</SelectItem>))}</SelectContent></Select><span className="text-muted-foreground">até</span><div className="px-3 py-2 border rounded-md bg-background text-sm font-medium">{chartData[chartData.length - 1]?.name || '--'}</div></div></div>
                          <div>
                            <h4 className="font-medium mb-2">Peso e IMC</h4>
                            <div className="flex flex-wrap gap-2 mb-4">{lineOptions.pesoImc.map(line => (<Badge key={line.dataKey} onClick={() => toggleLine(aluno.id, 'pesoImc', line.dataKey)} variant={currentActiveLines.pesoImc.includes(line.dataKey) ? 'default' : 'outline'} className="cursor-pointer transition-all" style={currentActiveLines.pesoImc.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}>{line.name}</Badge>))}</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">{currentActiveLines.pesoImc.includes('peso') && renderTotalDifference(filteredChartData, 'peso', 'Peso', 'kg')}{currentActiveLines.pesoImc.includes('imc') && renderTotalDifference(filteredChartData, 'imc', 'IMC', '')}</div>
                            <ResponsiveContainer width="100%" height={300}><LineChart data={filteredChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis yAxisId="left" stroke="#8884d8" fontSize={12} tickLine={false} axisLine={false} /><YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={12} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} />{currentActiveLines.pesoImc.includes('peso') && <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#8884d8" activeDot={{ r: 8 }} />}{currentActiveLines.pesoImc.includes('imc') && <Line yAxisId="right" type="monotone" dataKey="imc" name="IMC" stroke="#82ca9d" />}</LineChart></ResponsiveContainer>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Tronco (cm)</h4>
                            <div className="flex flex-wrap gap-2 mb-4">{lineOptions.tronco.map(line => (<Badge key={line.dataKey} onClick={() => toggleLine(aluno.id, 'tronco', line.dataKey)} variant={currentActiveLines.tronco.includes(line.dataKey) ? 'default' : 'outline'} className="cursor-pointer transition-all" style={currentActiveLines.tronco.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}>{line.name}</Badge>))}</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">{currentActiveLines.tronco.includes('peito') && renderTotalDifference(filteredChartData, 'peito', 'Peito', 'cm')}{currentActiveLines.tronco.includes('cintura') && renderTotalDifference(filteredChartData, 'cintura', 'Cintura', 'cm')}{currentActiveLines.tronco.includes('quadril') && renderTotalDifference(filteredChartData, 'quadril', 'Quadril', 'cm')}</div>
                            <ResponsiveContainer width="100%" height={300}><LineChart data={filteredChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} />{currentActiveLines.tronco.includes('peito') && <Line type="monotone" dataKey="peito" name="Peito" stroke="#8884d8" />}{currentActiveLines.tronco.includes('cintura') && <Line type="monotone" dataKey="cintura" name="Cintura" stroke="#82ca9d" />}{currentActiveLines.tronco.includes('quadril') && <Line type="monotone" dataKey="quadril" name="Quadril" stroke="#ffc658" />}</LineChart></ResponsiveContainer>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Membros Superiores (cm)</h4>
                            <div className="flex flex-wrap gap-2 mb-4">{lineOptions.superiores.map(line => (<Badge key={line.dataKey} onClick={() => toggleLine(aluno.id, 'superiores', line.dataKey)} variant={currentActiveLines.superiores.includes(line.dataKey) ? 'default' : 'outline'} className="cursor-pointer transition-all" style={currentActiveLines.superiores.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}>{line.name}</Badge>))}</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                              {currentActiveLines.superiores.includes('braco_d') && renderTotalDifference(filteredChartData, 'braco_d', 'Braço D.', 'cm')}
                              {currentActiveLines.superiores.includes('braco_e') && renderTotalDifference(filteredChartData, 'braco_e', 'Braço E.', 'cm')}
                              {currentActiveLines.superiores.includes('antebraco_d') && renderTotalDifference(filteredChartData, 'antebraco_d', 'Antebraço D.', 'cm')}
                              {currentActiveLines.superiores.includes('antebraco_e') && renderTotalDifference(filteredChartData, 'antebraco_e', 'Antebraço E.', 'cm')}
                            </div>
                            <ResponsiveContainer width="100%" height={300}><LineChart data={filteredChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} />
                              {currentActiveLines.superiores.includes('braco_d') && <Line type="monotone" dataKey="braco_d" name="Braço D." stroke="#8884d8" />}
                              {currentActiveLines.superiores.includes('braco_e') && <Line type="monotone" dataKey="braco_e" name="Braço E." stroke="#82ca9d" />}
                              {currentActiveLines.superiores.includes('antebraco_d') && <Line type="monotone" dataKey="antebraco_d" name="Antebraço D." stroke="#ffc658" />}
                              {currentActiveLines.superiores.includes('antebraco_e') && <Line type="monotone" dataKey="antebraco_e" name="Antebraço E." stroke="#ff7300" />}
                            </LineChart></ResponsiveContainer>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Membros Inferiores (cm)</h4>
                            <div className="flex flex-wrap gap-2 mb-4">{lineOptions.inferiores.map(line => (<Badge key={line.dataKey} onClick={() => toggleLine(aluno.id, 'inferiores', line.dataKey)} variant={currentActiveLines.inferiores.includes(line.dataKey) ? 'default' : 'outline'} className="cursor-pointer transition-all" style={currentActiveLines.inferiores.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}>{line.name}</Badge>))}</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                              {currentActiveLines.inferiores.includes('coxa_d') && renderTotalDifference(filteredChartData, 'coxa_d', 'Coxa D.', 'cm')}
                              {currentActiveLines.inferiores.includes('coxa_e') && renderTotalDifference(filteredChartData, 'coxa_e', 'Coxa E.', 'cm')}
                              {currentActiveLines.inferiores.includes('panturrilha_d') && renderTotalDifference(filteredChartData, 'panturrilha_d', 'Panturrilha D.', 'cm')}
                              {currentActiveLines.inferiores.includes('panturrilha_e') && renderTotalDifference(filteredChartData, 'panturrilha_e', 'Panturrilha E.', 'cm')}
                            </div>
                            <ResponsiveContainer width="100%" height={300}><LineChart data={filteredChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} />
                              {currentActiveLines.inferiores.includes('coxa_d') && <Line type="monotone" dataKey="coxa_d" name="Coxa D." stroke="#8884d8" />}
                              {currentActiveLines.inferiores.includes('coxa_e') && <Line type="monotone" dataKey="coxa_e" name="Coxa E." stroke="#82ca9d" />}
                              {currentActiveLines.inferiores.includes('panturrilha_d') && <Line type="monotone" dataKey="panturrilha_d" name="Panturrilha D." stroke="#ffc658" />}
                              {currentActiveLines.inferiores.includes('panturrilha_e') && <Line type="monotone" dataKey="panturrilha_e" name="Panturrilha E." stroke="#ff7300" />}
                            </LineChart></ResponsiveContainer>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <LineChartIcon className="h-12 w-12 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Necessário pelo menos duas avaliações para comparar.</h3>
                        </div>
                      );
                    })()}
                  </TabsContent>

                  <TabsContent value="fotos" className="mt-4">
                    <ComparacaoFotos
                      avaliacoes={avaliacoes}
                      avaliacaoInicial={avaliacaoInicialImagem[aluno.id] || null}
                      onAvaliacaoInicialChange={(id) => setAvaliacaoInicialImagem(prev => ({ ...prev, [aluno.id]: avaliacoes.find(a => a.id === id) || null }))}
                      getImageUrl={getImageUrl}
                      alunoId={aluno.id}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
              <div className="absolute bottom-4 right-4">
                <Button
                  onClick={() => handleNovaAvaliacao(aluno.id)}
                  className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
                  aria-label="Nova Avaliação"
                  title="Nova Avaliação"
                >
                  <Plus />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Avaliação
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir a avaliação de{' '}
              <strong>{avaliacaoParaExcluir ? formatters.date(avaliacaoParaExcluir.data_avaliacao) : ''}</strong>?
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelarExclusao} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmarExclusao} disabled={isDeleting}>
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</>
              ) : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvaliacoesPT;