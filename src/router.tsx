// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";
import ProtectedRoutes from "./components/layout/ProtectedRoutes";

// --- Public Pages ---
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ConfirmacaoEmail from "./pages/ConfirmacaoEmail";
import EsqueciSenha from "./pages/EsqueciSenha";
import ResetarSenha from "./pages/ResetarSenha";
import ConviteInvalido from "./pages/ConviteInvalido";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";

// --- Onboarding & Cadastro ---
import UserTypeSelection from "./pages/UserTypeSelection";
import CadastroPersonalTrainer from "./pages/CadastroPersonalTrainer";
import CadastroAluno from "./pages/CadastroAluno";
import OnboardingAlunoDadosBasicos from "./pages/OnboardingAlunoDadosBasicos";
import OnboardingAlunoDescricaoSaude from "./pages/OnboardingAlunoQuestionarioSaude";
import OnboardingPTInformacoesBasicas from "./pages/OnboardingPTInformacoesBasicas";
import OnboardingPTExperienciaProfissional from "./pages/OnboardingPTExperienciaProfissional";
import OnboardingPTRedesSociais from "./pages/OnboardingPTRedesSociais";

// --- PT Pages ---
import IndexPT from "./pages/IndexPT";
import AlunosPT from "./pages/AlunosPT";
import DetalhesAluno from "./pages/DetalhesAluno";
import AlunosAvaliacoes from "./pages/AlunosAvaliacoes";
import AlunosAvaliacaoNova from "./pages/AlunosAvaliacaoNova";
import AlunosAvaliacaoDetalhes from "./pages/AlunosAvaliacaoDetalhes";
import AlunosRotinaDetalhes from "./pages/AlunosRotinaDetalhes";
import AlunosParQ from "./pages/AlunosParQ";
import RotinaConfiguracao from "./pages/RotinaConfiguracao";
import RotinaTreinos from "./pages/RotinaTreinos";
import RotinaExercicios from "./pages/RotinaExercicios";
import RotinaRevisao from "./pages/RotinaRevisao";
import ExerciciosPT from "./pages/ExerciciosPT";
import NovoExercicio from "./pages/NovoExercicio";
import CopiaExercicio from "./pages/CopiaExercicio";
import EditarExercicio from "./pages/EditarExercicio";
import DetalhesExercicio from "./pages/DetalhesExercicio";
import MensagensPT from "./pages/MensagensPT";
import ConfiguracoesPT from "./pages/ConfiguracoesPT";
import PerfilPT from "./pages/PerfilPT";
import ConviteAluno from "./pages/ConviteAluno";

// --- Aluno Pages ---
import IndexAluno from "./pages/IndexAluno";
import AvaliacoesAluno from "./pages/AvaliacoesAluno";
import PerfilAluno from "./pages/PerfilAluno";

// --- Shared (PT & Aluno) Pages ---
import PaginaRotinas from "./pages/PaginaRotinas";
import ExecucaoSelecionarTreino from "./pages/ExecucaoSelecionarTreino";
import ExecucaoExecutarTreino from "./pages/ExecucaoExecutarTreino";

export const router = createBrowserRouter([
  // Rotas Públicas
  { path: "/", element: <Index />, errorElement: <NotFound /> },
  { path: "/login", element: <Login /> },
  { path: "/cadastro", element: <UserTypeSelection /> },
  { path: "/cadastro/personal-trainer", element: <CadastroPersonalTrainer /> },
  { path: "/cadastro/aluno", element: <CadastroAluno /> },
  { path: "/confirmacao-email", element: <ConfirmacaoEmail /> },
  { path: "/esqueci-senha", element: <EsqueciSenha /> },
  { path: "/resetar-senha", element: <ResetarSenha /> },
  { path: "/convite-invalido", element: <ConviteInvalido /> },
  { path: "/termos", element: <Termos /> },
  { path: "/privacidade", element: <Privacidade /> },

  // Rotas de Onboarding (sem layout, mas protegidas)
  { path: "/onboarding-aluno/dados-basicos", element: <AuthGuard><OnboardingAlunoDadosBasicos /></AuthGuard> },
  { path: "/onboarding-aluno/descricao-saude", element: <AuthGuard><OnboardingAlunoDescricaoSaude /></AuthGuard> },
  { path: "/onboarding-pt/informacoes-basicas", element: <AuthGuard><OnboardingPTInformacoesBasicas /></AuthGuard> },
  { path: "/onboarding-pt/experiencia-profissional", element: <AuthGuard><OnboardingPTExperienciaProfissional /></AuthGuard> },
  { path: "/onboarding-pt/redes-sociais", element: <AuthGuard><OnboardingPTRedesSociais /></AuthGuard> },

  // Rotas Protegidas (com layout)
  {
    element: <AuthGuard><ProtectedRoutes /></AuthGuard>,
    children: [
      // Rotas do PT
      { path: "/index-pt", element: <IndexPT /> },
      { path: "/alunos", element: <AlunosPT /> },
      { path: "/detalhes-aluno/:id", element: <DetalhesAluno /> },
      { path: "/alunos-avaliacoes/:id", element: <AlunosAvaliacoes /> },
      { path: "/alunos-avaliacoes/:id/nova", element: <AlunosAvaliacaoNova /> },
      { path: "/alunos-avaliacoes/:id/:avaliacaoId", element: <AlunosAvaliacaoDetalhes /> },
      { path: "/alunos-rotinas/:id", element: <PaginaRotinas modo="personal" /> },
      { path: "/alunos-rotinas/:id/:rotinaId", element: <AlunosRotinaDetalhes /> },
      { path: "/alunos-parq/:id", element: <AlunosParQ /> },
      { path: "/rotinas-criar/:alunoId/configuracao", element: <RotinaConfiguracao /> },
      { path: "/rotinas-criar/:alunoId/treinos", element: <RotinaTreinos /> },
      { path: "/rotinas-criar/:alunoId/exercicios", element: <RotinaExercicios /> },
      { path: "/rotinas-criar/:alunoId/revisao", element: <RotinaRevisao /> },
      { path: "/exercicios-pt", element: <ExerciciosPT /> },
      { path: "/exercicios-pt/novo", element: <NovoExercicio /> },
      { path: "/exercicios-pt/copia/:id", element: <CopiaExercicio /> },
      { path: "/exercicios-pt/editar/:id", element: <EditarExercicio /> },
      { path: "/exercicios-pt/detalhes/:id", element: <DetalhesExercicio /> },
      { path: "/mensagens-pt", element: <MensagensPT /> },
      { path: "/configuracoes-pt", element: <ConfiguracoesPT /> },
      { path: "/perfil-pt", element: <PerfilPT /> },
      { path: "/convite-aluno", element: <ConviteAluno /> },

      // Rotas do Aluno
      { path: "/index-aluno", element: <IndexAluno /> },
      { path: "/avaliacoes-aluno", element: <AvaliacoesAluno /> },
      { path: "/perfil-aluno", element: <PerfilAluno /> },
      { path: "/minhas-rotinas", element: <PaginaRotinas modo="aluno" /> },

      // Rotas de Execução (Compartilhadas)
      { path: "/execucao-rotina/selecionar-treino/:rotinaId", element: <ExecucaoSelecionarTreino /> },
      { path: "/execucao-rotina/executar-treino/:sessaoId", element: <ExecucaoExecutarTreino /> },
    ],
  },
]);
