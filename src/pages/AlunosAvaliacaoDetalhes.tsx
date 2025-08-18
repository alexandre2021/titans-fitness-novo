import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Camera, Calendar } from 'lucide-react';
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

const AlunosAvaliacaoDetalhes = () => {
  const GET_IMAGE_URL_ENDPOINT = 'https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/get-image-url';

  const { id, avaliacaoId } = useParams<{ id: string; avaliacaoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados principais
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [avaliacao, setAvaliacao] = useState<AvaliacaoFisica | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados das imagens
  const [imageUrls, setImageUrls] = useState<{ 
    frente?: string; 
    lado?: string; 
    costas?: string; 
  }>({});
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Função para obter URL assinada da imagem
  async function getImageUrl(filename: string): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Usuário não autenticado");
      }
      
      const response = await fetch(GET_IMAGE_URL_ENDPOINT, {
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
        const errorText = await response.text();
        throw new Error(`Erro ao obter URL da imagem: ${response.status} - ${errorText}`);
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
  }

  // Função para carregar imagens da avaliação
  const loadImages = useCallback(async (avaliacao: AvaliacaoFisica) => {
    setIsLoadingImages(true);
    setImageUrls({});
    
    try {
      const urls: { frente?: string; lado?: string; costas?: string } = {};
      
      // Carregar imagem frente se existir
      if (avaliacao.foto_frente_url) {
        try {
          let filename = avaliacao.foto_frente_url;
          if (filename.includes('/')) {
            filename = filename.split('/').pop()?.split('?')[0] || filename;
          }
          
          if (filename) {
            const url = await getImageUrl(filename);
            urls.frente = url;
          }
        } catch (error) {
          console.error('Erro ao carregar imagem frente:', error);
        }
      }
      
      // Carregar imagem lado se existir
      if (avaliacao.foto_lado_url) {
        try {
          let filename = avaliacao.foto_lado_url;
          if (filename.includes('/')) {
            filename = filename.split('/').pop()?.split('?')[0] || filename;
          }
          
          if (filename) {
            const url = await getImageUrl(filename);
            urls.lado = url;
          }
        } catch (error) {
          console.error('Erro ao carregar imagem lado:', error);
        }
      }
      
      // Carregar imagem costas se existir
      if (avaliacao.foto_costas_url) {
        try {
          let filename = avaliacao.foto_costas_url;
          if (filename.includes('/')) {
            filename = filename.split('/').pop()?.split('?')[0] || filename;
          }
          
          if (filename) {
            const url = await getImageUrl(filename);
            urls.costas = url;
          }
        } catch (error) {
          console.error('Erro ao carregar imagem costas:', error);
        }
      }
      
      setImageUrls(urls);
    } catch (error) {
      console.error('Erro geral ao carregar imagens:', error);
    } finally {
      setIsLoadingImages(false);
    }
  }, []);

  // useEffect para buscar dados
  useEffect(() => {
    const fetchDados = async () => {
      if (!id || !avaliacaoId || !user) return;

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

        // Buscar avaliação específica
        const { data: avaliacaoData, error: avaliacaoError } = await supabase
          .from('avaliacoes_fisicas')
          .select('*')
          .eq('id', avaliacaoId)
          .eq('aluno_id', id)
          .single();

        if (avaliacaoError) {
          console.error('Erro ao buscar avaliação:', avaliacaoError);
          toast({
            title: "Erro",
            description: "Avaliação não encontrada.",
            variant: "destructive",
          });
          navigate(`/alunos-avaliacoes/${id}`);
          return;
        }

        setAvaliacao(avaliacaoData);

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [id, avaliacaoId, user, navigate, toast]);

  // Carregar imagens quando avaliação for carregada
  useEffect(() => {
    if (avaliacao) {
      loadImages(avaliacao);
    }
  }, [avaliacao, loadImages]);

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

  const calcularDiferenca = (direito?: number, esquerdo?: number) => {
    if (!direito || !esquerdo) return null;
    return Math.abs(direito - esquerdo).toFixed(1);
  };

  const calcularSimetria = (direito?: number, esquerdo?: number) => {
    if (!direito || !esquerdo) return null;
    const diferenca = Math.abs(direito - esquerdo);
    const maior = Math.max(direito, esquerdo);
    const simetria = 100 - (diferenca / maior * 100);
    return simetria.toFixed(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/alunos-avaliacoes/${id}`)}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes da Avaliação</h1>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!aluno || !avaliacao) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/alunos-avaliacoes/${id}`)}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Detalhes da Avaliação</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Avaliação não encontrada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imcClass = getIMCClassification(avaliacao.imc);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/alunos-avaliacoes/${id}`)}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Avaliação de {formatters.date(avaliacao.data_avaliacao)}</h1>
          <p className="text-muted-foreground">Detalhes completos da avaliação física</p>
        </div>
      </div>

      {/* Informações do Aluno */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                {renderAvatar()}
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{aluno.nome_completo}</h3>
                <p className="text-sm text-muted-foreground">{aluno.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatters.date(avaliacao.data_avaliacao)}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Fotos */}
      <Card>
        <CardHeader>
          <CardTitle>Fotos da Avaliação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['frente', 'lado', 'costas'].map(tipo => (
              <div key={tipo} className="flex flex-col items-center space-y-2">
                <h4 className="font-medium capitalize">{tipo}</h4>
                <div className="w-64 h-64 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {isLoadingImages ? (
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  ) : avaliacao[`foto_${tipo}_url` as keyof AvaliacaoFisica] ? (
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
                      <Camera className="w-12 h-12 text-muted-foreground mb-2" />
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
        <CardHeader>
          <CardTitle>Medidas Principais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Peso</p>
              <p className="text-2xl font-bold">{avaliacao.peso} kg</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Altura</p>
              <p className="text-2xl font-bold">{avaliacao.altura} cm</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">IMC</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-bold">{avaliacao.imc.toFixed(1)}</p>
                <Badge className={`${imcClass.color} text-white`}>
                  {imcClass.text}
                </Badge>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="text-lg font-semibold">{formatters.date(avaliacao.data_avaliacao)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medidas Corporais Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tronco */}
        <Card>
          <CardHeader>
            <CardTitle>Medidas do Tronco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Peito/Busto</p>
                <p className="font-semibold">{avaliacao.peito_busto ? `${avaliacao.peito_busto} cm` : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cintura</p>
                <p className="font-semibold">{avaliacao.cintura ? `${avaliacao.cintura} cm` : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quadril</p>
                <p className="font-semibold">{avaliacao.quadril ? `${avaliacao.quadril} cm` : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membros Superiores */}
        <Card>
          <CardHeader>
            <CardTitle>Membros Superiores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Braços */}
            <div>
              <h4 className="font-medium mb-2">Braços</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Direito</p>
                  <p className="font-semibold">{avaliacao.braco_direito ? `${avaliacao.braco_direito} cm` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Esquerdo</p>
                  <p className="font-semibold">{avaliacao.braco_esquerdo ? `${avaliacao.braco_esquerdo} cm` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Diferença</p>
                  <p className="font-semibold">
                    {calcularDiferenca(avaliacao.braco_direito, avaliacao.braco_esquerdo) ? 
                      `${calcularDiferenca(avaliacao.braco_direito, avaliacao.braco_esquerdo)} cm` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Antebraços */}
            <div>
              <h4 className="font-medium mb-2">Antebraços</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Direito</p>
                  <p className="font-semibold">{avaliacao.antebraco_direito ? `${avaliacao.antebraco_direito} cm` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Esquerdo</p>
                  <p className="font-semibold">{avaliacao.antebraco_esquerdo ? `${avaliacao.antebraco_esquerdo} cm` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Diferença</p>
                  <p className="font-semibold">
                    {calcularDiferenca(avaliacao.antebraco_direito, avaliacao.antebraco_esquerdo) ? 
                      `${calcularDiferenca(avaliacao.antebraco_direito, avaliacao.antebraco_esquerdo)} cm` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membros Inferiores */}
        <Card>
          <CardHeader>
            <CardTitle>Membros Inferiores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coxas */}
            <div>
              <h4 className="font-medium mb-2">Coxas</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Direita</p>
                  <p className="font-semibold">{avaliacao.coxa_direita ? `${avaliacao.coxa_direita} cm` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Esquerda</p>
                  <p className="font-semibold">{avaliacao.coxa_esquerda ? `${avaliacao.coxa_esquerda} cm` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Diferença</p>
                  <p className="font-semibold">
                    {calcularDiferenca(avaliacao.coxa_direita, avaliacao.coxa_esquerda) ? 
                      `${calcularDiferenca(avaliacao.coxa_direita, avaliacao.coxa_esquerda)} cm` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Panturrilhas */}
            <div>
              <h4 className="font-medium mb-2">Panturrilhas</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Direita</p>
                  <p className="font-semibold">{avaliacao.panturrilha_direita ? `${avaliacao.panturrilha_direita} cm` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Esquerda</p>
                  <p className="font-semibold">{avaliacao.panturrilha_esquerda ? `${avaliacao.panturrilha_esquerda} cm` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Diferença</p>
                  <p className="font-semibold">
                    {calcularDiferenca(avaliacao.panturrilha_direita, avaliacao.panturrilha_esquerda) ? 
                      `${calcularDiferenca(avaliacao.panturrilha_direita, avaliacao.panturrilha_esquerda)} cm` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análise de Simetria */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Simetria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Simetria dos Braços</span>
                <span className="font-semibold">
                  {calcularSimetria(avaliacao.braco_direito, avaliacao.braco_esquerdo) ? 
                    `${calcularSimetria(avaliacao.braco_direito, avaliacao.braco_esquerdo)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Simetria das Coxas</span>
                <span className="font-semibold">
                  {calcularSimetria(avaliacao.coxa_direita, avaliacao.coxa_esquerda) ? 
                    `${calcularSimetria(avaliacao.coxa_direita, avaliacao.coxa_esquerda)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Simetria dos Antebraços</span>
                <span className="font-semibold">
                  {calcularSimetria(avaliacao.antebraco_direito, avaliacao.antebraco_esquerdo) ? 
                    `${calcularSimetria(avaliacao.antebraco_direito, avaliacao.antebraco_esquerdo)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Simetria das Panturrilhas</span>
                <span className="font-semibold">
                  {calcularSimetria(avaliacao.panturrilha_direita, avaliacao.panturrilha_esquerda) ? 
                    `${calcularSimetria(avaliacao.panturrilha_direita, avaliacao.panturrilha_esquerda)}%` : '—'}
                </span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Referência:</strong> &gt;95% = Excelente • 90-95% = Bom • &lt;90% = Atenção
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Observações */}
      {avaliacao.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
              {avaliacao.observacoes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AlunosAvaliacaoDetalhes;