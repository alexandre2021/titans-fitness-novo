// ✅ ESTE COMPONENTE É PARA A VISÃO DO ALUNO LOGADO
import { useEffect, useState, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Modal from 'react-modal';
import { Activity, Calendar, Eye, Camera, X, TrendingUp, LineChart as LineChartIcon, BarChart3 } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatters } from '@/utils/formatters';

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

const AvaliacoesAluno = () => {
  const { user } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // Estados principais
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFisica[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para os gráficos
  const [startDateIndex, setStartDateIndex] = useState(0);
  const [activeLines, setActiveLines] = useState<ActiveLinesState>({
    pesoImc: ['peso', 'imc'],
    tronco: ['peito', 'cintura', 'quadril'],
    superiores: ['braco_d', 'braco_e'],
    inferiores: ['coxa_d', 'coxa_e'],
  });

  // Estados para a aba de fotos
  const [avaliacaoInicialImagem, setAvaliacaoInicialImagem] = useState<AvaliacaoFisica | null>(null);
  const [urlsAssinadas, setUrlsAssinadas] = useState<{
    inicial: { frente?: string; lado?: string; costas?: string };
    final: { frente?: string; lado?: string; costas?: string };
  }>({
    inicial: {},
    final: {},
  });

  // Estados do modal
  const [modalVisible, setModalVisible] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<AvaliacaoFisica | null>(null);
  
  // Estados das imagens do modal
  const [imageUrls, setImageUrls] = useState<{
    frente?: string;
    lado?: string;
    costas?: string;
  }>({});
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Função para obter URL assinada da imagem
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

  // Função para carregar imagens da avaliação selecionada
  const loadImages = useCallback(async (avaliacao: AvaliacaoFisica) => {
    setIsLoadingImages(true);
    setImageUrls({});
    
    try {
      const urls: { frente?: string; lado?: string; costas?: string } = {};
      
      // Carregar cada imagem se existir
      for (const tipo of ['frente', 'lado', 'costas'] as const) {
        const filename = avaliacao[`foto_${tipo}_url` as keyof AvaliacaoFisica];
        if (filename) {
          try {
            let cleanFilename = filename as string;
            if (cleanFilename.includes('/')) {
              cleanFilename = cleanFilename.split('/').pop()?.split('?')[0] || cleanFilename;
            }
            
            if (cleanFilename) {
              const url = await getImageUrl(cleanFilename);
              urls[tipo] = url;
            }
          } catch (error) {
            console.error(`Erro ao carregar imagem ${tipo}:`, error);
          }
        }
      }
      
      setImageUrls(urls);
    } catch (error) {
      console.error('Erro geral ao carregar imagens:', error);
    } finally {
      setIsLoadingImages(false);
    }
  }, [getImageUrl]);

  // Buscar avaliações do aluno
  useEffect(() => {
    const fetchAvaliacoes = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('avaliacoes_fisicas')
          .select('*')
          .eq('aluno_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao buscar avaliações:', error);
          toast.error("Erro", {
            description: "Não foi possível carregar suas avaliações.",
          });
          return;
        }

        setAvaliacoes(data || []);
      } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
        toast.error("Erro", {
          description: "Erro inesperado ao carregar dados.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAvaliacoes();
  }, [user]);

  // Efeito para carregar URLs assinadas quando as avaliações de imagem mudam
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

  // Resetar o filtro de data dos gráficos quando as avaliações mudam
  useEffect(() => {
    setStartDateIndex(0);
  }, [avaliacoes]);

  const toggleLine = (chart: keyof ActiveLinesState, dataKey: string) => {
    setActiveLines(prev => {
      const currentLines = prev[chart];
      const newLines = currentLines.includes(dataKey) ? currentLines.filter(line => line !== dataKey) : [...currentLines, dataKey];
      return { ...prev, [chart]: newLines };
    });
  };

  // Abrir modal com detalhes
  const handleVerDetalhes = async (avaliacao: AvaliacaoFisica) => {
    setAvaliacaoSelecionada(avaliacao);
    setModalVisible(true);
    // Carregar imagens quando abrir o modal
    await loadImages(avaliacao);
  };

  // Fechar modal
  const handleFecharModal = () => {
    setModalVisible(false);
    setAvaliacaoSelecionada(null);
    setImageUrls({});
  };

  // Funções auxiliares
  const getIMCClassification = (imc: number) => {
    if (imc < 18.5) return { text: 'Abaixo do peso', color: 'bg-blue-500' };
    if (imc < 25) return { text: 'Normal', color: 'bg-green-500' };
    if (imc < 30) return { text: 'Sobrepeso', color: 'bg-yellow-500' };
    return { text: 'Obesidade', color: 'bg-red-500' };
  };

  const calcularDiferenca = (direito?: number, esquerdo?: number) => {
    if (!direito || !esquerdo) return null;
    return Math.abs(direito - esquerdo).toFixed(1);
  };

  const calcularSimetria = (direito?: number, esquerdo?: number) => {
    if (direito === undefined || esquerdo === undefined || direito === null || esquerdo === null) return null;
    if (direito === 0 && esquerdo === 0) return '100.0';
    const maior = Math.max(direito, esquerdo);
    if (maior === 0) return '100.0';
    const diferenca = Math.abs(direito - esquerdo);
    const simetria = 100 - (diferenca / maior * 100);
    return simetria.toFixed(1);
  };

  // Dados para os gráficos
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

  const filteredChartData = useMemo(() => {
    if (chartData.length < 2) return [];
    return chartData.slice(startDateIndex);
  }, [chartData, startDateIndex]);

  const renderTotalDifference = (dataKey: keyof typeof chartData[0], label: string, unit: string) => {
    if (filteredChartData.length < 2) return null;

    const firstValue = filteredChartData[0][dataKey] as number;
    const lastValue = filteredChartData[filteredChartData.length - 1][dataKey] as number;

    if (typeof firstValue !== 'number' || typeof lastValue !== 'number') return null;

    const diff = lastValue - firstValue;
    const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
    const isBadGrowth = ['peso', 'imc'].includes(dataKey);
    const color = diff > 0 ? (isBadGrowth ? 'text-red-600' : 'text-green-600') : (diff < 0 ? (isBadGrowth ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground');

    return (
      <span className={`text-xs font-bold ${color}`}>
        {label}: {sign}{Math.abs(diff).toFixed(1)} {unit}
      </span>
    );
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (<div className="p-2 bg-background/80 border rounded-md shadow-lg"><p className="label text-sm font-bold">{`${label}`}</p>{payload.map((pld) => <p key={String(pld.dataKey)} style={{ color: pld.color }} className="text-sm">{`${pld.name}: ${pld.value}`}</p>)}</div>);
    }
    return null;
  };

  // Renderizar conteúdo do modal
  const renderModalContent = () => {
    if (!avaliacaoSelecionada) return null;

    const imcClass = getIMCClassification(avaliacaoSelecionada.imc);

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Fotos */}
        <Card>
          <CardHeader><CardTitle>Fotos da Avaliação</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {['frente', 'lado', 'costas'].map(tipo => (
                <div key={tipo} className="flex flex-col items-center space-y-2">
                  <h4 className="font-medium capitalize">{tipo}</h4>
                  <div className="w-full h-48 md:w-64 md:h-64 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {isLoadingImages ? (
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    ) : avaliacaoSelecionada[`foto_${tipo}_url` as keyof AvaliacaoFisica] ? (
                      imageUrls[tipo as 'frente' | 'lado' | 'costas'] ? (
                        <img
                          src={imageUrls[tipo as 'frente' | 'lado' | 'costas']}
                          alt={`Foto ${tipo}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">Erro ao carregar</span>
                      )
                    ) : (
                      <div className="flex flex-col items-center">
                        <Camera className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Sem foto</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Medidas Principais */}
        <Card>
          <CardHeader><CardTitle>Medidas Principais</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Peso</p>
                <p className="text-2xl font-bold">{avaliacaoSelecionada.peso} kg</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Altura</p>
                <p className="text-2xl font-bold">{avaliacaoSelecionada.altura} cm</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">IMC</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold">{avaliacaoSelecionada.imc.toFixed(1)}</p>
                  <Badge className={`${imcClass.color} text-white`}>{imcClass.text}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medidas Corporais Detalhadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader><CardTitle>Medidas do Tronco</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Peito/Busto</p><p className="font-semibold">{avaliacaoSelecionada.peito_busto ? `${avaliacaoSelecionada.peito_busto} cm` : '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">Cintura</p><p className="font-semibold">{avaliacaoSelecionada.cintura ? `${avaliacaoSelecionada.cintura} cm` : '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">Quadril</p><p className="font-semibold">{avaliacaoSelecionada.quadril ? `${avaliacaoSelecionada.quadril} cm` : '—'}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Membros Superiores</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><h4 className="font-medium mb-2">Braços</h4><div className="grid grid-cols-3 gap-2 text-sm"><div><p className="text-muted-foreground">Direito</p><p className="font-semibold">{avaliacaoSelecionada.braco_direito ? `${avaliacaoSelecionada.braco_direito} cm` : '—'}</p></div><div><p className="text-muted-foreground">Esquerdo</p><p className="font-semibold">{avaliacaoSelecionada.braco_esquerdo ? `${avaliacaoSelecionada.braco_esquerdo} cm` : '—'}</p></div><div><p className="text-muted-foreground">Diferença</p><p className="font-semibold">{calcularDiferenca(avaliacaoSelecionada.braco_direito, avaliacaoSelecionada.braco_esquerdo) ? `${calcularDiferenca(avaliacaoSelecionada.braco_direito, avaliacaoSelecionada.braco_esquerdo)} cm` : '—'}</p></div></div></div>
              <div><h4 className="font-medium mb-2">Antebraços</h4><div className="grid grid-cols-3 gap-2 text-sm"><div><p className="text-muted-foreground">Direito</p><p className="font-semibold">{avaliacaoSelecionada.antebraco_direito ? `${avaliacaoSelecionada.antebraco_direito} cm` : '—'}</p></div><div><p className="text-muted-foreground">Esquerdo</p><p className="font-semibold">{avaliacaoSelecionada.antebraco_esquerdo ? `${avaliacaoSelecionada.antebraco_esquerdo} cm` : '—'}</p></div><div><p className="text-muted-foreground">Diferença</p><p className="font-semibold">{calcularDiferenca(avaliacaoSelecionada.antebraco_direito, avaliacaoSelecionada.antebraco_esquerdo) ? `${calcularDiferenca(avaliacaoSelecionada.antebraco_direito, avaliacaoSelecionada.antebraco_esquerdo)} cm` : '—'}</p></div></div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Membros Inferiores</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><h4 className="font-medium mb-2">Coxas</h4><div className="grid grid-cols-3 gap-2 text-sm"><div><p className="text-muted-foreground">Direita</p><p className="font-semibold">{avaliacaoSelecionada.coxa_direita ? `${avaliacaoSelecionada.coxa_direita} cm` : '—'}</p></div><div><p className="text-muted-foreground">Esquerda</p><p className="font-semibold">{avaliacaoSelecionada.coxa_esquerda ? `${avaliacaoSelecionada.coxa_esquerda} cm` : '—'}</p></div><div><p className="text-muted-foreground">Diferença</p><p className="font-semibold">{calcularDiferenca(avaliacaoSelecionada.coxa_direita, avaliacaoSelecionada.coxa_esquerda) ? `${calcularDiferenca(avaliacaoSelecionada.coxa_direita, avaliacaoSelecionada.coxa_esquerda)} cm` : '—'}</p></div></div></div>
              <div><h4 className="font-medium mb-2">Panturrilhas</h4><div className="grid grid-cols-3 gap-2 text-sm"><div><p className="text-muted-foreground">Direita</p><p className="font-semibold">{avaliacaoSelecionada.panturrilha_direita ? `${avaliacaoSelecionada.panturrilha_direita} cm` : '—'}</p></div><div><p className="text-muted-foreground">Esquerda</p><p className="font-semibold">{avaliacaoSelecionada.panturrilha_esquerda ? `${avaliacaoSelecionada.panturrilha_esquerda} cm` : '—'}</p></div><div><p className="text-muted-foreground">Diferença</p><p className="font-semibold">{calcularDiferenca(avaliacaoSelecionada.panturrilha_direita, avaliacaoSelecionada.panturrilha_esquerda) ? `${calcularDiferenca(avaliacaoSelecionada.panturrilha_direita, avaliacaoSelecionada.panturrilha_esquerda)} cm` : '—'}</p></div></div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Análise de Simetria</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm">Simetria dos Braços</span><span className="font-semibold">{calcularSimetria(avaliacaoSelecionada.braco_direito, avaliacaoSelecionada.braco_esquerdo) ? `${calcularSimetria(avaliacaoSelecionada.braco_direito, avaliacaoSelecionada.braco_esquerdo)}%` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-sm">Simetria das Coxas</span><span className="font-semibold">{calcularSimetria(avaliacaoSelecionada.coxa_direita, avaliacaoSelecionada.coxa_esquerda) ? `${calcularSimetria(avaliacaoSelecionada.coxa_direita, avaliacaoSelecionada.coxa_esquerda)}%` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-sm">Simetria dos Antebraços</span><span className="font-semibold">{calcularSimetria(avaliacaoSelecionada.antebraco_direito, avaliacaoSelecionada.antebraco_esquerdo) ? `${calcularSimetria(avaliacaoSelecionada.antebraco_direito, avaliacaoSelecionada.antebraco_esquerdo)}%` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-sm">Simetria das Panturrilhas</span><span className="font-semibold">{calcularSimetria(avaliacaoSelecionada.panturrilha_direita, avaliacaoSelecionada.panturrilha_esquerda) ? `${calcularSimetria(avaliacaoSelecionada.panturrilha_direita, avaliacaoSelecionada.panturrilha_esquerda)}%` : '—'}</span></div>
              </div>
              <div className="mt-4 p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground"><strong>Referência:</strong> &gt;95% = Excelente • 90-95% = Bom • &lt;90% = Atenção</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Observações */}
        {avaliacaoSelecionada.observacoes && (
          <Card>
            <CardHeader><CardTitle>Observações do Professor</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                {avaliacaoSelecionada.observacoes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Carregando avaliações...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      {isDesktop && (
        <div>
          <h1 className="text-3xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground">
            Acompanhe sua evolução física
          </p>
        </div>
      )}

      <Tabs defaultValue="historico" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="fotos">Antes X Depois</TabsTrigger>
        </TabsList>

        <TabsContent value="historico">
          <Card>
            <CardContent className="pt-6">
              {avaliacoes.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhuma avaliação encontrada</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  {avaliacoes.map((avaliacao) => {
                    const imcClass = getIMCClassification(avaliacao.imc);
                    return (
                      <div key={avaliacao.id} className="border rounded-lg p-4 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{formatters.date(avaliacao.data_avaliacao)}</span></div>
                          {isDesktop ? (
                            <Button size="sm" onClick={() => handleVerDetalhes(avaliacao)}>
                              Detalhes
                            </Button>
                          ) : (
                            <Button variant="outline" size="icon" onClick={() => handleVerDetalhes(avaliacao)} className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Detalhes</span>
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><p className="text-sm text-muted-foreground">Peso</p><p className="font-semibold">{avaliacao.peso} kg</p></div>
                          <div><p className="text-sm text-muted-foreground">Altura</p><p className="font-semibold">{avaliacao.altura} cm</p></div>
                          <div><p className="text-sm text-muted-foreground">IMC</p><div className="flex items-center gap-2"><span className="font-semibold">{avaliacao.imc.toFixed(1)}</span><Badge className={`${imcClass.color} text-white text-xs`}>{imcClass.text}</Badge></div></div>
                          <div><p className="text-sm text-muted-foreground">Fotos</p><p className="font-semibold">{[avaliacao.foto_frente_url, avaliacao.foto_lado_url, avaliacao.foto_costas_url].filter(Boolean).length}/3</p></div>
                        </div>
                        {avaliacao.observacoes && <div className="mt-3 pt-3 border-t"><p className="text-xs text-muted-foreground mb-1">Observações:</p><p className="text-sm text-muted-foreground line-clamp-2">{avaliacao.observacoes}</p></div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graficos">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-3"><LineChartIcon className="h-5 w-5" />Gráficos</CardTitle></CardHeader>
            <CardContent className="space-y-8 pt-2">
              {avaliacoes.length > 1 ? (
                <>
                  <div className="space-y-2 rounded-lg border p-4 bg-muted/30"><Label htmlFor="date-range-select" className="font-medium">Período de Análise</Label><div className="flex items-center gap-2"><Select value={String(startDateIndex)} onValueChange={(value) => setStartDateIndex(Number(value))}><SelectTrigger id="date-range-select" className="w-[180px]"><SelectValue placeholder="Data Inicial" /></SelectTrigger><SelectContent>{chartData.slice(0, -1).map((data, index) => (<SelectItem key={index} value={String(index)}>{data.name}</SelectItem>))}</SelectContent></Select><span className="text-muted-foreground">até</span><div className="px-3 py-2 border rounded-md bg-background text-sm font-medium">{chartData[chartData.length - 1]?.name || '--'}</div></div></div>
                  <div>
                    <h4 className="font-medium mb-2">Peso e IMC</h4>
                    <div className="flex flex-wrap gap-2 mb-4">{lineOptions.pesoImc.map(line => (<Badge key={line.dataKey} onClick={() => toggleLine('pesoImc', line.dataKey)} variant={activeLines.pesoImc.includes(line.dataKey) ? 'default' : 'outline'} className="cursor-pointer transition-all" style={activeLines.pesoImc.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}>{line.name}</Badge>))}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">{activeLines.pesoImc.includes('peso') && renderTotalDifference('peso', 'Peso', 'kg')}{activeLines.pesoImc.includes('imc') && renderTotalDifference('imc', 'IMC', '')}</div>
                    <ResponsiveContainer width="100%" height={300}><LineChart data={filteredChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis yAxisId="left" stroke="#8884d8" fontSize={12} tickLine={false} axisLine={false} /><YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={12} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} />{activeLines.pesoImc.includes('peso') && <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#8884d8" activeDot={{ r: 8 }} />}{activeLines.pesoImc.includes('imc') && <Line yAxisId="right" type="monotone" dataKey="imc" name="IMC" stroke="#82ca9d" />}</LineChart></ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Tronco (cm)</h4>
                    <div className="flex flex-wrap gap-2 mb-4">{lineOptions.tronco.map(line => (<Badge key={line.dataKey} onClick={() => toggleLine('tronco', line.dataKey)} variant={activeLines.tronco.includes(line.dataKey) ? 'default' : 'outline'} className="cursor-pointer transition-all" style={activeLines.tronco.includes(line.dataKey) ? { backgroundColor: line.color, color: 'white' } : { borderColor: line.color, color: line.color }}>{line.name}</Badge>))}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">{activeLines.tronco.includes('peito') && renderTotalDifference('peito', 'Peito', 'cm')}{activeLines.tronco.includes('cintura') && renderTotalDifference('cintura', 'Cintura', 'cm')}{activeLines.tronco.includes('quadril') && renderTotalDifference('quadril', 'Quadril', 'cm')}</div>
                    <ResponsiveContainer width="100%" height={300}><LineChart data={filteredChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} />{activeLines.tronco.includes('peito') && <Line type="monotone" dataKey="peito" name="Peito" stroke="#8884d8" />}{activeLines.tronco.includes('cintura') && <Line type="monotone" dataKey="cintura" name="Cintura" stroke="#82ca9d" />}{activeLines.tronco.includes('quadril') && <Line type="monotone" dataKey="quadril" name="Quadril" stroke="#ffc658" />}</LineChart></ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <LineChartIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Poucos dados para análise</h3>
                  <p className="text-muted-foreground">É necessário ter pelo menos duas avaliações para exibir os gráficos de evolução.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fotos">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-3"><Camera className="h-5 w-5" />Antes X Depois</CardTitle></CardHeader>
            <CardContent className="space-y-6 pt-2">
              {avaliacoes.length > 1 ? (
                <>
                  <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
                    <Label htmlFor="image-comparison-select" className="font-medium">Antes X Depois</Label>
                    <div className="flex items-center gap-2">
                      <Select value={avaliacaoInicialImagem?.id || ''} onValueChange={(id) => { const avaliacaoSelecionada = avaliacoes.find(a => a.id === id); setAvaliacaoInicialImagem(avaliacaoSelecionada || null); }}>
                        <SelectTrigger id="image-comparison-select" className="w-[180px]"><SelectValue placeholder="Data Inicial" /></SelectTrigger>
                        <SelectContent>{avaliacoes.slice(1).map(a => (<SelectItem key={a.id} value={a.id}>{formatters.date(a.data_avaliacao)}</SelectItem>))}</SelectContent>
                      </Select>
                      <span className="text-muted-foreground">X</span>
                      <div className="px-3 py-2 border rounded-md bg-background text-sm font-medium">{avaliacoes[0] ? formatters.date(avaliacoes[0].data_avaliacao) : '--'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['frente', 'lado', 'costas'] as const).map(tipo => (
                      <div key={tipo} className="space-y-4">
                        <h4 className="font-semibold text-center capitalize">Foto de {tipo}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">{urlsAssinadas.inicial[tipo] ? <img src={urlsAssinadas.inicial[tipo]!} alt={`Inicial ${tipo}`} className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">Sem imagem</span>}</div>
                            <p className="text-xs text-center text-muted-foreground">{avaliacaoInicialImagem ? formatters.date(avaliacaoInicialImagem.data_avaliacao) : 'N/A'}</p>
                          </div>
                          <div className="space-y-2">
                            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">{urlsAssinadas.final[tipo] ? <img src={urlsAssinadas.final[tipo]!} alt={`Final ${tipo}`} className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">Sem imagem</span>}</div>
                            <p className="text-xs text-center text-muted-foreground">{avaliacoes[0] ? formatters.date(avaliacoes[0].data_avaliacao) : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                  <div className="text-center py-12">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Poucas avaliações</h3>
                    <p className="text-muted-foreground">É necessário ter pelo menos duas avaliações com imagens para fazer a comparação.</p>
                  </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Unificado com react-modal */}
      <Modal
        isOpen={modalVisible}
        onRequestClose={handleFecharModal}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className="bg-white rounded-lg shadow-xl flex flex-col max-w-4xl w-full max-h-[90vh] outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">
            Avaliação de {avaliacaoSelecionada?.data_avaliacao.split('-').reverse().join('/')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFecharModal}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
        <div className="p-4 overflow-y-auto">
          {renderModalContent()}
        </div>
      </Modal>
    </div>
  );
};

export default AvaliacoesAluno;