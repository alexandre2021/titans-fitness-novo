import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatters } from '@/utils/formatters';

interface AlunoDetalhes {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  genero?: string;
  data_nascimento?: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
  onboarding_completo: boolean;
  endereco?: string;
  descricao_pessoal?: string;
}

const DetalhesAluno = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aluno, setAluno] = useState<AlunoDetalhes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlunoDetalhes = async () => {
      if (!id || !user) return;

      try {
        const { data, error } = await supabase
          .from('alunos')
          .select('*')
          .eq('id', id)
          .eq('personal_trainer_id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar detalhes do aluno:', error);
        } else {
          setAluno(data);
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes do aluno:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlunoDetalhes();
  }, [id, user]);

  const renderAvatar = () => {
    if (!aluno) return null;
    
    if (aluno.avatar_type === 'image' && aluno.avatar_image_url) {
      return <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />;
    }
    
    return (
      <AvatarFallback 
        style={{ backgroundColor: aluno.avatar_color }}
        className="text-white font-semibold text-2xl"
      >
        {aluno.avatar_letter || aluno.nome_completo.charAt(0).toUpperCase()}
      </AvatarFallback>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/alunos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Detalhes do Aluno</h1>
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
          <h1 className="text-3xl font-bold">Detalhes do Aluno</h1>
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
          <h1 className="text-3xl font-bold">Detalhes do Aluno</h1>
          <p className="text-muted-foreground">Informações pessoais completas</p>
        </div>
      </div>

      {/* Card de Informações do Aluno */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar e Nome */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {renderAvatar()}
            </Avatar>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">{aluno.nome_completo}</h3>
              <Badge 
                variant={aluno.onboarding_completo ? "default" : "secondary"}
                className={aluno.onboarding_completo ? "bg-green-600 hover:bg-green-700" : "bg-yellow-500 hover:bg-yellow-600 text-white"}
              >
                {aluno.onboarding_completo ? "Ativo" : "Pendente"}
              </Badge>
            </div>
          </div>

          {/* Informações Detalhadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{aluno.email}</p>
                </div>
              </div>

              {aluno.telefone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">{formatters.phone(aluno.telefone)}</p>
                  </div>
                </div>
              )}

              {aluno.data_nascimento && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Data de Nascimento</p>
                    <p className="text-sm text-muted-foreground">
                      {formatters.date(aluno.data_nascimento)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {aluno.genero && (
                <div>
                  <p className="text-sm font-medium">Gênero</p>
                  <p className="text-sm text-muted-foreground">
                    {aluno.genero === 'masculino' ? 'Masculino' : 
                     aluno.genero === 'feminino' ? 'Feminino' : 'Outro'}
                  </p>
                </div>
              )}


              {aluno.endereco && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Endereço</p>
                    <p className="text-sm text-muted-foreground">{aluno.endereco}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Descrição Pessoal */}
          <div className="col-span-full">
            <label className="text-sm font-medium text-muted-foreground">Descrição Pessoal</label>
            <p className="text-sm mt-1">
              {aluno.descricao_pessoal || "Não informado"}
            </p>
          </div>

          {/* Nota Informativa */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> As edições das informações são realizadas diretamente pelo aluno 
              através do aplicativo. Como Personal Trainer, você possui acesso apenas para visualização.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DetalhesAluno;