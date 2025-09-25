import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LoginRedirectButton = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleEnter = () => {
    if (loading) return; // Não faz nada enquanto verifica o estado de autenticação

    if (user) {
      // Usuário está logado, redireciona com base no tipo
      const userType = user.user_metadata?.user_type;
      if (userType === 'professor') {
        navigate('/index-professor');
      } else if (userType === 'aluno') {
        navigate('/index-aluno');
      } else {
        // Fallback se o tipo não estiver definido
        navigate('/login');
      }
    } else {
      // Usuário não está logado, vai para a página de login
      navigate('/login');
    }
  };

  return (
    <Button onClick={handleEnter} disabled={loading}>
      {loading ? 'Verificando...' : 'Entrar'}
    </Button>
  );
};

export default LoginRedirectButton;