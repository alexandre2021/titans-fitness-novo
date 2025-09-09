// Regra de Avaliações:
// Um aluno pode ter no máximo 4 avaliações físicas ativas.
// Ao criar uma nova avaliação (a 5ª ou mais), a avaliação mais antiga é automaticamente excluída.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Camera, X, Save, Upload, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatters } from '@/utils/formatters';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface NovaAvaliacaoForm {
  peso: number;
  altura: number;
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
}

const AlunosAvaliacaoNova = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados principais
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  // Limpeza de storage ao sair da página (voltar do navegador ou fechar aba)
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('novaAvaliacaoForm');
      localStorage.removeItem('novaAvaliacaoImagens');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Função para limpar storage e navegar para lista de avaliações do aluno
  const handleCancelar = () => {
    localStorage.removeItem('novaAvaliacaoForm');
    localStorage.removeItem('novaAvaliacaoImagens');
    navigate(`/alunos-avaliacoes/${id}`);
  };
  
  // Estados das imagens
  const [imageFiles, setImageFiles] = useState<{
    frente?: File;
    lado?: File;
    costas?: File;
  }>({});

  const form = useForm<NovaAvaliacaoForm>();

  // Função para deletar imagens de uma avaliação
  const deletarImagensDaAvaliacao = async (avaliacao: AvaliacaoFisica) => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const urlsParaDeletar = [
      avaliacao.foto_frente_url,
      avaliacao.foto_lado_url,
      avaliacao.foto_costas_url,
    ].filter(Boolean) as string[];

    if (urlsParaDeletar.length === 0) {
      console.log(`ℹ️ Nenhuma imagem para deletar na avaliação antiga ${avaliacao.id}.`);
      return;
    }

    console.log(`🗑️ Tentando deletar ${urlsParaDeletar.length} imagens da avaliação ${avaliacao.id}:`, urlsParaDeletar);

    const promises = urlsParaDeletar.map(filename => {
      if (!filename) return Promise.resolve();

      // ✅ CORREÇÃO: A chave no body foi alterada de 'file_url' para 'filename'.
      return fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/delete-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          filename: filename,
          bucket_type: 'avaliacoes'
        })
      });
    });
    
    try {
      const results = await Promise.allSettled(promises);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`✅ Imagem ${urlsParaDeletar[index]} deletada com sucesso.`);
        } else {
          console.error(`❌ Falha ao deletar imagem ${urlsParaDeletar[index]}:`, result.reason);
        }
      });
    } catch (err) {
      console.error("Erro geral ao deletar imagens:", err);
    }
  };

  // useEffect para buscar dados do aluno e avaliações existentes
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

  const calcularIMC = (peso: number, altura: number) => {
    const alturaM = altura / 100;
    return peso / (alturaM * alturaM);
  };

  // ✅ NOVA FUNÇÃO: Redimensiona e otimiza a imagem no cliente
  const resizeImageFile = (file: File, maxWidth = 640): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          const resizedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(resizedFile);
        }, 'image/jpeg', 0.85);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // ✅ NOVA FUNÇÃO: Faz o upload direto para o R2 usando URL pré-assinada
  const uploadFile = async (file: File | null): Promise<string | null> => {
    if (!file) return null;
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const uniqueFilename = `av_${user.id}_${Date.now()}_${file.name.replace(/\s/g, '_')}`;

      const { data: presignedData, error: presignedError } = await supabase.functions.invoke('upload-media', {
        body: {
          action: 'generate_upload_url',
          filename: uniqueFilename,
          contentType: file.type,
          bucket_type: 'avaliacoes'
        }
      });

      if (presignedError || !presignedData.signedUrl) {
        throw new Error(presignedError?.message || 'Não foi possível obter a URL de upload.');
      }

      const uploadResponse = await fetch(presignedData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error('Falha no upload direto para o R2.');
      }

      return presignedData.path;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro no upload:", error);
      toast({
        title: "Falha no Upload",
        description: `Erro ao enviar o arquivo: ${errorMessage}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  const salvarAvaliacao = async (data: NovaAvaliacaoForm) => {
    setSaving(true);
    toast({ title: "Processando", description: "Salvando avaliação e otimizando imagens..." });

    try {
      const imc = calcularIMC(data.peso, data.altura);
      const hoje = new Date().toISOString().split('T')[0];

      // Lógica FIFO Robusta: buscar avaliações e remover o excedente para manter o limite de 4.
      const { data: avaliacoesAtuais, error: fetchError } = await supabase
        .from('avaliacoes_fisicas')
        .select('*')
        .eq('aluno_id', id)
        .order('created_at', { ascending: true }); // Mais antigas primeiro

      if (fetchError) throw fetchError;

      if (avaliacoesAtuais && avaliacoesAtuais.length >= 4) {
        const LIMITE_AVALIACOES = 4;
        // Calcula quantas avaliações precisam ser removidas para, após adicionar a nova, o total ser 4.
        const numeroParaDeletar = avaliacoesAtuais.length - (LIMITE_AVALIACOES - 1);

        if (numeroParaDeletar > 0) {
          const avaliacoesParaDeletar = avaliacoesAtuais.slice(0, numeroParaDeletar);
          console.log(`🗑️ Limite de ${LIMITE_AVALIACOES} atingido. Deletando ${numeroParaDeletar} avaliação(ões) mais antigas.`);

          // Deleta as imagens associadas em paralelo
          const deletePromises = avaliacoesParaDeletar.map(avaliacao => deletarImagensDaAvaliacao(avaliacao));
          await Promise.all(deletePromises);

          // Deleta os registros do banco de dados de uma só vez
          const idsParaDeletar = avaliacoesParaDeletar.map(a => a.id);
          const { error: deleteError } = await supabase.from('avaliacoes_fisicas').delete().in('id', idsParaDeletar);

          if (deleteError) {
            console.error('❌ Erro ao deletar registros antigos do banco:', deleteError);
            throw new Error("Falha ao limpar avaliações antigas do banco de dados.");
          }
          console.log('✅ Registros antigos de avaliação deletados com sucesso.');
        }
      }

      // ✅ NOVO: Upload das imagens otimizadas
      const [foto_frente_url, foto_lado_url, foto_costas_url] = await Promise.all([
        uploadFile(imageFiles.frente ?? null),
        uploadFile(imageFiles.lado ?? null),
        uploadFile(imageFiles.costas ?? null),
      ]);

      // Salvar nova avaliação
      const { error } = await supabase
        .from('avaliacoes_fisicas')
        .insert([{
          aluno_id: id,
          data_avaliacao: hoje,
          peso: data.peso,
          altura: data.altura,
          imc: imc,
          peito_busto: data.peito_busto || null,
          cintura: data.cintura || null,
          quadril: data.quadril || null,
          coxa_direita: data.coxa_direita || null,
          coxa_esquerda: data.coxa_esquerda || null,
          braco_direito: data.braco_direito || null,
          braco_esquerdo: data.braco_esquerdo || null,
          antebraco_direito: data.antebraco_direito || null,
          antebraco_esquerdo: data.antebraco_esquerdo || null,
          panturrilha_direita: data.panturrilha_direita || null,
          panturrilha_esquerda: data.panturrilha_esquerda || null,
          observacoes: data.observacoes || null,
          foto_frente_url: foto_frente_url,
          foto_lado_url: foto_lado_url,
          foto_costas_url: foto_costas_url,
        }]);

      if (error) throw error;

      toast({
        title: "Avaliação criada",
        description: "A avaliação física foi registrada com sucesso.",
      });

      // Voltar para a página de avaliações
      navigate(`/alunos-avaliacoes/${id}`);

    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar a avaliação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ✅ ATUALIZADO: Otimiza a imagem antes de salvar no estado
  const handleImageChange = async (tipo: 'frente' | 'lado' | 'costas', file: File | null) => {
    if (!file) {
      setImageFiles(prev => ({ ...prev, [tipo]: undefined }));
      return;
    }
    const resizedFile = await resizeImageFile(file);
    setImageFiles(prev => ({ ...prev, [tipo]: resizedFile }));
  };

  // ✅ NOVA FUNÇÃO: Abstrai a seleção de mídia
  const handleSelectMedia = async (tipo: 'frente' | 'lado' | 'costas') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    if (isMobile) {
      input.capture = 'environment';
    }

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleImageChange(tipo, file);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {/* Voltar removido do header */}
          <div>
            <h1 className="text-3xl font-bold">Nova Avaliação</h1>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {/* Voltar removido do header */}
          <h1 className="text-3xl font-bold">Nova Avaliação</h1>
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
    <div className="space-y-6">
      {/* Cabeçalho da Página (Apenas para Desktop) */}
      <div className="hidden md:flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={handleCancelar}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Avaliação Física</h1>
          <p className="text-muted-foreground">Registrar nova avaliação para {aluno.nome_completo}</p>
        </div>
      </div>

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

      {/* Formulário */}
      <form onSubmit={form.handleSubmit(salvarAvaliacao)} className="space-y-6">
        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Básicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="peso">Peso (kg) *</Label>
                <Input
                  id="peso"
                  type="number"
                  step="0.1"
                  {...form.register('peso', { required: true, min: 1 })}
                />
              </div>
              <div>
                <Label htmlFor="altura">Altura (cm) *</Label>
                <Input
                  id="altura"
                  type="number"
                  {...form.register('altura', { required: true, min: 1 })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fotos */}
        <Card>
          <CardHeader>
            <CardTitle>Fotos (opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['frente', 'lado', 'costas'] as const).map((tipo) => {
                const file = imageFiles[tipo];
                const previewUrl = file ? URL.createObjectURL(file) : null;

                return (
                  <div key={tipo}>
                    <Label className="text-sm font-medium capitalize">Foto {tipo}</Label>
                    <div className="mt-2 space-y-4">
                      {file && previewUrl ? (
                        <div className="space-y-3">
                          <div className="relative inline-block">
                            <img 
                              src={previewUrl} 
                              alt={`Preview ${tipo}`}
                              className="w-full h-48 object-contain rounded-lg border shadow-sm bg-muted"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(previewUrl, '_blank')}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectMedia(tipo)}
                              className="flex items-center gap-2"
                              disabled={saving}
                            >
                              <Camera className="h-4 w-4" />
                              Alterar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleImageChange(tipo, null)}
                              className="flex items-center gap-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center h-full flex flex-col justify-center">
                          <p className="text-sm text-muted-foreground mb-3">Adicione uma foto de {tipo}.</p>
                          <div className="flex justify-center">
                            <Button type="button" variant="default" onClick={() => handleSelectMedia(tipo)} className="flex items-center gap-2" disabled={saving}>
                              {isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                              {isMobile ? 'Tirar Foto' : 'Selecionar Imagem'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Medidas Corporais */}
        <Card>
          <CardHeader>
            <CardTitle>Medidas Corporais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tronco */}
            <div>
              <h4 className="font-medium mb-3">Tronco</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="peito_busto">Peito/Busto (cm)</Label>
                  <Input
                    id="peito_busto"
                    type="number"
                    step="0.1"
                    {...form.register('peito_busto')}
                  />
                </div>
                <div>
                  <Label htmlFor="cintura">Cintura (cm)</Label>
                  <Input
                    id="cintura"
                    type="number"
                    step="0.1"
                    {...form.register('cintura')}
                  />
                </div>
                <div>
                  <Label htmlFor="quadril">Quadril (cm)</Label>
                  <Input
                    id="quadril"
                    type="number"
                    step="0.1"
                    {...form.register('quadril')}
                  />
                </div>
              </div>
            </div>

            {/* Membros Superiores */}
            <div>
              <h4 className="font-medium mb-3">Membros Superiores</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="braco_direito">Braço Direito (cm)</Label>
                  <Input
                    id="braco_direito"
                    type="number"
                    step="0.1"
                    {...form.register('braco_direito')}
                  />
                </div>
                <div>
                  <Label htmlFor="braco_esquerdo">Braço Esquerdo (cm)</Label>
                  <Input
                    id="braco_esquerdo"
                    type="number"
                    step="0.1"
                    {...form.register('braco_esquerdo')}
                  />
                </div>
                <div>
                  <Label htmlFor="antebraco_direito">Antebraço Direito (cm)</Label>
                  <Input
                    id="antebraco_direito"
                    type="number"
                    step="0.1"
                    {...form.register('antebraco_direito')}
                  />
                </div>
                <div>
                  <Label htmlFor="antebraco_esquerdo">Antebraço Esquerdo (cm)</Label>
                  <Input
                    id="antebraco_esquerdo"
                    type="number"
                    step="0.1"
                    {...form.register('antebraco_esquerdo')}
                  />
                </div>
              </div>
            </div>

            {/* Membros Inferiores */}
            <div>
              <h4 className="font-medium mb-3">Membros Inferiores</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="coxa_direita">Coxa Direita (cm)</Label>
                  <Input
                    id="coxa_direita"
                    type="number"
                    step="0.1"
                    {...form.register('coxa_direita')}
                  />
                </div>
                <div>
                  <Label htmlFor="coxa_esquerda">Coxa Esquerda (cm)</Label>
                  <Input
                    id="coxa_esquerda"
                    type="number"
                    step="0.1"
                    {...form.register('coxa_esquerda')}
                  />
                </div>
                <div>
                  <Label htmlFor="panturrilha_direita">Panturrilha Direita (cm)</Label>
                  <Input
                    id="panturrilha_direita"
                    type="number"
                    step="0.1"
                    {...form.register('panturrilha_direita')}
                  />
                </div>
                <div>
                  <Label htmlFor="panturrilha_esquerda">Panturrilha Esquerda (cm)</Label>
                  <Input
                    id="panturrilha_esquerda"
                    type="number"
                    step="0.1"
                    {...form.register('panturrilha_esquerda')}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...form.register('observacoes')}
              placeholder="Observações sobre a avaliação, objetivos, pontos de atenção..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Espaçador para o botão flutuante */}
        <div className="pb-24 md:pb-6" />
      </form>

      {/* Botão Salvar Flutuante */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        {/* Mobile: Round floating button */}
        <Button
          onClick={form.handleSubmit(salvarAvaliacao)}
          disabled={saving}
          className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-foreground"></div>
          ) : (
            <Save />
          )}
          <span className="sr-only">Salvar Avaliação</span>
        </Button>

        {/* Desktop: Standard floating button */}
        <Button
          onClick={form.handleSubmit(salvarAvaliacao)}
          disabled={saving}
          className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
          size="lg"
        >
          <Save />
          {saving ? "Salvando..." : "Salvar Avaliação"}
        </Button>
      </div>
    </div>
  );
};

export default AlunosAvaliacaoNova;