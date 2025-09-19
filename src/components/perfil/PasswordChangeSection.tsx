import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Lock, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Modal from 'react-modal';

const formSchema = z.object({
  senhaAtual: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  novaSenha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmarSenha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: "Senhas não coincidem",
  path: ["confirmarSenha"],
});

export const PasswordChangeSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    atual: false,
    nova: false,
    confirmar: false,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      senhaAtual: "",
      novaSenha: "",
      confirmarSenha: "",
    },
  });

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user?.email) {
        throw new Error('Usuário não autenticado');
      }

      // Verifica se a senha atual está correta usando a função do banco
      const { data: isValidPassword, error: validationError } = await supabase
        .rpc('verify_user_password', { password: values.senhaAtual });

      if (validationError) {
        throw new Error('Erro ao verificar senha atual');
      }

      if (!isValidPassword) {
        throw new Error('Senha atual incorreta');
      }

      // Atualiza para a nova senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.novaSenha
      });

      if (updateError) throw updateError;

      toast.success("Senha alterada", {
        description: "Sua senha foi alterada com sucesso."
      });

      form.reset();
      setIsOpen(false);
    } catch (error: unknown) {
      let errorMessage = 'Não foi possível alterar a senha. Tente novamente.';
      if (error instanceof Error && error.message.includes('incorreta')) {
        errorMessage = 'A senha atual informada está incorreta.';
      }
      
      console.error('Error changing password:', error);
      toast.error("Erro ao alterar senha", {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center w-full gap-x-4">
          <h2 className="text-lg font-semibold flex-1 whitespace-normal">Segurança</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Senha</h4>
            <p className="text-sm text-muted-foreground">
              Mantenha sua conta segura com uma senha forte
            </p>
          </div>
          
          <Button variant="outline" onClick={() => setIsOpen(true)}>
            <Lock className="h-4 w-4 mr-2" />
            Alterar Senha
          </Button>

          <Modal
            isOpen={isOpen}
            onRequestClose={() => {}} // Impede o fechamento por ações padrão
            shouldCloseOnOverlayClick={false}
            shouldCloseOnEsc={false}
            className="bg-white rounded-lg max-w-md w-full mx-4 outline-none"
            overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <div className="flex items-center p-6 border-b">
              <h2 className="text-lg font-semibold">Alterar Senha</h2>
            </div>
            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="senhaAtual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Atual</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPasswords.atual ? "text" : "password"}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => togglePasswordVisibility('atual')}
                            >
                              {showPasswords.atual ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="novaSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPasswords.nova ? "text" : "password"}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => togglePasswordVisibility('nova')}
                            >
                              {showPasswords.nova ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmarSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPasswords.confirmar ? "text" : "password"}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => togglePasswordVisibility('confirmar')}
                            >
                              {showPasswords.confirmar ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Alterando..." : "Alterar Senha"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </Modal>
        </div>
      </CardContent>
    </Card>
  );
};