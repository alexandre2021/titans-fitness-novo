import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePTProfile } from "@/hooks/usePTProfile";

const formSchema = z.object({
  nome_aluno: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email_aluno: z.string().email("Email inválido"),
});

type FormData = z.infer<typeof formSchema>;

const ConviteAluno = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = usePTProfile();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_aluno: "",
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

    try {
      const { data: responseData, error } = await supabase.functions.invoke('enviar-convite', {
        body: {
          nome_aluno: data.nome_aluno,
          email_aluno: data.email_aluno,
          nome_personal: profile.nome_completo,
          codigo_pt: profile.codigo_pt,
        }
      });

      if (error) {
        console.error('Error calling function:', error);
        toast({
          title: "Erro",
          description: "Não foi possível enviar o convite. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Convite enviado!",
        description: `O convite foi enviado para ${data.email_aluno} com sucesso.`,
      });

      navigate("/alunos");
    } catch (error) {
      console.error("Error sending invite:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao enviar convite.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/alunos")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Convidar Aluno</h1>
          <p className="text-muted-foreground">
            Envie um convite para um novo aluno se juntar ao seu programa
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Dados do Convite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEnviarConvite)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome_aluno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Aluno</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome completo do aluno" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email_aluno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do Aluno</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Digite o email do aluno" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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