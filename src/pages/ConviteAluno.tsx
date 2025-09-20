import { useState, useEffect } from "react";
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
import { ArrowLeft, Mail, AlertCircle, CheckCircle, UserX, QrCode, Copy, X as IconX } from "lucide-react";
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
    tipo: 'sucesso' | 'erro' | 'aluno_com_pt' | 'convite_duplicado';
    cenario?: string;
    titulo: string;
    mensagem: string;
  } | null>(null);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
 
  const navigate = useNavigate();
  const { user } = useAuth();


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email_aluno: "",
    },
  });

  const handleGerarQrCode = async () => {
    if (!user) {
      toast.error("Erro", { description: "Você precisa estar logado para gerar um convite." });
      return;
    }

    setIsGeneratingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-convite-link', {
        body: { personal_trainer_id: user.id },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Falha ao gerar o link de convite.");
      }

      setQrCodeUrl(data.url);
      setIsQrModalOpen(true);

    } catch (e) {
      const error = e as Error;
      console.error("Erro ao gerar QR Code:", error);
      toast.error("Erro ao gerar link", { description: error.message });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (qrCodeUrl) {
      navigator.clipboard.writeText(qrCodeUrl);
      toast.success("Link copiado!", {
        description: "O link de cadastro foi copiado para a área de transferência."
      });
    }
  };

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
      // Buscar nome na tabela personal_trainers para garantir que temos o nome mais atualizado.
      const { data: ptData } = await supabase
        .from('personal_trainers')
        .select('nome_completo')
        .eq('id', user.id)
        .single();


      const nomePersonal = ptData?.nome_completo || user.user_metadata?.full_name || 'Personal Trainer';


      const { data: responseData, error } = await supabase.functions.invoke('enviar-convite', {
        body: {
          email_aluno: data.email_aluno,
          personal_trainer_id: user.id,
          nome_personal: nomePersonal,
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


      {/* Formulário ou mensagem de indisponibilidade */}
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

      {/* Divisor */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <span className="relative bg-background px-2 text-xs uppercase text-muted-foreground">
          Ou
        </span>
      </div>

      {/* Cadastro Rápido com QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Cadastro Rápido (Presencial)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Se o aluno estiver com você, gere um QR Code para que ele possa se cadastrar rapidamente usando o próprio celular.
          </p>
          <Button onClick={handleGerarQrCode} variant="secondary" className="w-full" disabled={isGeneratingLink}>
            {isGeneratingLink ? "Gerando..." : "Gerar QR Code de Convite"}
          </Button>
        </CardContent>
      </Card>

      {/* Modal do QR Code */}
      {isQrModalOpen && qrCodeUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsQrModalOpen(false)}>
          <Card className="w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Escaneie para Cadastrar</CardTitle>
              <p className="text-sm text-muted-foreground">Peça para o aluno escanear este código com a câmera do celular.</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCode value={qrCodeUrl} size={256} />
              </div>
              <Button variant="outline" onClick={handleCopyLink} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copiar Link
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};


export default ConviteAluno;
