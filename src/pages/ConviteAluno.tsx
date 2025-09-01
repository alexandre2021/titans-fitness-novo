import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Mail, AlertCircle, CheckCircle, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  email_aluno: z.string().email("Email inválido"),
});

type FormData = z.infer<typeof formSchema>;

const ConviteAluno = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    tipo: 'sucesso' | 'erro' | 'aluno_com_pt' | 'convite_duplicado';
    cenario?: string;
    titulo: string;
    mensagem: string;
  } | null>(null);
  
  const [tokenValidation, setTokenValidation] = useState<{
    isValidating: boolean;
    isValid: boolean;
    conviteData?: {
      id: string;
      token_convite: string;
      email_convidado: string;
      pt_nome: string;
    };
    error?: string;
  } | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email_aluno: "",
    },
  });

  // Validar token na URL ao carregar a página
  useEffect(() => {
    const validateToken = async (token: string) => {
      setTokenValidation({ isValidating: true, isValid: false });
      
      try {
        const { data, error } = await supabase.functions.invoke('validate-invite', {
          body: { token }
        });

        if (error) {
          console.error('Erro na validação do token:', error);
          setTokenValidation({
            isValidating: false,
            isValid: false,
            error: 'Erro ao validar convite. Tente novamente.'
          });
          return;
        }

        if (data?.success) {
          form.setValue('email_aluno', data.convite.email_convidado);
          setTokenValidation({
            isValidating: false,
            isValid: true,
            conviteData: data.convite
          });
        } else {
          setTokenValidation({
            isValidating: false,
            isValid: false,
            error: data?.error || 'Token de convite inválido'
          });
        }
      } catch (error) {
        console.error('Erro na validação:', error);
        setTokenValidation({
          isValidating: false,
          isValid: false,
          error: 'Erro interno ao validar convite'
        });
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      validateToken(token);
    }
  }, [form]);

  // Função para invalidar o token após uso bem-sucedido
  const invalidateToken = async (conviteId: string, token: string) => {
    try {
      await supabase.functions.invoke('invalidate-invite', {
        body: { 
          conviteId,
          token 
        }
      });
    } catch (error) {
      console.error('Erro ao invalidar token:', error);
    }
  };

  const handleEnviarConvite = async (data: FormData) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Dados do usuário não encontrados.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResultado(null);

    try {
      const { data: responseData, error } = await supabase.functions.invoke('enviar-convite', {
        body: {
          email_aluno: data.email_aluno,
          personal_trainer_id: user.id,
          nome_personal: user.user_metadata.full_name,
        }
      });

      if (error) {
        console.error('Error response from function:', error);
        setResultado({
          tipo: 'erro',
          titulo: 'Erro no envio',
          mensagem: "Não foi possível enviar o convite. Por favor, verifique o e-mail e tente novamente mais tarde."
        });
        return;
      }

      if (responseData?.success) {
        if (tokenValidation?.conviteData) {
          await invalidateToken(
            tokenValidation.conviteData.id,
            tokenValidation.conviteData.token_convite
          );
        }
        
        setResultado({
          tipo: 'sucesso',
          cenario: responseData.cenario,
          titulo: 'Convite enviado com sucesso!',
          mensagem: `O convite foi enviado para ${data.email_aluno}.`
        });
        form.reset();
      } else if (responseData?.success === false) {
        if (responseData.error_type === 'CONVITE_JA_ENVIADO') {
          setResultado({
            tipo: 'convite_duplicado',
            titulo: 'Convite já enviado',
            mensagem: 'Já existe um convite pendente para este aluno. Aguarde a resposta ou cancele o convite anterior.'
          });
        } else if (responseData.error_type === 'ALUNO_JA_TEM_PT') {
          setResultado({
            tipo: 'aluno_com_pt',
            titulo: 'Aluno já possui Personal Trainer',
            mensagem: 'Este aluno já está vinculado a outro profissional. Não é possível enviar o convite.'
          });
        } else {
          setResultado({
            tipo: 'erro',
            titulo: 'Erro no envio',
            mensagem: responseData.message || 'Ocorreu um erro ao processar a solicitação.'
          });
        }
      } else {
         setResultado({
            tipo: 'erro',
            titulo: 'Erro inesperado',
            mensagem: responseData?.message || 'Ocorreu um erro desconhecido.'
          });
      }

    } catch (e) {
      console.error("Unhandled exception in handleEnviarConvite:", e);
      setResultado({
        tipo: 'erro',
        titulo: 'Erro Crítico',
        mensagem: 'Ocorreu um erro inesperado no aplicativo. Tente novamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'sucesso': return <CheckCircle className="h-4 w-4" />;
      case 'aluno_com_pt': return <UserX className="h-4 w-4" />;
      case 'convite_duplicado': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (tipo: string): "default" | "destructive" => {
    switch (tipo) {
      case 'sucesso': return 'default';
      case 'aluno_com_pt': return 'destructive';
      case 'convite_duplicado': return 'default';
      default: return 'destructive';
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/alunos")}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Convidar Aluno</h1>
          <p className="text-muted-foreground">
            Envie um convite para um aluno se juntar ao seu programa
          </p>
        </div>
      </div>

      {/* Validação de Token */}
      {tokenValidation && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            {tokenValidation.isValidating && (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                <span className="text-sm">Validando convite...</span>
              </div>
            )}
            
            {!tokenValidation.isValidating && tokenValidation.isValid && tokenValidation.conviteData && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <strong>Convite validado!</strong>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Você foi convidado por <strong>{tokenValidation.conviteData.pt_nome}</strong>
                      <br />
                      Email: {tokenValidation.conviteData.email_convidado}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {!tokenValidation.isValidating && !tokenValidation.isValid && tokenValidation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <strong>Convite inválido</strong>
                    <p className="mt-1 text-sm">{tokenValidation.error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate('/login')}
                    >
                      Voltar ao Login
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultado do convite */}
      {resultado && (
        <Alert variant={getAlertVariant(resultado.tipo)} className="border-l-4">
          <div className="flex items-start gap-3">
            {getAlertIcon(resultado.tipo)}
            <div className="flex-1">
              <h4 className="font-semibold">{resultado.titulo}</h4>
              <AlertDescription className="mt-1">
                {resultado.mensagem}
              </AlertDescription>
              {resultado.tipo === 'sucesso' && (
                <div className="mt-3">
                  <Button 
                    onClick={() => navigate("/alunos")}
                    size="sm"
                  >
                    Ver Alunos
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Formulário ou mensagem de indisponibilidade */}
      {tokenValidation && !tokenValidation.isValid && !tokenValidation.isValidating ? (
        <Card className="opacity-50 pointer-events-none">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Formulário indisponível devido a convite inválido
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEnviarConvite)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email_aluno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email do Aluno</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="email" 
                            placeholder="Digite o email do aluno"
                            className="pl-10"
                            disabled={tokenValidation?.isValid || isLoading}
                            readOnly={tokenValidation?.isValid}
                            {...field} 
                          />
                          {tokenValidation?.isValid && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {tokenValidation?.isValid && (
                        <p className="text-xs text-muted-foreground">
                          Email pré-preenchido através do convite
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <h4 className="font-medium mb-2">Como funciona:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Aluno novo:</strong> Receberá um email para criar conta</li>
                    <li>• <strong>Aluno existente:</strong> Receberá um email para aceitar o vínculo</li>
                    <li>• <strong>Aluno vinculado a outro personal trainer:</strong> Convite será bloqueado automaticamente</li>
                  </ul>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/alunos")}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? "Enviando..." : "Enviar Convite"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConviteAluno;