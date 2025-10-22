import React from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthProvider";
import AuthGuard from "@/components/AuthGuard";
import Index from "./pages/Index";
import NovoExercicio from "./pages/NovoExercicio";
import CopiaExercicio from "./pages/CopiaExercicio";
import EditarExercicio from "./pages/EditarExercicio";
import DetalhesExercicio from "./pages/DetalhesExercicio";
import NotFound from "./pages/NotFound";
import UserTypeSelection from "./pages/UserTypeSelection";
import CadastroProfessor from "./pages/CadastroProfessor";
import CadastroAluno from "./pages/CadastroAluno";
import ConfirmacaoEmail from "./pages/ConfirmacaoEmail";
import Login from "./pages/Login";
import Termos from "./pages/Termos"; 
import Privacidade from "./pages/Privacidade"; 
import OnboardingAlunoDadosBasicos from "./pages/OnboardingAlunoDadosBasicos";
import OnboardingAlunoDescricaoSaude from "./pages/OnboardingAlunoQuestionarioSaude";
import IndexAluno from "./pages/IndexAluno";
import AvaliacoesAluno from "./pages/AvaliacoesAluno";
import PerfilAluno from "./pages/PerfilAluno";
import OnboardingPTInformacoesBasicas from "./pages/OnboardingPTInformacoesBasicas";
import OnboardingPTExperienciaProfissional from "./pages/OnboardingPTExperienciaProfissional";
import OnboardingPTRedesSociais from "./pages/OnboardingPTRedesSociais";
import ProtectedRoutes from "./components/layout/ProtectedRoutes";
import IndexProfessor from "./pages/IndexProfessor";
import AlunosPT from "./pages/AlunosPT";
import ExerciciosPT from "./pages/ExerciciosPT";
import AgendaPT from "./pages/AgendaPT";
import MensagensPT from "./pages/MensagensPT";
import PerfilPT from "./pages/PerfilPT";
import ConfiguracoesPT from "./pages/ConfiguracoesPT";
import DetalhesAluno from "./pages/DetalhesAluno";
import AlunosParQ from "./pages/AlunosParQ";
import PaginaRotinas from "./pages/PaginaRotinas";
import AlunosAvaliacoes from "./pages/AlunosAvaliacoes";
import AlunosAvaliacaoNova from "./pages/AlunosAvaliacaoNova";
import AlunosAvaliacaoDetalhes from "./pages/AlunosAvaliacaoDetalhes"; 
import AlunosRotinaDetalhes from "./pages/AlunosRotinaDetalhes"; 
import RotinaCriacao from "./pages/RotinaCriacao";
import MeusModelos from "./pages/MeusModelos";
import NovoModelo from "./pages/NovoModelo";
import EditarModelo from "./pages/EditarModelo";
import EsqueciSenha from "./pages/EsqueciSenha";
import Mais from "./pages/Mais";
import NovoModeloSelecao from "./pages/NovoModeloSelecao";
import ResetarSenha from "./pages/ResetarSenha";
import Funcionalidades from "./pages/Funcionalidades.tsx";
import NovoPost from "./pages/NovoPost";
import EditarPost from "./pages/EditarPost";
import PostPage from "./pages/Post";
import MeusPosts from "./pages/MeusPosts";
import EditarExercicioPadrao from "./pages/EditarExercicioPadrao";
import CentralDeAjuda from "./pages/CentralDeAjuda";
import CentralDeAjudaPublica from "./pages/CentralDeAjudaPublica"; // Importar o novo componente
import Contato from "./pages/Contato";
import PerguntasFrequentes from "./pages/PerguntasFrequentes";
import Blog from "./pages/Blog";
import NovoExercicioPadrao from "./pages/NovoExercicioPadrao";

// NOVAS IMPORTAÇÕES PARA EXECUÇÃO
import RotinasPT from "./pages/RotinasPT.tsx";
import AvaliacoesPT from "./pages/AvaliacoesPT.tsx";
import ExecucaoSelecionarTreino from "./pages/ExecucaoSelecionarTreino";
import ExecucaoExecutarTreino from "./pages/ExecucaoExecutarTreino";

// IMPORTAÇÕES PARA PWA
import PwaUpdateNotification from "@/components/pwa/PwaUpdateNotification";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import AdminPostGuard from "./components/auth/AdminPostGuard";
import Calendario from "./pages/Calendario";
import Professores from "./pages/Professores";
import DetalhesProfessor from "./pages/DetalhesProfessor";
import SobreNos from "./pages/SobreNos";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />
  },
  { path: "/funcionalidades", element: <Funcionalidades /> },
  { path: "/cadastro", element: <UserTypeSelection /> },
  { path: "/cadastro/professor", element: <CadastroProfessor /> },
  { path: "/cadastro/aluno", element: <CadastroAluno /> },
  { path: "/confirmacao-email", element: <ConfirmacaoEmail /> },
  { path: "/login", element: <Login /> },
  { path: "/termos", element: <Termos /> },
  { path: "/privacidade", element: <Privacidade /> },
  { path: "/esqueci-senha", element: <EsqueciSenha /> },
  { path: "/contato", element: <Contato /> },
  { path: "/sobre", element: <SobreNos /> },
  { path: "/central-de-ajuda", element: <CentralDeAjudaPublica /> }, // Usar o novo componente aqui
  { path: "/faq", element: <PerguntasFrequentes /> },
  { path: "/resetar-senha", element: <ResetarSenha /> },
  { path: "/blog", element: <Blog /> },
  { path: "/blog/:slug", element: <PostPage /> },
  {
    element: <AuthGuard><Outlet /></AuthGuard>,
    children: [
      // Onboarding routes (sem layout principal)
      { path: "/onboarding-aluno/dados-basicos", element: <OnboardingAlunoDadosBasicos /> },
      { path: "/onboarding-aluno/descricao-saude", element: <OnboardingAlunoDescricaoSaude /> },
      { path: "/onboarding-pt/informacoes-basicas", element: <OnboardingPTInformacoesBasicas /> },
      { path: "/onboarding-pt/experiencia-profissional", element: <OnboardingPTExperienciaProfissional /> },
      { path: "/onboarding-pt/redes-sociais", element: <OnboardingPTRedesSociais /> },
      // Rotas de criação de modelo e rotina (sem layout principal para modo de foco)
      { path: "/modelos/novo", element: <NovoModelo /> },
      { path: "/modelos/editar/:modeloId", element: <EditarModelo /> },
      { path: "/rotinas-criar/:alunoId", element: <RotinaCriacao /> },
      { path: "/selecionar-modelo", element: <NovoModeloSelecao /> },
      // Rotas protegidas com layout (PT e Aluno)
      {
        element: <ProtectedRoutes />,
        children: [
          // Rotas do PT
          // Adicionado redirecionamento da rota antiga para a nova
          { path: "/index-pt", element: <Navigate to="/index-professor" replace /> },
          { path: "/index-professor", element: <IndexProfessor /> },
          { path: "/alunos", element: <AlunosPT /> },
          { path: "/exercicios", element: <ExerciciosPT /> },
          { path: "/exercicios/novo", element: <NovoExercicio /> },
          { path: "/exercicios/copia/:id", element: <CopiaExercicio /> },
          { path: "/exercicios/editar/:id", element: <EditarExercicio /> },
          { path: "/exercicios/editar-padrao/:id", element: <EditarExercicioPadrao /> },
          { path: "/exercicios/novo-padrao", element: <NovoExercicioPadrao /> },
          { path: "/exercicios/detalhes/:id", element: <DetalhesExercicio /> },
          { path: "/agenda-pt", element: <AgendaPT /> },
          // Rotas de Posts protegidas para o admin
          {
            element: <AdminPostGuard />,
            children: [
              { path: "/meus-posts", element: <MeusPosts /> },
              { path: "/posts/novo", element: <NovoPost /> },
              { path: "/posts/editar/:slug", element: <EditarPost /> },
              { path: "/admin/ajuda", element: <CentralDeAjuda /> },
            ],
          },
          { path: "/mensagens-pt", element: <MensagensPT /> },
          { path: "/perfil-pt", element: <PerfilPT /> },
          { path: "/meus-modelos", element: <MeusModelos /> },
          { path: "/configuracoes-pt", element: <ConfiguracoesPT /> },
          { path: "/avaliacoes", element: <AvaliacoesPT /> },
          { path: "/rotinas", element: <RotinasPT /> }, 
          { path: "/app/ajuda", element: <CentralDeAjuda /> },
          // Rota para a nova página "Mais"
          { path: "/mais", element: <Mais /> },
          { path: "/detalhes-aluno/:id", element: <DetalhesAluno /> },
          { path: "/alunos-parq/:id", element: <AlunosParQ /> },
          { path: "/alunos-rotinas/:id", element: <PaginaRotinas modo="professor" /> },
          { path: "/alunos-avaliacoes/:id", element: <AlunosAvaliacoes /> },
          { path: "/alunos-avaliacoes/:id/nova", element: <AlunosAvaliacaoNova /> },
          { path: "/alunos-avaliacoes/:id/:avaliacaoId", element: <AlunosAvaliacaoDetalhes /> },
          { path: "/alunos-rotinas/:id/:rotinaId", element: <AlunosRotinaDetalhes /> },
          // Rotas do Aluno
          { path: "/index-aluno", element: <IndexAluno /> },
          { path: "/minhas-rotinas", element: <PaginaRotinas modo="aluno" /> },
          { path: "/avaliacoes-aluno", element: <AvaliacoesAluno /> },
          { path: "/perfil-aluno", element: <PerfilAluno /> },
          { 
            path: "/professores/detalhes/:id", 
            element: <DetalhesProfessor /> 
          },
          { path: "/professores", element: <Professores /> },
          // Rotas de Execução (Compartilhadas)
          // Nova rota para o calendário
          { path: "/calendario", element: <Calendario /> },
          { path: "/execucao-rotina/selecionar-treino/:rotinaId", element: <ExecucaoSelecionarTreino /> },
          { path: "/execucao-rotina/executar-treino/:sessaoId", element: <ExecucaoExecutarTreino /> },
        ]
      },
    ]
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

const AppContent = () => {
  return (
    <TooltipProvider>
      {/* Configura o Toaster para aparecer no topo e centro */}
      <Sonner position="top-center" richColors theme="light" />
      <RouterProvider router={router} />
      <PwaUpdateNotification />
      <PwaInstallPrompt />
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider><AppContent /></AuthProvider>
  </QueryClientProvider>
);

export default App;