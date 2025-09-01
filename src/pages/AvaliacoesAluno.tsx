// ✅ ESTE COMPONENTE É PARA A VISÃO DO ALUNO LOGADO
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Activity, Calendar, Eye, Camera, X, TrendingUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

const AvaliacoesAluno = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Estados principais
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFisica[]>([]);
  const [loading, setLoading] = useState(true);
  
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
  const getImageUrl = useCallback(async (filename: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Usuário não autenticado");
      }
      
      const response = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/get-image-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          filename,
          bucket_type: 'avaliacoes'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao obter URL da imagem: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success || !result.url) {
        throw new Error('URL não retornada pelo servidor');
      }
      
      return result.url;
    } catch (error) {
      console.error('Erro ao obter URL da imagem:', error);
      throw error;
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
          toast({
            title: "Erro",
            description: "Não foi possível carregar suas avaliações.",
            variant: "destructive",
          });
          return;
        }

        setAvaliacoes(data || []);
      } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
        toast({
          title: "Erro",
          description: "Erro inesperado ao carregar dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAvaliacoes();
  }, [user, toast]);

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="text-lg font-semibold">{avaliacaoSelecionada.data_avaliacao.split('-').reverse().join('/')}</p>
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
            <CardHeader><CardTitle>Observações do Personal</CardTitle></CardHeader>
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
        <div>
          <h1 className="text-3xl font-bold">Minhas Avaliações</h1>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e evolução física
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-lg text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:p-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold">Minhas Avaliações</h1>
        <p className="text-muted-foreground">
          Acompanhe seu progresso e evolução física
        </p>
      </div>

      {avaliacoes.length === 0 ? (
        /* Estado vazio */
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação ainda</h3>
            <p className="text-muted-foreground">
              Suas avaliações físicas aparecerão aqui quando realizadas pelo seu Personal Trainer.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card de Evolução de Peso */}
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
                <Activity className="h-5 w-5" />
                Histórico de Avaliações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {avaliacoes.map((avaliacao) => {
                  const imcClass = getIMCClassification(avaliacao.imc);
                  return (
                    <div 
                      key={avaliacao.id} 
                      className="border rounded-lg p-4 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {avaliacao.data_avaliacao.split('-').reverse().join('/')}
                          </span>
                        </div>
                        {isMobile ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVerDetalhes(avaliacao)}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerDetalhes(avaliacao)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Detalhes
                          </Button>
                        )}
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
                        <div>
                          <p className="text-sm text-muted-foreground">Fotos</p>
                          <p className="font-semibold">
                            {[avaliacao.foto_frente_url, avaliacao.foto_lado_url, avaliacao.foto_costas_url]
                              .filter(Boolean).length}/3
                          </p>
                        </div>
                      </div>

                      {/* Preview das observações */}
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Responsivo */}
      {isMobile ? (
        /* Mobile: Drawer */
        <Drawer open={modalVisible} onOpenChange={setModalVisible}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="relative text-left">
              <DrawerTitle className="text-lg font-semibold">
                Avaliação de {avaliacaoSelecionada?.data_avaliacao.split('-').reverse().join('/')}
              </DrawerTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFecharModal}
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              {renderModalContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        /* Desktop: Dialog */
        <Dialog open={modalVisible} onOpenChange={setModalVisible}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Avaliação de {avaliacaoSelecionada?.data_avaliacao.split('-').reverse().join('/')}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              {renderModalContent()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AvaliacoesAluno;