import React from "react";
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
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import DashboardPT from "./pages/DashboardPT";
import DashboardAluno from "./pages/DashboardAluno";
import OnboardingAlunoDadosBasicos from "./pages/OnboardingAlunoDadosBasicos";
import OnboardingAlunoDescricaoSaude from "./pages/OnboardingAlunoDescricaoSaude";
import AlunoLayout from "./components/layout/AlunoLayout";
import IndexAluno from "./pages/IndexAluno";
import TreinosAluno from "./pages/TreinosAluno";
import AvaliacoesAluno from "./pages/AvaliacoesAluno";
import PerfilAluno from "./pages/PerfilAluno";
import OnboardingPTInformacoesBasicas from "./pages/OnboardingPTInformacoesBasicas";
import OnboardingPTExperienciaProfissional from "./pages/OnboardingPTExperienciaProfissional";
import OnboardingPTRedesSociais from "./pages/OnboardingPTRedesSociais";
import PTLayout from "./components/layout/PTLayout";
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
import AlunosAvaliacoes from "./pages/AlunosAvaliacoes";
import AlunosRotinas from "./pages/AlunosRotinas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthGuard>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/cadastro" element={<UserTypeSelection />} />
              <Route path="/cadastro/personal-trainer" element={<CadastroPersonalTrainer />} />
              <Route path="/cadastro/aluno" element={<CadastroAluno />} />
              <Route path="/confirmacao-email" element={<ConfirmacaoEmail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/termos" element={<Termos />} />
              <Route path="/privacidade" element={<Privacidade />} />
              {/* Personal Trainer Routes */}
              <Route path="/index-pt" element={<PTLayout />}>
                <Route index element={<IndexPT />} />
              </Route>
              <Route path="/alunos" element={<PTLayout />}>
                <Route index element={<AlunosPT />} />
              </Route>
              <Route path="/convite-aluno" element={<PTLayout />}>
                <Route index element={<ConviteAluno />} />
              </Route>
              <Route path="/exercicios-pt" element={<PTLayout />}>
                <Route index element={<ExerciciosPT />} />
              </Route>
              <Route path="/agenda-pt" element={<PTLayout />}>
                <Route index element={<AgendaPT />} />
              </Route>
              <Route path="/mensagens-pt" element={<PTLayout />}>
                <Route index element={<MensagensPT />} />
              </Route>
              <Route path="/perfil-pt" element={<PTLayout />}>
                <Route index element={<PerfilPT />} />
              </Route>
              <Route path="/configuracoes-pt" element={<PTLayout />}>
                <Route index element={<ConfiguracoesPT />} />
              </Route>
              <Route path="/detalhes-aluno/:id" element={<PTLayout />}>
                <Route index element={<DetalhesAluno />} />
              </Route>
              <Route path="/alunos-parq/:id" element={<PTLayout />}>
                <Route index element={<AlunosParQ />} />
              </Route>
              <Route path="/alunos-avaliacoes/:id" element={<PTLayout />}>
                <Route index element={<AlunosAvaliacoes />} />
              </Route>
              <Route path="/alunos-rotinas/:id" element={<PTLayout />}>
                <Route index element={<AlunosRotinas />} />
              </Route>
              
              {/* Aluno Routes */}
              <Route path="/index-aluno" element={<AlunoLayout />}>
                <Route index element={<IndexAluno />} />
              </Route>
              <Route path="/treinos-aluno" element={<AlunoLayout />}>
                <Route index element={<TreinosAluno />} />
              </Route>
              <Route path="/avaliacoes-aluno" element={<AlunoLayout />}>
                <Route index element={<AvaliacoesAluno />} />
              </Route>
              <Route path="/perfil-aluno" element={<AlunoLayout />}>
                <Route index element={<PerfilAluno />} />
              </Route>
              
              {/* Onboarding Routes */}
              <Route path="/onboarding-aluno/dados-basicos" element={<OnboardingAlunoDadosBasicos />} />
              <Route path="/onboarding-aluno/descricao-saude" element={<OnboardingAlunoDescricaoSaude />} />
              <Route path="/onboarding-pt/informacoes-basicas" element={<OnboardingPTInformacoesBasicas />} />
              <Route path="/onboarding-pt/experiencia-profissional" element={<OnboardingPTExperienciaProfissional />} />
              <Route path="/onboarding-pt/redes-sociais" element={<OnboardingPTRedesSociais />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGuard>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;