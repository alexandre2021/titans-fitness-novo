import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, FileText, Check, X, Minus } from 'lucide-react'; // Adicionado Minus
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AlunoParQ {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
  par_q_respostas?: Record<string, boolean | null> | null;
}

const AlunosParQ = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aluno, setAluno] = useState<AlunoParQ | null>(null);
  const [loading, setLoading] = useState(true);

  // As perguntas devem ser idênticas às do Onboarding
  const perguntasParQ = [
    "Aluno possui algum problema cardíaco?",
    "Aluno sente dor no peito quando faz atividade física?",
    "No último mês, aluno sentiu dor no peito quando não estava fazendo atividade física?",
    "Aluno já perdeu o equilíbrio por tonturas ou perdeu a consciência?",
    "Aluno tem algum problema ósseo ou articular que poderia ser agravado pela atividade física?",
    "Aluno toma medicamentos para pressão arterial ou problemas cardíacos?",
    "Aluno tem conhecimento de alguma razão pela qual não deveria fazer atividade física?"
  ];

  useEffect(() => {
    const fetchAlunoParQ = async () => {
      if (!id || !user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('alunos')
          .select('id, nome_completo, email, avatar_type, avatar_image_url, avatar_letter, avatar_color, par_q_respostas')
          .eq('id', id)
          .eq('personal_trainer_id', user.id)
          .single();

        if (error) {
          throw error;
        }
        
        if (data) {
          // A Supabase já retorna o JSON como objeto, então não precisamos de parsing complexo
          // Apenas garantimos que o tipo está correto para o TypeScript
          setAluno(data as AlunoParQ);
        }
      } catch (error) {
        console.error('Erro ao buscar PAR-Q do aluno:', error);
        setAluno(null); // Garante que não há dados de aluno em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchAlunoParQ();
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

  const renderResposta = (resposta: boolean | null) => {
    if (resposta === true) {
      return (
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 text-destructive" />
          <span className="text-destructive font-medium">Sim</span>
        </div>
      );
    }
    if (resposta === false) {
      return (
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-600 font-medium">Não</span>
        </div>
      );
    }
    // resposta === null ou undefined
    return (
      <div className="flex items-center gap-2">
        <Minus className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Não respondido</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/alunos')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">PAR-Q do Aluno</h1>
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
          <Button 
            variant="ghost" 
            onClick={() => navigate('/alunos')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">PAR-Q do Aluno</h1>
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
          onClick={() => navigate('/alunos')}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">PAR-Q do Aluno</h1>
          <p className="text-muted-foreground">Questionário de Prontidão para Atividade Física</p>
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

      {/* Respostas do PAR-Q */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            Respostas do Questionário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {perguntasParQ.map((pergunta, index) => {
            const questaoKey = `questao_${index + 1}`;
            let resposta: boolean | null | undefined = null;

            if (aluno?.par_q_respostas && typeof aluno.par_q_respostas === 'object') {
              resposta = aluno.par_q_respostas[questaoKey];
            }

            return (
              <div key={index} className="border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                <div className="space-y-3">
                  <p className="text-sm font-medium leading-relaxed">
                    <span className="text-primary font-semibold">{index + 1}.</span> {pergunta}
                  </p>
                  <div className="pl-6">
                    {renderResposta(resposta)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Nota Informativa */}
          <div className="bg-muted/50 p-4 rounded-lg mt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> As respostas ao PAR-Q foram coletadas durante o cadastro 
              do aluno e não podem ser alteradas. Este questionário serve como base para avaliação 
              da prontidão do aluno para atividade física.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlunosParQ;