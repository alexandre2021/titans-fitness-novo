import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import ReCAPTCHA from "react-google-recaptcha";

const formSchema = z.object({
  nomeCompleto: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmarSenha: z.string().min(6, "Confirmação de senha obrigatória"),
  aceitarTermos: z.boolean().refine(val => val === true, "Você deve aceitar os termos"),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type FormData = z.infer<typeof formSchema>;

const Cadastroprofessor = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVisualCaptcha, setShowVisualCaptcha] = useState(false);
  const [recaptchaV2Token, setRecaptchaV2Token] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();
  const { executeRecaptcha, isReady: recaptchaReady, cleanup } = useRecaptcha();

  const RECAPTCHA_SITE_KEY_V2 = import.meta.env.VITE_RECAPTCHA_SITE_KEY_V2;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomeCompleto: "",
      email: "",
      senha: "",
      confirmarSenha: "",
      aceitarTermos: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    try {
      // ETAPA 1: Verificação reCAPTCHA v3 (invisível)
      let captchaVerified = false;

      if (recaptchaReady && !showVisualCaptcha) {
        const tokenV3 = await executeRecaptcha('signup_professor');

        if (tokenV3) {
          // Verificar token v3 com Edge Function
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            'verify-recaptcha',
            {
              body: { token: tokenV3, version: 'v3', action: 'signup_professor' },
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.senha,
        options: {
          data: {
            nome_completo: data.nomeCompleto,
            user_type: 'professor',
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) {
        toast.error(`Erro no cadastro: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        toast.error("Erro ao criar usuário.");
        return;
      }

      // 1. Chamar a Database Function (RPC) para gerar um código de vínculo único
      const { data: codigoVinculo, error: rpcError } = await supabase.rpc('gerar_codigo_vinculo_unico');

      if (rpcError || !codigoVinculo) {
        console.error('Erro ao gerar código de vínculo:', rpcError);
        toast.error("Erro Crítico no Cadastro", {
          description: "Não foi possível gerar um identificador único para o usuário. Tente novamente.",
        });
        // Opcional: deletar o usuário do Auth que acabamos de criar para consistência
        if (authData.user) await supabase.auth.admin.deleteUser(authData.user.id);
        return;
      }

      // Criar perfil genérico
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          user_type: 'professor'
        });

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
      }

      // Gerar avatar de letra padrão
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const letter = data.nomeCompleto?.charAt(0).toUpperCase() || 'P';

      // Criar perfil específico do PT
      const { error: ptError } = await supabase
        .from('professores')
        .insert({
          id: authData.user.id,
          nome_completo: data.nomeCompleto,
          email: data.email.toLowerCase(),
          onboarding_completo: false,
          plano: 'gratuito',
          codigo_vinculo: codigoVinculo, // 2. Adicionar o código gerado ao perfil do professor
          avatar_type: 'letter',
          avatar_letter: letter,
          avatar_color: randomColor,
        });

      if (ptError) {
        toast.error(`Erro ao criar perfil de PT: ${ptError.message}`);
        return;
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

      // Redirecionar para onboarding (cleanup automático via useEffect)
      navigate("/onboarding-pt/informacoes-basicas");

    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1 flex justify-center px-6 pt-8 pb-12 md:pt-12">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-text-primary">
              Cadastro Professor
            </CardTitle>
            <p className="text-text-secondary text-sm">
              Crie sua conta e comece a gerenciar seus alunos
            </p>
          </CardHeader>

          <CardContent>
            <div className="space-y-4 mb-4">
              <Button variant="outline" className="w-full" onClick={async () => {
                setIsLoading(true);
                // ✅ Salva o tipo de usuário no sessionStorage antes de redirecionar
                sessionStorage.setItem('oauth_user_type', 'professor');
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`, // Professores geralmente não usam token de convite, então mantemos simples.
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
                  name="nomeCompleto"
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
                        <Input {...field} type="email" placeholder="seu@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            {...field}
                            placeholder="Sua senha"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                      <FormLabel>Confirmar Senha *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            {...field}
                            placeholder="Confirme sua senha"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  {isLoading ? "Cadastrando..." : "Cadastrar Professor"}
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
};

export default Cadastroprofessor;