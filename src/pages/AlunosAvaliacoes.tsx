import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatters } from '@/utils/formatters';

interface AlunoInfo {
  id: string;
  nome_completo: string;
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
}

const AlunosAvaliacoes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoFisica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDados = async () => {
      if (!id || !user) return;

      try {
        // Buscar informações do aluno
        const { data: alunoData, error: alunoError } = await supabase
          .from('alunos')
          .select('id, nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color')
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/alunos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Avaliações do Aluno</h1>
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
          <h1 className="text-3xl font-bold">Avaliações do Aluno</h1>
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
        <Button variant="ghost" onClick={() => navigate('/alunos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Avaliações do Aluno</h1>
          <p className="text-muted-foreground">Histórico de avaliações físicas e evolução</p>
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
              <p className="text-sm text-muted-foreground">
                {avaliacoes.length} avaliação(ões) registrada(s)
              </p>
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
              <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação registrada</h3>
              <p className="text-muted-foreground">
                As avaliações físicas aparecerão aqui quando forem registradas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {avaliacoes.map((avaliacao) => (
                <div key={avaliacao.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formatters.date(avaliacao.data_avaliacao)}
                    </span>
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
                      <p className="font-semibold">{avaliacao.imc.toFixed(1)}</p>
                    </div>
                    {avaliacao.peito_busto && (
                      <div>
                        <p className="text-sm text-muted-foreground">Peito/Busto</p>
                        <p className="font-semibold">{avaliacao.peito_busto} cm</p>
                      </div>
                    )}
                    {avaliacao.cintura && (
                      <div>
                        <p className="text-sm text-muted-foreground">Cintura</p>
                        <p className="font-semibold">{avaliacao.cintura} cm</p>
                      </div>
                    )}
                    {avaliacao.quadril && (
                      <div>
                        <p className="text-sm text-muted-foreground">Quadril</p>
                        <p className="font-semibold">{avaliacao.quadril} cm</p>
                      </div>
                    )}
                  </div>
                  
                  {avaliacao.observacoes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">Observações</p>
                      <p className="text-sm">{avaliacao.observacoes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlunosAvaliacoes;