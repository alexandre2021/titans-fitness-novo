import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, FileText, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AlunoParQ {
  id: string;
  nome_completo: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
  par_q_respostas?: any;
}

const AlunosParQ = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aluno, setAluno] = useState<AlunoParQ | null>(null);
  const [loading, setLoading] = useState(true);

  const perguntasParQ = [
    "Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?",
    "Você sente dor no peito quando pratica atividade física?",
    "No último mês, você sentiu dor no peito quando não estava fazendo atividade física?",
    "Você perde o equilíbrio por causa de tonturas ou já perdeu a consciência?",
    "Você tem algum problema ósseo ou articular que poderia piorar com a prática de atividades físicas?",
    "Algum médico já prescreveu medicamentos para sua pressão arterial ou condição do coração?",
    "Você tem conhecimento através de sua própria experiência, ou um médico já mencionou que você tem diabetes, asma, epilepsia ou qualquer outra condição médica?"
  ];

  useEffect(() => {
    const fetchAlunoParQ = async () => {
      if (!id || !user) return;

      try {
        const { data, error } = await supabase
          .from('alunos')
          .select('id, nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color, par_q_respostas')
          .eq('id', id)
          .eq('personal_trainer_id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar PAR-Q do aluno:', error);
        } else {
          setAluno(data);
        }
      } catch (error) {
        console.error('Erro ao buscar PAR-Q do aluno:', error);
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

  const renderResposta = (resposta: boolean) => {
    return (
      <div className="flex items-center gap-2">
        {resposta ? (
          <>
            <X className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">Sim</span>
          </>
        ) : (
          <>
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">Não</span>
          </>
        )}
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
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
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
              <p className="text-sm text-muted-foreground">Respostas ao questionário PAR-Q</p>
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
          {perguntasParQ.map((pergunta, index) => (
            <div key={index} className="border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
              <div className="space-y-3">
                <p className="text-sm font-medium leading-relaxed">
                  <span className="text-primary font-semibold">{index + 1}.</span> {pergunta}
                </p>
                <div className="pl-6">
                  {renderResposta(aluno.par_q_respostas?.[`pergunta_${index + 1}`])}
                </div>
              </div>
            </div>
          ))}

          {/* Nota Informativa */}
          <div className="bg-muted/50 p-4 rounded-lg mt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> As respostas ao PAR-Q foram coletadas durante o onboarding 
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