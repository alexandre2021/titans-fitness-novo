import React from "react";
import NovoExercicio from "./pages/NovoExercicio";
import CopiaExercicio from "./pages/CopiaExercicio";
import EditarExercicio from "./pages/EditarExercicio";
import DetalhesExercicio from "./pages/DetalhesExercicio";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UserTypeSelection from "./pages/UserTypeSelection";
import CadastroPersonalTrainer from "./pages/CadastroPersonalTrainer";
import CadastroAluno from "./pages/CadastroAluno";
import ConfirmacaoEmail from "./pages/ConfirmacaoEmail";
import Login from "./pages/Login";
import ConviteInvalido from "./pages/ConviteInvalido";
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
import ProtectedRoutes from "./components/layout/ProtectedRoutes"; // ✅ Importa o novo componente
import IndexPT from "./pages/IndexPT";
import AlunosPT from "./pages/AlunosPT";
import ConviteAluno from "./pages/ConviteAluno";
import ExerciciosPT from "./pages/ExerciciosPT";
import AgendaPT from "./pages/AgendaPT";
import MensagensPT from "./pages/MensagensPT";
import PerfilPT from "./pages/PerfilPT";
import ConfiguracoesPT from "./pages/ConfiguracoesPT";
import DetalhesAluno from "./pages/DetalhesAluno";
import AlunosParQ from "./pages/AlunosParQ";
import PaginaRotinas from "./pages/PaginaRotinas"; // ✅ Importa o novo componente de rotinas
import AlunosAvaliacoes from "./pages/AlunosAvaliacoes";
import AlunosAvaliacaoNova from "./pages/AlunosAvaliacaoNova";
import AlunosAvaliacaoDetalhes from "./pages/AlunosAvaliacaoDetalhes"; 
import AlunosRotinaDetalhes from "./pages/AlunosRotinaDetalhes";
import RotinaConfiguracao from "./pages/RotinaConfiguracao";
import RotinaTreinos from "./pages/RotinaTreinos";
import RotinaExercicios from "./pages/RotinaExercicios";
import RotinaRevisao from "./pages/RotinaRevisao";
import EsqueciSenha from "./pages/EsqueciSenha";
import ResetarSenha from "./pages/ResetarSenha";

// ✅ NOVAS IMPORTAÇÕES PARA EXECUÇÃO
import ExecucaoSelecionarTreino from "./pages/ExecucaoSelecionarTreino";
import ExecucaoExecutarTreino from "./pages/ExecucaoExecutarTreino";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ✅ ROTAS PÚBLICAS - SEM AUTHGUARD */}
            <Route path="/" element={<Index />} />
            <Route path="/cadastro" element={<UserTypeSelection />} />
            <Route path="/cadastro/personal-trainer" element={<CadastroPersonalTrainer />} />
            <Route path="/cadastro/aluno" element={<CadastroAluno />} />
            <Route path="/confirmacao-email" element={<ConfirmacaoEmail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/convite-invalido" element={<ConviteInvalido />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/resetar-senha" element={<ResetarSenha />} />
            
            {/* ROTAS DE ONBOARDING (sem layout, mas protegidas) */}
            <Route path="/onboarding-aluno/dados-basicos" element={<AuthGuard><OnboardingAlunoDadosBasicos /></AuthGuard>} />
            <Route path="/onboarding-aluno/descricao-saude" element={<AuthGuard><OnboardingAlunoDescricaoSaude /></AuthGuard>} />
            <Route path="/onboarding-pt/informacoes-basicas" element={<AuthGuard><OnboardingPTInformacoesBasicas /></AuthGuard>} />
            <Route path="/onboarding-pt/experiencia-profissional" element={<AuthGuard><OnboardingPTExperienciaProfissional /></AuthGuard>} />
            <Route path="/onboarding-pt/redes-sociais" element={<AuthGuard><OnboardingPTRedesSociais /></AuthGuard>} />
            
            {/* ✅ ROTAS PROTEGIDAS (PT e Aluno) - O layout é decidido pelo ProtectedRoutes */}
            <Route element={<AuthGuard><ProtectedRoutes /></AuthGuard>}>
              {/* Rotas do PT */}
              <Route path="/index-pt" element={<IndexPT />} />
              <Route path="/alunos" element={<AlunosPT />} />
              <Route path="/convite-aluno" element={<ConviteAluno />} />
              <Route path="/exercicios-pt" element={<ExerciciosPT />} />
              <Route path="/exercicios-pt/novo" element={<NovoExercicio />} />
              <Route path="/exercicios-pt/copia/:id" element={<CopiaExercicio />} />
              <Route path="/exercicios-pt/editar/:id" element={<EditarExercicio />} />
              <Route path="/exercicios-pt/detalhes/:id" element={<DetalhesExercicio />} />
              <Route path="/agenda-pt" element={<AgendaPT />} />
              <Route path="/mensagens-pt" element={<MensagensPT />} />
              <Route path="/perfil-pt" element={<PerfilPT />} />
              <Route path="/configuracoes-pt" element={<ConfiguracoesPT />} />
              <Route path="/detalhes-aluno/:id" element={<DetalhesAluno />} />
              <Route path="/alunos-parq/:id" element={<AlunosParQ />} />
              <Route path="/alunos-rotinas/:id" element={<PaginaRotinas modo="personal" />} />
              <Route path="/alunos-avaliacoes/:id" element={<AlunosAvaliacoes />} />
              <Route path="/alunos-avaliacoes/:id/nova" element={<AlunosAvaliacaoNova />} />
              <Route path="/alunos-avaliacoes/:id/:avaliacaoId" element={<AlunosAvaliacaoDetalhes />} />
              <Route path="/alunos-rotinas/:id/:rotinaId" element={<AlunosRotinaDetalhes />} />
              <Route path="/rotinas-criar/:alunoId/configuracao" element={<RotinaConfiguracao />} /> 
              <Route path="/rotinas-criar/:alunoId/treinos" element={<RotinaTreinos />} />
              <Route path="/rotinas-criar/:alunoId/exercicios" element={<RotinaExercicios />} />
              <Route path="/rotinas-criar/:alunoId/revisao" element={<RotinaRevisao />} />
              {/* Rotas do Aluno */}
              <Route path="/index-aluno" element={<IndexAluno />} />
              <Route path="/minhas-rotinas" element={<PaginaRotinas modo="aluno" />} />
              <Route path="/avaliacoes-aluno" element={<AvaliacoesAluno />} />
              <Route path="/perfil-aluno" element={<PerfilAluno />} />
              {/* Rotas de Execução (Compartilhadas) */}
              <Route path="/execucao-rotina/selecionar-treino/:rotinaId" element={<ExecucaoSelecionarTreino />} />
              <Route path="/execucao-rotina/executar-treino/:sessaoId" element={<ExecucaoExecutarTreino />} />
            </Route>
            
            {/* ✅ 404 - SEMPRE POR ÚLTIMO */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;