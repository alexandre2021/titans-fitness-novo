// pages/DetalhesExercicio.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, Copy, Edit, Image, Video, Youtube, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Exercicio = Tables<"exercicios">;

const DetalhesExercicio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [exercicio, setExercicio] = useState<Exercicio | null>(null);

  // Mock temporário para user e profile
  const user = { id: 'temp-user-id' };
  const profile = { limite_exercicios: 10 };

  // Carregar exercício
  useEffect(() => {
    const fetchExercicio = async () => {
      if (!id) {
        navigate('/exercicios-pt');
        return;
      }

      try {
        const { data: exercicio, error } = await supabase
          .from('exercicios')
          .select('*')
          .eq('id', id)
          .eq('is_ativo', true)
          .single();

        if (error) throw error;
        if (!exercicio) throw new Error('Exercício não encontrado');

        // Verificar se é exercício personalizado e se pertence ao PT
        if (exercicio.tipo === 'personalizado' && exercicio.pt_id !== user?.id) {
          throw new Error('Você não tem permissão para ver este exercício');
        }

        setExercicio(exercicio);
        console.log('✅ Exercício carregado:', exercicio);
        
      } catch (error) {
        console.error('❌ Erro ao carregar exercício:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes do exercício.",
          variant: "destructive",
        });
        navigate('/exercicios-pt');
      } finally {
        setLoading(false);
      }
    };

    fetchExercicio();
  }, [id, navigate, toast]); // Removido 'user' das dependências

  const handleCriarCopia = () => {
    if (!exercicio || !profile) return;

    // Verificar limite do plano (só para exercícios padrão)
    if (exercicio.tipo === 'padrao') {
      // Buscar quantos exercícios personalizados o PT já tem
      const checkLimitAndNavigate = async () => {
        try {
          const { data, error } = await supabase
            .from('exercicios')
            .select('id')
            .eq('pt_id', user?.id)
            .eq('tipo', 'personalizado')
            .eq('is_ativo', true);

          if (error) throw error;

          const totalPersonalizados = data?.length || 0;

          if (totalPersonalizados >= profile.limite_exercicios) {
            toast({
              title: "Limite atingido",
              description: `Você atingiu o limite de ${profile.limite_exercicios} exercícios personalizados do seu plano atual.`,
              variant: "destructive",
            });
            return;
          }

          navigate(`/exercicios-pt/copia/${exercicio.id}`);
        } catch (error) {
          console.error('❌ Erro ao verificar limite:', error);
        }
      };

      checkLimitAndNavigate();
    }
  };

  const handleEditar = () => {
    if (!exercicio) return;
    navigate(`/exercicios-pt/editar/${exercicio.id}`);
  };

  const getDifficultyColor = (dificuldade: string | null) => {
    switch (dificuldade?.toLowerCase()) {
      case 'baixa':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'média':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'alta':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeColor = (tipo: string | null) => {
    switch (tipo) {
      case 'padrao':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'personalizado':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/exercicios-pt')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes do Exercício</h1>
            <p className="text-muted-foreground">Carregando exercício...</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exercicio) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/exercicios-pt')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Erro</h1>
            <p className="text-muted-foreground">Exercício não encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/exercicios-pt')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Eye className="h-8 w-8" />
              {exercicio.nome}
            </h1>
            <p className="text-muted-foreground">
              Detalhes completos do exercício
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {exercicio.tipo === 'padrao' && (
            <Button onClick={handleCriarCopia} className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Criar Cópia
            </Button>
          )}
          {exercicio.tipo === 'personalizado' && exercicio.pt_id === user?.id && (
            <Button onClick={handleEditar} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informações principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info básica */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                <p className="text-lg font-semibold">{exercicio.nome}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                <p className="text-base">{exercicio.descricao || 'Sem descrição'}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Grupo Muscular</Label>
                  <p className="text-base font-medium">{exercicio.grupo_muscular}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Equipamento</Label>
                  <p className="text-base font-medium">{exercicio.equipamento}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instruções */}
          <Card>
            <CardHeader>
              <CardTitle>Instruções de Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-base leading-relaxed">
                {exercicio.instrucoes || 'Instruções não disponíveis'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tags e classificação */}
          <Card>
            <CardHeader>
              <CardTitle>Classificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={getDifficultyColor(exercicio.dificuldade)}>
                  {exercicio.dificuldade || 'Não definida'}
                </Badge>
                <Badge className={getTypeColor(exercicio.tipo)}>
                  {exercicio.tipo === 'padrao' ? 'Exercício Padrão' : 'Personalizado'}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
                  <p className="text-sm">
                    {exercicio.created_at ? new Date(exercicio.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                
                {exercicio.tipo === 'personalizado' && exercicio.exercicio_padrao_id && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Baseado em</Label>
                    <p className="text-sm">Exercício Padrão</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mídias */}
          <Card>
            <CardHeader>
              <CardTitle>Mídias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Imagens */}
              {(exercicio.imagem_1_url || exercicio.imagem_2_url) && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                    <Image className="h-4 w-4" />
                    Imagens
                  </Label>
                  <div className="space-y-2">
                    {exercicio.imagem_1_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => window.open(exercicio.imagem_1_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Primeira Imagem
                      </Button>
                    )}
                    {exercicio.imagem_2_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => window.open(exercicio.imagem_2_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Segunda Imagem
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Vídeo */}
              {exercicio.video_url && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                    <Video className="h-4 w-4" />
                    Vídeo
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(exercicio.video_url!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Assistir Vídeo
                  </Button>
                </div>
              )}

              {/* YouTube */}
              {exercicio.youtube_url && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                    <Youtube className="h-4 w-4" />
                    YouTube
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(exercicio.youtube_url!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver no YouTube
                  </Button>
                </div>
              )}

              {!exercicio.imagem_1_url && !exercicio.imagem_2_url && !exercicio.video_url && !exercicio.youtube_url && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma mídia disponível
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetalhesExercicio;