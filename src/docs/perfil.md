# Arquivos Envolvidos no Processo de Perfil do Usuário

Este documento lista os arquivos e componentes que fazem parte da funcionalidade de perfil de usuário, abrangendo tanto o perfil do Aluno quanto o do Personal Trainer.

## Páginas Principais de Perfil

*   `src/pages/PerfilAluno.tsx`: Página principal do perfil do Aluno.
*   `src/pages/PerfilPT.tsx`: Página principal do perfil do Personal Trainer.

## Páginas de Onboarding e Cadastro

*   `src/pages/UserTypeSelection.tsx`: Página para seleção do tipo de usuário (Aluno/Personal Trainer).
*   `src/pages/CadastroAluno.tsx`: Página de cadastro para Alunos.
*   `src/pages/CadastroPersonalTrainer.tsx`: Página de cadastro para Personal Trainers.
*   `src/pages/Login.tsx`: Página de login, que autentica usuários para acesso aos perfis.
*   `src/pages/OnboardingAlunoDadosBasicos.tsx`: Etapa de onboarding para Alunos - dados básicos.
*   `src/pages/OnboardingAlunoQuestionarioSaude.tsx`: Etapa de onboarding para Alunos - questionário de saúde.
*   `src/pages/OnboardingPTInformacoesBasicas.tsx`: Etapa de onboarding para Personal Trainers - informações básicas.
*   `src/pages/OnboardingPTExperienciaProfissional.tsx`: Etapa de onboarding para Personal Trainers - experiência profissional.
*   `src/pages/OnboardingPTRedesSociais.tsx`: Etapa de onboarding para Personal Trainers - redes sociais.

## Componentes (Pasta `src/components/perfil/`)

*   `src/components/perfil/AlunoAvatarSection.tsx`: Componente para a seção de avatar do perfil do Aluno.
*   `src/components/perfil/AlunoPerfilTabs.tsx`: Componente que gerencia as abas de informações do perfil do Aluno.
*   `src/components/perfil/AvatarSection.tsx`: Componente para a seção de avatar do perfil do Personal Trainer.
*   `src/components/perfil/EditAlunoModal.tsx`: Modal de edição para informações do perfil do Aluno.
*   `src/components/perfil/EditPessoalModal.tsx`: Modal de edição para informações pessoais do perfil do Personal Trainer.
*   `src/components/perfil/EditProfissionalModal.tsx`: Modal de edição para informações profissionais do perfil do Personal Trainer.
*   `src/components/perfil/EditRedesSociaisModal.tsx`: Modal de edição para redes sociais do perfil do Personal Trainer.
*   `src/components/perfil/PasswordChangeSection.tsx`: Seção para alteração de senha, utilizada em ambos os perfis.
*   `src/components/perfil/PerfilTabs.tsx`: Componente que gerencia as abas de informações do perfil do Personal Trainer.

## Hooks

*   `src/hooks/useAlunoProfile.tsx`: Hook para buscar e gerenciar os dados do perfil do Aluno.
*   `src/hooks/usePTProfile.tsx`: Hook para buscar e gerenciar os dados do perfil do Personal Trainer.
*   `src/hooks/useAuth.tsx`: Hook de autenticação, fundamental para o acesso e gerenciamento de perfis.
*   `src/hooks/useAlunos.tsx`: Hook para gerenciar a lista de alunos de um Personal Trainer.

## Integrações

*   `src/integrations/supabase/client.ts`: Cliente Supabase, utilizado por componentes de perfil para interação com o banco de dados.
*   `src/integrations/supabase/types.ts`: Definições de tipos para as tabelas do Supabase (`alunos`, `personal_trainers`, `user_profiles`), essenciais para a estrutura dos dados de perfil.

## Layouts

*   `src/components/layout/AlunoLayout.tsx`: Layout principal para as páginas do Aluno, incluindo o perfil.
*   `src/components/layout/PTLayout.tsx`: Layout principal para as páginas do Personal Trainer, incluindo o perfil.

## Tipos

*   `src/types/exercicio.types.ts`: Contém interfaces como `UserProfile` e `AlunoData` que podem ser usadas em contextos de perfil.
*   `src/types/rotina.types.ts`: Contém tipos como `Aluno` e `PersonalTrainer` que definem a estrutura de dados relacionada a perfis em rotinas.