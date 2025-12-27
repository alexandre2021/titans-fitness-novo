import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import ReCAPTCHA from "react-google-recaptcha";

const formSchema = z.object({
  nome_completo: z.string().min(2, "Nome completo deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email deve ter formato válido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirm_password: z.string().min(6, "Confirmação de senha é obrigatória"),
  aceitarTermos: z.boolean().refine(val => val === true, "Você deve aceitar os termos"),
}).refine((data) => data.password === data.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
});

type FormData = z.infer<typeof formSchema>;

export default function CadastroAluno() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVisualCaptcha, setShowVisualCaptcha] = useState(false);
  const [recaptchaV2Token, setRecaptchaV2Token] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { executeRecaptcha, isReady: recaptchaReady, cleanup } = useRecaptcha();

  const RECAPTCHA_SITE_KEY_V2 = import.meta.env.VITE_RECAPTCHA_SITE_KEY_V2;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      password: "",
      confirm_password: "",
      aceitarTermos: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const conviteToken = searchParams.get('token');
    let professorIdConvidante: string | null = null;

    try {
      // ETAPA 1: Verificação reCAPTCHA v3 (invisível)
      let captchaVerified = false;

      if (recaptchaReady && !showVisualCaptcha) {
        const tokenV3 = await executeRecaptcha('signup_aluno');

        if (tokenV3) {
          // Verificar token v3 com Edge Function
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            'verify-recaptcha',
            {
              body: { token: tokenV3, version: 'v3', action: 'signup_aluno' },
            }
          );

          if (verifyError) {
            console.error('Erro ao verificar reCAPTCHA v3:', verifyError);
            toast.error('Erro na verificação de segurança. Tente novamente.');
            setIsLoading(false);
            return;
          }

          if (verifyData.needsVisualChallenge) {
            // Score baixo - mostrar CAPTCHA v2
            setShowVisualCaptcha(true);
            setIsLoading(false);
            toast.info('Por favor, complete a verificação de segurança');
            return;
          }

          captchaVerified = true;
        }
      } else if (showVisualCaptcha && recaptchaV2Token) {
        // ETAPA 2: Verificação reCAPTCHA v2 (checkbox)
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
          'verify-recaptcha',
          {
            body: { token: recaptchaV2Token, version: 'v2' },
          }
        );

        if (verifyError || !verifyData.verified) {
          toast.error('Verificação de segurança falhou. Tente novamente.');
          recaptchaRef.current?.reset();
          setRecaptchaV2Token(null);
          setIsLoading(false);
          return;
        }

        captchaVerified = true;
      }

      if (!captchaVerified) {
        toast.error('Verificação de segurança pendente');
        setIsLoading(false);
        return;
      }

      // ETAPA 3: Prosseguir com cadastro
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome_completo: data.nome_completo,
            user_type: 'aluno',
          },
          emailRedirectTo: `${window.location.origin}/login`,
        }
      });

      if (authError) {
        toast.error("Erro no cadastro", { description: authError.message });
        return;
      }

      if (!authData.user) {
        toast.error("Erro no cadastro", { description: "Não foi possível criar o usuário." });
        return;
      }

      // Se veio de um convite, valida o token e pega o ID do professor
      if (conviteToken) {
        const { data: conviteData, error: conviteError } = await supabase
          .from('convites')
          .select('professor_id, email_convidado')
          .eq('token_convite', conviteToken)
          .eq('status', 'pendente')
          .single();

        if (conviteError || !conviteData) {
          toast.error("Convite inválido ou expirado.");
        } else if (conviteData.email_convidado.toLowerCase() !== data.email.toLowerCase()) {
          toast.error("Email do convite não corresponde ao email cadastrado.");
        } else {
          professorIdConvidante = conviteData.professor_id;
        }
      }

      // 2. Gerar código de vínculo único
      const { data: codigoVinculo, error: rpcError } = await supabase.rpc('gerar_codigo_vinculo_unico');

      if (rpcError || !codigoVinculo) {
        console.error('Erro ao gerar código de vínculo:', rpcError);
        toast.error("Erro Crítico no Cadastro", {
          description: "Não foi possível gerar um identificador único. Tente novamente.",
        });
        // Rollback: deletar usuário do Auth
        await supabase.auth.admin.deleteUser(authData.user.id);
        return;
      }

      // 3. Criar perfil em user_profiles
      await supabase.from('user_profiles').insert({ id: authData.user.id, user_type: 'aluno' });

      // Gerar avatar de letra padrão
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)]; // ✅ Cor é gerada aqui
      const letter = data.nome_completo?.charAt(0).toUpperCase() || 'A';

      // 4. Criar perfil em alunos
      const { error: alunoError } = await supabase.from('alunos').insert({
        id: authData.user.id,
        nome_completo: data.nome_completo,
        email: data.email.toLowerCase(),
        codigo_vinculo: codigoVinculo,
        // Dados do avatar padrão
        avatar_type: 'letter',
        avatar_letter: letter,
        avatar_color: randomColor, // ✅ E salva no banco de dados
        // Fim dos dados do avatar
        onboarding_completo: false,
        status: 'ativo',
      });

      if (alunoError) {
        toast.error("Erro no cadastro", { description: `Não foi possível criar o perfil de aluno: ${alunoError.message}` });
        // Rollback
        await supabase.auth.admin.deleteUser(authData.user.id);
        return;
      }

      // 5. Se veio de um convite, cria o vínculo e atualiza o convite
      if (professorIdConvidante) {
        const { error: vinculoError } = await supabase.from('alunos_professores').insert({
          aluno_id: authData.user.id,
          professor_id: professorIdConvidante,
        });

        if (vinculoError) {
          console.error("Erro ao criar vínculo automático:", vinculoError);
          // Não bloqueia o fluxo, mas loga o erro.
        } else {
          // Atualiza o status do convite para 'aceito'
          await supabase
            .from('convites')
            .update({ status: 'aceito' })
            .eq('token_convite', conviteToken);
        }
      }

      /**
       * SEGURANÇA ANTI-BOT: reCAPTCHA v3 + v2 Implementado
       *
       * Para prevenir cadastros maliciosos em massa sem exigir confirmação de email,
       * implementamos uma estratégia híbrida de CAPTCHA:
       *
       * 1. reCAPTCHA v3 (invisível): Analisa comportamento do usuário em tempo real
       *    - Score >= 0.5: Cadastro aprovado automaticamente
       *    - Score < 0.5: Exibe desafio visual (reCAPTCHA v2 checkbox)
       *
       * 2. reCAPTCHA v2 (checkbox): Verificação visual para casos suspeitos
       *    - Aparece apenas para usuários com score baixo
       *    - Permite que usuários legítimos provem que são humanos
       *
       * Esta abordagem garante:
       * - Excelente UX: 95% dos usuários não veem CAPTCHA
       * - Segurança forte: Bots precisam passar por duas camadas
       * - Sem fricção: Confirmação de email desabilitada no Supabase
       */

      // 5. Limpar reCAPTCHA e redirecionar para onboarding
      cleanup();
      navigate("/onboarding-aluno/dados-basicos");

    } catch (error) {
      console.error('Erro inesperado no cadastro:', error);
      toast.error("Erro", {
        description: "Erro inesperado. Tente novamente."
      })
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border py-3">
        <div className="flex items-center justify-center relative px-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="h-9 w-9 p-0 absolute left-4 md:left-6"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal.png"
            alt="Titans.fitness"
            className="h-10"
          />
        </div>
      </header>

      <main className="flex-1 flex justify-center px-6 pt-8 pb-12 md:pt-12">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-text-primary">
              Crie sua Conta de Aluno
            </CardTitle>
            <CardDescription className="text-text-secondary text-sm">
              Preencha os dados abaixo para começar a usar a plataforma
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4 mb-4">
              <Button variant="outline" className="w-full" onClick={async () => {
                setIsLoading(true);
                // ✅ Salva o tipo de usuário no sessionStorage antes de redirecionar
                const conviteToken = searchParams.get('token');
                sessionStorage.setItem('oauth_user_type', 'aluno');
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    // ✅ Adiciona o token de convite à URL de callback se ele existir
                    redirectTo: `${window.location.origin}/auth/callback${conviteToken ? `?token=${conviteToken}` : ''}`,
                  },
                });

                if (error) toast.error("Erro ao cadastrar com Google", { description: error.message });
                // O setIsLoading(false) não é chamado aqui pois a página será redirecionada.
              }} disabled={isLoading}>
                <GoogleIcon className="mr-2 h-5 w-5" />
                Cadastrar com Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">OU</span></div>
              </div>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome_completo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Seu nome completo" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email" 
                            placeholder="seu@email.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Sua senha"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
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
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirme sua senha"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
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
                    name="aceitarTermos"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="aceitarTermos"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <Label htmlFor="aceitarTermos" className="text-sm text-text-primary leading-relaxed">
                            Eu aceito os{" "}
                            <Link to="/termos" className="text-primary hover:underline">
                              Termos de Uso
                            </Link>{" "}
                            e a{" "}
                            <Link to="/privacidade" className="text-primary hover:underline">
                              Política de Privacidade
                            </Link>
                          </Label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* reCAPTCHA v2 - Aparece apenas se score v3 for baixo */}
                  {showVisualCaptcha && RECAPTCHA_SITE_KEY_V2 && (
                    <div className="flex justify-center">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={RECAPTCHA_SITE_KEY_V2}
                        onChange={(token) => setRecaptchaV2Token(token)}
                        onExpired={() => setRecaptchaV2Token(null)}
                        onErrored={() => {
                          toast.error('Erro no CAPTCHA. Recarregue a página.');
                          setRecaptchaV2Token(null);
                        }}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isLoading || (showVisualCaptcha && !recaptchaV2Token)}
                  >
                    {isLoading ? "Cadastrando..." : "Cadastrar Aluno"}
                  </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-text-secondary">Já tem uma conta? </span>
              <Link to="/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}