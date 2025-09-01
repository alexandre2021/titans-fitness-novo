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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Camera, X, Save, ChevronLeft } from 'lucide-react';
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
  const UPLOAD_IMAGE_ENDPOINT = 'https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/upload-imagem';
  const DELETE_IMAGE_ENDPOINT = 'https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/delete-image';

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados principais
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // Função de upload de imagem
  async function uploadImage(filename: string, imageBase64: string, alunoId: string, tipo: 'frente' | 'lado' | 'costas'): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Usuário não autenticado");
      }
      
      const response = await fetch(UPLOAD_IMAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          filename,
          image_base64: imageBase64,
          aluno_id: alunoId,
          tipo,
          bucket_type: 'avaliacoes'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao enviar imagem: ${errorText}`);
      }
      
      return filename;
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      throw error;
    }
  }

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
      return fetch(DELETE_IMAGE_ENDPOINT, {
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

  const salvarAvaliacao = async (data: NovaAvaliacaoForm) => {
    setSaving(true);
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

      // Upload das imagens (se existirem)
      const imageUrls: { frente?: string; lado?: string; costas?: string } = {};
      for (const tipo of ['frente', 'lado', 'costas'] as const) {
        const file = imageFiles[tipo];
        if (file) {
          const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const base64 = await toBase64(file);
          const filename = `${id}_${tipo}_${Date.now()}.${file.name.split('.').pop()}`;
          imageUrls[tipo] = await uploadImage(filename, base64, id!, tipo);
        }
      }

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
          foto_frente_url: imageUrls.frente || null,
          foto_lado_url: imageUrls.lado || null,
          foto_costas_url: imageUrls.costas || null,
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

  const handleImageChange = (tipo: 'frente' | 'lado' | 'costas', file: File | null) => {
    setImageFiles(prev => ({
      ...prev,
      [tipo]: file || undefined
    }));
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
              {['frente', 'lado', 'costas'].map((tipo) => (
                <div key={tipo} className="flex flex-col items-center space-y-2">
                  <Label className="capitalize font-medium">Foto {tipo}</Label>
                  <input
                    id={`foto_${tipo}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      handleImageChange(tipo as 'frente' | 'lado' | 'costas', file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById(`foto_${tipo}`)?.click()}
                    className="w-40 h-40 flex flex-col items-center justify-center relative overflow-hidden"
                  >
                    {imageFiles[tipo as 'frente' | 'lado' | 'costas'] ? (
                      <img
                        src={URL.createObjectURL(imageFiles[tipo as 'frente' | 'lado' | 'costas'] as File)}
                        alt={`Preview ${tipo}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                        <span className="text-sm">Selecionar</span>
                      </>
                    )}
                  </Button>
                  {imageFiles[tipo as 'frente' | 'lado' | 'costas'] && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleImageChange(tipo as 'frente' | 'lado' | 'costas', null)}
                      className="text-destructive"
                    >
                      <X className="w-3 h-3 mr-1" /> Remover
                    </Button>
                  )}
                </div>
              ))}
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

      {/* Botões de Ação */}
      <div className="flex justify-end gap-2 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancelar}
          disabled={saving}
          className="flex items-center"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-8 flex items-center">
          {saving ? (
            <>Salvando...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>
      </form>
    </div>
  );
};

export default AlunosAvaliacaoNova;