import { useState } from "react";
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
import { usePTProfile } from "@/hooks/usePTProfile";

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
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = usePTProfile();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email_aluno: "",
    },
  });

  const handleEnviarConvite = async (data: FormData) => {
    if (!user || !profile) {
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
          nome_personal: profile.nome_completo,
        }
      });

      // **LÓGICA DE ERRO CORRIGIDA**
      // Erros de negócio (como 409) são tratados pelo client do Supabase como um 'error'
      if (error) {
        // Verificamos se dentro do erro genérico está o nosso erro customizado
        if (error.context?.error === 'CONVITE_JA_ENVIADO') {
          setResultado({
            tipo: 'convite_duplicado',
            titulo: 'Convite já enviado',
            mensagem: 'Já existe um convite pendente para este aluno. Aguarde a resposta ou cancele o convite anterior.'
          });
        } else if (error.context?.error === 'ALUNO_JA_TEM_PT') {
          setResultado({
            tipo: 'aluno_com_pt',
            titulo: 'Aluno já possui Personal Trainer',
            mensagem: 'Este aluno já está vinculado a outro profissional. Não é possível enviar o convite.'
          });
        } else {
          // Para todos os outros erros (500, rede, etc.)
          console.error('Error calling function:', error);
          setResultado({
            tipo: 'erro',
            titulo: 'Erro no envio',
            mensagem: 'Não foi possível enviar o convite. Tente novamente.'
          });
        }
        return;
      }

      // **LÓGICA DE SUCESSO (só é executada para respostas 2xx)**
      if (responseData.success) {
        const cenarioTexto = responseData.cenario === 'email_novo' 
          ? 'Aluno novo: um email de cadastro foi enviado.'
          : 'Aluno existente: um email de convite para vínculo foi enviado.';

        setResultado({
          tipo: 'sucesso',
          cenario: responseData.cenario,
          titulo: 'Convite enviado com sucesso!',
          mensagem: `O convite foi enviado para ${data.email_aluno}. ${cenarioTexto}`
        });
        form.reset();
      } else {
         // Fallback para um erro inesperado no corpo de uma resposta 2xx
         setResultado({
            tipo: 'erro',
            titulo: 'Erro inesperado',
            mensagem: responseData.message || 'Ocorreu um erro desconhecido.'
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

  const getAlertVariant = (tipo: string) => {
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
                    onClick={() => navigate("/index-pt")}
                    size="sm"
                  >
                    Voltar ao Início
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Formulário */}
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
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Informações sobre o processo */}
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
    </div>
  );
};

export default ConviteAluno;