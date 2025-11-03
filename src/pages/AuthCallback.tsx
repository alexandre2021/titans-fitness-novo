import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const effectRan = useRef(false);

  useEffect(() => {
    // Previne a execução dupla do useEffect em Strict Mode no desenvolvimento
    if (effectRan.current) return;
    effectRan.current = true;

    const handleAuthCallback = async () => {
      console.log("🔍 [DEBUG] Iniciando handleAuthCallback");
      console.log("🔍 [DEBUG] URL completa:", window.location.href);
      console.log("🔍 [DEBUG] Search params:", Object.fromEntries(searchParams.entries()));

      // O Supabase lida com a sessão a partir do hash da URL automaticamente.
      // O que precisamos é esperar um momento para que a sessão esteja disponível via getSession().
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        console.log("🔍 [DEBUG] Buscando sessão...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log("🔍 [DEBUG] Resultado da sessão:", { session: !!session, error: sessionError });

        if (sessionError) throw new Error(`Erro ao obter sessão: ${sessionError.message}`);
        if (!session?.user) throw new Error("Usuário não encontrado na sessão após o callback.");

        const user = session.user;
        console.log(`✨ Sessão obtida para o usuário: ${user.id}`);
        console.log("🔍 [DEBUG] Metadados do usuário:", user.user_metadata);

        // 1. Verifica se o perfil já existe.
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        // 2. Se o perfil já existe, redireciona para o painel correto.
        if (profile) {
          console.log(`👤 Perfil existente encontrado: ${profile.user_type}. Redirecionando...`);
          navigate(profile.user_type === 'professor' ? '/index-professor' : '/index-aluno', { replace: true });
          return;
        }

        // 3. Se não existe perfil, é um novo usuário OAuth.
        const userTypeFromUrl = searchParams.get('user_type');
        console.log(`✨ Novo usuário OAuth. Tipo da URL: ${userTypeFromUrl}`);

        if (userTypeFromUrl === 'aluno' || userTypeFromUrl === 'professor') {
          // 3.1. Cria a entrada em `user_profiles`.
          const { error: profileInsertError } = await supabase
            .from('user_profiles')
            .insert({ id: user.id, user_type: userTypeFromUrl });

          if (profileInsertError) throw profileInsertError;
          console.log("✅ Perfil criado em 'user_profiles'");

          // 3.2. Cria a entrada na tabela específica (alunos ou professores).
          const nomeCompleto = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Novo Usuário';
          const email = user.email?.toLowerCase();

          if (userTypeFromUrl === 'aluno') {
            const { data: codigoVinculo, error: rpcError } = await supabase.rpc('gerar_codigo_vinculo_unico');
            if (rpcError || !codigoVinculo) throw new Error("Falha ao gerar código de vínculo para aluno.");

            const { error: alunoInsertError } = await supabase.from('alunos').insert({
              id: user.id,
              nome_completo: nomeCompleto,
              email: email,
              codigo_vinculo: codigoVinculo,
              onboarding_completo: false,
              status: 'ativo',
            });
            if (alunoInsertError) throw alunoInsertError;
            console.log("✅ Perfil criado em 'alunos'. Redirecionando para onboarding.");
            navigate('/onboarding-aluno/dados-basicos', { replace: true });

          } else if (userTypeFromUrl === 'professor') {
            const { data: codigoVinculo, error: rpcError } = await supabase.rpc('gerar_codigo_vinculo_unico');
            if (rpcError || !codigoVinculo) throw new Error("Falha ao gerar código de vínculo para professor.");

            const { error: ptInsertError } = await supabase.from('professores').insert({
              id: user.id,
              nome_completo: nomeCompleto,
              email: email,
              onboarding_completo: false,
              plano: 'gratuito',
              codigo_vinculo: codigoVinculo,
            });
            if (ptInsertError) throw ptInsertError;
            console.log("✅ Perfil criado em 'professores'. Redirecionando para onboarding.");
            navigate('/onboarding-pt/informacoes-basicas', { replace: true });
          }
        } else {
          // 4. Fallback: Se não tem perfil e não tem tipo na URL, vai para a seleção.
          console.log("⚠️ Usuário OAuth sem perfil e sem tipo na URL. Redirecionando para /cadastro.");
          navigate('/cadastro', { replace: true });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        console.error("❌ Erro fatal no callback de autenticação:", error);
        toast.error("Erro no Login", { description: `Não foi possível finalizar seu cadastro: ${errorMessage}` });
        navigate('/login', { replace: true });
      }
    };

    void handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Finalizando login...</p>
        <p className="text-xs text-muted-foreground mt-2">Aguarde alguns instantes...</p>
      </div>
    </div>
  );
};

export default AuthCallback;