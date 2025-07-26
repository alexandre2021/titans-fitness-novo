import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, BarChart3, TrendingUp, Calendar, Plus, Camera, Eye, X } from 'lucide-react';
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
  braco_direito?: number;
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
  braco_direito?: number;
  observacoes?: string;
}

const AlunosAvaliacoes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFisica[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<AvaliacaoFisica | null>(null);
  const [showIntervalWarning, setShowIntervalWarning] = useState(false);
  const [intervalDays, setIntervalDays] = useState(0);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [imageFiles, setImageFiles] = useState<{
    frente?: File;
    lado?: File;
    costas?: File;
  }>({});

  const form = useForm<NovaAvaliacaoForm>();

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
          return;
        }

        setAluno(alunoData);

        // Buscar avaliações físicas
        const { data: avaliacoesData, error: avaliacoesError } = await supabase
          .from('avaliacoes_fisicas')
          .select('*')
          .eq('aluno_id', id)
          .order('data_avaliacao', { ascending: false });

        if (avaliacoesError) {
          console.error('Erro ao buscar avaliações:', avaliacoesError);
        } else {
          setAvaliacoes(avaliacoesData || []);
        }

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [id, user]);

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

  const getIMCClassification = (imc: number) => {
    if (imc < 18.5) return { text: 'Abaixo do peso', color: 'bg-blue-500' };
    if (imc < 25) return { text: 'Normal', color: 'bg-green-500' };
    if (imc < 30) return { text: 'Sobrepeso', color: 'bg-yellow-500' };
    return { text: 'Obesidade', color: 'bg-red-500' };
  };

  const checkIntervalAndSave = async (data: NovaAvaliacaoForm) => {
    if (avaliacoes.length > 0) {
      const ultimaAvaliacao = new Date(avaliacoes[0].data_avaliacao);
      const hoje = new Date();
      const diffTime = Math.abs(hoje.getTime() - ultimaAvaliacao.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30) {
        setIntervalDays(diffDays);
        setPendingFormData(data);
        setShowIntervalWarning(true);
        return;
      }
    }

    await salvarAvaliacao(data);
  };

  const salvarAvaliacao = async (data: NovaAvaliacaoForm) => {
    try {
      const imc = calcularIMC(data.peso, data.altura);
      const hoje = new Date().toISOString().split('T')[0];

      // Se já temos 4 avaliações, remover a mais antiga
      if (avaliacoes.length >= 4) {
        const maisAntiga = avaliacoes[avaliacoes.length - 1];
        await supabase
          .from('avaliacoes_fisicas')
          .delete()
          .eq('id', maisAntiga.id);
      }

      // Salvar nova avaliação
      const { data: novaAvaliacao, error } = await supabase
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
          braco_direito: data.braco_direito || null,
          observacoes: data.observacoes || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Recarregar avaliações
      const { data: avaliacoesData } = await supabase
        .from('avaliacoes_fisicas')
        .select('*')
        .eq('aluno_id', id)
        .order('data_avaliacao', { ascending: false });

      setAvaliacoes(avaliacoesData || []);
      setIsModalOpen(false);
      form.reset();
      setImageFiles({});
      toast({
        title: "Avaliação criada",
        description: "A avaliação física foi registrada com sucesso.",
      });

    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar a avaliação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleImageChange = (tipo: 'frente' | 'lado' | 'costas', file: File | null) => {
    setImageFiles(prev => ({
      ...prev,
      [tipo]: file || undefined
    }));
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/alunos')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Avaliações</h1>
              <p className="text-muted-foreground">Histórico de avaliações físicas e evolução</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-lg text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/alunos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Avaliações</h1>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/alunos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Avaliações</h1>
            <p className="text-muted-foreground">Histórico de avaliações físicas e evolução</p>
          </div>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Avaliação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Avaliação Física</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(checkIntervalAndSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-4">
                <h4 className="font-medium">Medidas Corporais (cm) - Opcional</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="peito_busto">Peito/Busto</Label>
                    <Input
                      id="peito_busto"
                      type="number"
                      step="0.1"
                      {...form.register('peito_busto')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cintura">Cintura</Label>
                    <Input
                      id="cintura"
                      type="number"
                      step="0.1"
                      {...form.register('cintura')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quadril">Quadril</Label>
                    <Input
                      id="quadril"
                      type="number"
                      step="0.1"
                      {...form.register('quadril')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="coxa_direita">Coxa Direita</Label>
                    <Input
                      id="coxa_direita"
                      type="number"
                      step="0.1"
                      {...form.register('coxa_direita')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="braco_direito">Braço Direito</Label>
                    <Input
                      id="braco_direito"
                      type="number"
                      step="0.1"
                      {...form.register('braco_direito')}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  {...form.register('observacoes')}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Avaliação
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira avaliação
              </Button>
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
                        <span className="font-medium">
                          {formatters.date(avaliacao.data_avaliacao)}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedAvaliacao(avaliacao);
                          setIsDetailsModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Detalhes
                      </Button>
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Avaliação de {selectedAvaliacao && formatters.date(selectedAvaliacao.data_avaliacao)}
            </DialogTitle>
          </DialogHeader>
          {selectedAvaliacao && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Peso</p>
                  <p className="font-semibold">{selectedAvaliacao.peso} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Altura</p>
                  <p className="font-semibold">{selectedAvaliacao.altura} cm</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IMC</p>
                  <p className="font-semibold">{selectedAvaliacao.imc.toFixed(1)}</p>
                </div>
                {selectedAvaliacao.peito_busto && (
                  <div>
                    <p className="text-sm text-muted-foreground">Peito/Busto</p>
                    <p className="font-semibold">{selectedAvaliacao.peito_busto} cm</p>
                  </div>
                )}
                {selectedAvaliacao.cintura && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cintura</p>
                    <p className="font-semibold">{selectedAvaliacao.cintura} cm</p>
                  </div>
                )}
                {selectedAvaliacao.quadril && (
                  <div>
                    <p className="text-sm text-muted-foreground">Quadril</p>
                    <p className="font-semibold">{selectedAvaliacao.quadril} cm</p>
                  </div>
                )}
                {selectedAvaliacao.coxa_direita && (
                  <div>
                    <p className="text-sm text-muted-foreground">Coxa Direita</p>
                    <p className="font-semibold">{selectedAvaliacao.coxa_direita} cm</p>
                  </div>
                )}
                {selectedAvaliacao.braco_direito && (
                  <div>
                    <p className="text-sm text-muted-foreground">Braço Direito</p>
                    <p className="font-semibold">{selectedAvaliacao.braco_direito} cm</p>
                  </div>
                )}
              </div>
              
              {selectedAvaliacao.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Observações</p>
                  <p className="text-sm bg-muted p-3 rounded">{selectedAvaliacao.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Aviso de Intervalo */}
      <AlertDialog open={showIntervalWarning} onOpenChange={setShowIntervalWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Intervalo entre avaliações</AlertDialogTitle>
            <AlertDialogDescription>
              Última avaliação há {intervalDays} dias. Recomendamos aguardar mais {30 - intervalDays} dias para resultados mais precisos. Deseja criar uma nova avaliação mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowIntervalWarning(false);
              setPendingFormData(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingFormData) {
                salvarAvaliacao(pendingFormData);
              }
              setShowIntervalWarning(false);
              setPendingFormData(null);
            }}>
              Criar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AlunosAvaliacoes;