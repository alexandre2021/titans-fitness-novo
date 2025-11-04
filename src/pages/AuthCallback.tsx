import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UserTypeSelectionModal } from "@/components/UserTypeSelectionModal";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Função auxiliar para criar o perfil do usuário
  const createUserProfile = useCallback(async (user: User, userType: 'aluno' | 'professor', conviteToken: string | null) => {
    let professorIdConvidante: string | null = null;

    // 3.1. Cria a entrada em `user_profiles`.
    const { error: profileInsertError } = await supabase
      .from('user_profiles')
      .insert({ id: user.id, user_type: userType });

    if (profileInsertError) throw profileInsertError;
    console.log("✅ [AuthCallback] Perfil criado em 'user_profiles'");

    // 3.2. Cria a entrada na tabela específica (alunos ou professores).
    const nomeCompleto = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Novo Usuário';
    const email = user.email?.toLowerCase();
    const letter = nomeCompleto?.charAt(0).toUpperCase() || 'A';
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // ✅ Lógica de convite (apenas para alunos)
    if (conviteToken && userType === 'aluno') {
      const { data: conviteData, error: conviteError } = await supabase
        .from('convites')
        .select('professor_id, email_convidado')
        .eq('token_convite', conviteToken)
        .eq('status', 'pendente')
        .single();

      if (!conviteError && conviteData && conviteData.email_convidado.toLowerCase() === email?.toLowerCase()) {
        professorIdConvidante = conviteData.professor_id;
      }
    }

    if (userType === 'aluno') {
      const { data: codigoVinculo, error: rpcError } = await supabase.rpc('gerar_codigo_vinculo_unico');
      if (rpcError || !codigoVinculo) throw new Error("Falha ao gerar código de vínculo para aluno.");

      const { error: alunoInsertError } = await supabase.from('alunos').insert({
        id: user.id,
        nome_completo: nomeCompleto,
        email: email,
        codigo_vinculo: codigoVinculo,
        onboarding_completo: false,
        status: 'ativo',
        avatar_type: 'letter',
        avatar_image_url: null,
        avatar_letter: letter,
        avatar_color: randomColor,
      });
      if (alunoInsertError) throw alunoInsertError;
      console.log("✅ [AuthCallback] Perfil criado em 'alunos'. Redirecionando para onboarding.");

      // ✅ Cria o vínculo e atualiza o convite se veio de um
      if (professorIdConvidante) {
        await supabase.from('alunos_professores').insert({
          aluno_id: user.id,
          professor_id: professorIdConvidante,
        });
        await supabase
          .from('convites')
          .update({ status: 'aceito', aluno_id: user.id })
          .eq('token_convite', conviteToken);
        console.log(`✅ [AuthCallback] Vínculo automático criado para o professor ${professorIdConvidante}`);
      }

      navigate('/onboarding-aluno/dados-basicos', { replace: true });

    } else if (userType === 'professor') {
      const { data: codigoVinculo, error: rpcError } = await supabase.rpc('gerar_codigo_vinculo_unico');
      if (rpcError || !codigoVinculo) throw new Error("Falha ao gerar código de vínculo para professor.");

      const { error: ptInsertError } = await supabase.from('professores').insert({
        id: user.id,
        nome_completo: nomeCompleto,
        email: email,
        onboarding_completo: false,
        plano: 'gratuito',
        codigo_vinculo: codigoVinculo,
        avatar_type: 'letter',
        avatar_image_url: null,
                avatar_letter: letter,
                avatar_color: randomColor,
      });
      if (ptInsertError) throw ptInsertError;
      console.log("✅ [AuthCallback] Perfil criado em 'professores'. Redirecionando para onboarding.");
      navigate('/onboarding-pt/informacoes-basicas', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    // ✅ CORREÇÃO: Usar uma função async auto-executável para um fluxo mais controlado.
    // Isso evita os múltiplos disparos do onAuthStateChange que podem causar o loop.
    (async () => {
      // Espera a sessão ser estabelecida a partir da URL.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Limpa o hash da URL para evitar que a lógica seja re-executada em um re-render.
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (sessionError) {
        toast.error("Erro de Autenticação", { description: sessionError.message });
        navigate('/login', { replace: true });
        return;
      }

      if (!session) {
        // Se não há sessão, pode ser um acesso direto à URL. Aguarda um pouco e tenta de novo.
        // Se ainda assim não houver, redireciona para o login.
        setTimeout(async () => {
          const { data: { session: secondTrySession } } = await supabase.auth.getSession();
          if (!secondTrySession) {
            toast.error("Sessão inválida", { description: "Não foi possível validar sua sessão. Por favor, tente fazer login novamente." });
            navigate('/login', { replace: true });
          }
        }, 2000);
        return;
      }

      try {
        const user = session.user;
        const conviteToken = searchParams.get('token');

        // 1. Verifica se o perfil já existe.
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        // 2. Se o perfil já existe, é um login. Redireciona.
        if (profile) {
          const redirectTo = profile.user_type === 'professor' ? '/index-professor' : '/index-aluno';
          navigate(redirectTo, { replace: true });
          return;
        }

        // 3. Se não existe perfil, é um novo usuário.
        const userTypeFromStorage = sessionStorage.getItem('oauth_user_type');

        if (userTypeFromStorage === 'aluno' || userTypeFromStorage === 'professor') {
          sessionStorage.removeItem('oauth_user_type');
          await createUserProfile(user, userTypeFromStorage, conviteToken);
        } else {
          // 4. Fallback: Precisa escolher o tipo de usuário.
          console.log("⚠️ [AuthCallback] Usuário OAuth sem tipo definido. Mostrando modal de seleção.");
          sessionStorage.removeItem('oauth_user_type');
          setPendingUser(user);
          setShowTypeModal(true);
        }
      } catch (error) {
        sessionStorage.removeItem('oauth_user_type');
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        toast.error("Erro no Login", { description: `Não foi possível finalizar seu cadastro: ${errorMessage}` });
        navigate('/login', { replace: true });
      }
    })();
    // O array de dependências vazio `[]` garante que este useEffect execute apenas uma vez.
  }, [navigate, searchParams, createUserProfile]);

  // Handler para quando o usuário seleciona o tipo na modal
  const handleTypeSelection = useCallback(async (selectedType: 'aluno' | 'professor') => {
    if (!pendingUser) return;

    setShowTypeModal(false);
    
    try {
      await createUserProfile(pendingUser, selectedType, null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      console.error("❌ [AuthCallback] Erro ao criar perfil após seleção:", error);
      toast.error("Erro ao criar perfil", { description: errorMessage });
      navigate('/login', { replace: true });
    }
  }, [createUserProfile, navigate, pendingUser]);

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Finalizando login...</p>
          <p className="text-xs text-muted-foreground mt-2">Aguarde alguns instantes...</p>
        </div>
      </div>

      <UserTypeSelectionModal 
        open={showTypeModal}
        onSelectType={handleTypeSelection}
      />
    </>
  );
};

export default AuthCallback;