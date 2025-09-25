/**
 * @file ConviteAluno.tsx
 * @description Página para Personal Trainers convidarem novos alunos, seja por email ou por QR Code presencial.
 *
 * @note A limpeza de convites expirados é realizada pelo cron job 'check-inactive-users.ts':
 *       - Convites de QR Code (sem email) são removidos após 1 dia.
 *       - Convites por Email são removidos após 7 dias.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { QRCodeCanvas as QRCode } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Mail, AlertCircle, CheckCircle, UserX, QrCode, RefreshCw, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";


const formSchema = z.object({
  email_aluno: z.string().email("Email inválido"),
});


type FormData = z.infer<typeof formSchema>;


const ConviteAluno = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    tipo: 'sucesso' | 'erro' | 'aluno_ja_segue' | 'convite_duplicado';
    cenario?: string;
    titulo: string;
    mensagem: string;
  } | null>(null);

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
 
  const navigate = useNavigate();
  const { user } = useAuth();


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email_aluno: "",
    },
  });


  const gerarNovoConvite = useCallback(async () => {
    if (!user) {
      toast.error("Erro", { description: "Você precisa estar logado para gerar um convite." });
      return;
    }

    setIsGenerating(true);
    setQrCodeUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('gerar-convite-link', {
        body: { professor_id: user.id },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Falha ao gerar o link de convite.");
      }

      setQrCodeUrl(data.url);
    } catch (e) {
      const error = e as Error;
      console.error("Erro ao gerar QR Code:", error);
      toast.error("Erro ao gerar link", { description: error.message });
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  // Gera o primeiro convite ao carregar e configura o timer de 30 minutos
  useEffect(() => {
    gerarNovoConvite();

    const intervalId = setInterval(() => {
      toast.info("QR Code atualizado", { description: "Um novo QR Code de convite foi gerado para sua segurança." });
      gerarNovoConvite();
    }, 30 * 60 * 1000); // 30 minutos

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, [gerarNovoConvite]);

  const handleEnviarConvite = async (data: FormData) => {
    if (!user) {
      toast.error("Erro", {
        description: "Dados do usuário não encontrados."
      })
      return;
    }


    setIsLoading(true);
    setResultado(null);


    try {
      // Buscar nome na tabela professores para garantir que temos o nome mais atualizado.
      const { data: ptData } = await supabase
        .from('professores')
        .select('nome_completo')
        .eq('id', user.id)
        .single();


      const nomePersonal = ptData?.nome_completo || user.user_metadata?.full_name || 'Personal Trainer';


      const { data: responseData, error } = await supabase.functions.invoke('enviar-convite', {
        body: {
          email_aluno: data.email_aluno,
          professor_id: user.id,
          nome_professor: nomePersonal,
        },
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
        } else if (responseData.error_type === 'ALUNO_JA_SEGUE') {
          setResultado({
            tipo: 'aluno_ja_segue',
            titulo: 'Aluno já segue você',
            mensagem: 'Este aluno já está na sua lista de seguidores. Não é necessário enviar um novo convite.'
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
      case 'convite_duplicado': return <AlertCircle className="h-4 w-4" />;
      case 'aluno_ja_segue': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };


  const getAlertVariant = (tipo: string): "default" | "destructive" => {
    switch (tipo) {
      case 'sucesso': return 'default';
      case 'convite_duplicado': return 'default';
      case 'aluno_ja_segue': return 'default';
      default: return 'destructive';
    }
  };


  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho da Página (Apenas para Desktop) */}
      <div className="hidden md:flex items-center gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cadastro Rápido com QR Code */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Presencial
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center flex-grow p-6">
            {isGenerating && (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Gerando QR Code seguro...</p>
              </div>
            )}

            {qrCodeUrl && !isGenerating && (
              <div className="p-2 bg-white rounded-lg border">
                <QRCode value={qrCodeUrl} size={220} />
              </div>
            )}
          </CardContent>
          {qrCodeUrl && !isGenerating && (
            <div className="px-6 pb-6 pt-0">
              <div className="flex w-full">
                <Button onClick={gerarNovoConvite} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regerar
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col flex-grow">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEnviarConvite)} className="space-y-4 flex flex-col flex-grow">
                <div className="space-y-4 flex-grow">
                  <FormField
                    control={form.control}
                    name="email_aluno"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email do Aluno</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="email"
                              placeholder="Digite o email do aluno"
                              disabled={isLoading}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <h4 className="font-medium mb-2">Como funciona:</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>Aluno sem cadastro:</strong> Receberá um email para criar conta.</li>
                      <li>• <strong>Aluno com cadastro:</strong> Receberá um email para aceitar o convite.</li>
                    </ul>
                  </div>
                </div>


                <div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Enviar</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};


export default ConviteAluno;
