# Cadastro

## Cadastro do Personal Trainer

- O personal trainer se cadastra informando nome, e-mail, senha e aceita os termos.
- Após criar o usuário no Supabase Auth, é criado um perfil genérico (`user_profiles`) e um registro específico em `personal_trainers` com o campo `onboarding_completo: false` e plano inicial gratuito.
- O campo `codigo_pt` é gerado e associado ao personal trainer (função/trigger no banco, não manual).
- O código do PT é essencial para vincular alunos.

## Cadastro do Aluno

### Fluxo por Convite (Atual)

#### 1. Personal Trainer Envia Convite
- O personal trainer acessa a página de "Convidar Aluno"
- Informa o e-mail do futuro aluno
- O sistema chama a Edge Function `enviar-convite` que:
  - Cria registro na tabela `convites` com token único
  - Define expiração do convite (7 dias)
  - Envia e-mail com link personalizado contendo o token

#### 2. Aluno Recebe e Acessa Convite
- Aluno recebe e-mail com convite do personal trainer
- Clica no link que contém o token na URL
- É direcionado para página de cadastro (`/cadastro-aluno?token=xxx`)

#### 3. Validação do Token
- Sistema valida o token via Edge Function `validate-invite`
- Se válido: mostra mensagem "Convite válido! Você será aluno de [Nome do PT]"
- Se inválido/expirado: impede o cadastro e mostra erro
- E-mail é pré-preenchido se disponível no convite

#### 4. Preenchimento dos Dados
- Aluno preenche: nome completo, senha, confirmação de senha
- Aceita termos de uso e política de privacidade
- E-mail pode estar bloqueado (pré-preenchido via convite)

#### 5. Processamento do Cadastro via Edge Function
Ao submeter o formulário, todo o processo é executado via Edge Function `register-student`:

**5.1. Validação do Convite**
- Revalida token e dados do convite
- Verifica se ainda está válido e pendente

**5.2. Criação do Usuário**
- Cria usuário no Supabase Auth usando service role
- Define `email_confirm: true` (confirmação automática)
- Adiciona metadados: `user_type: 'aluno'` e `nome_completo`

**5.3. Criação do Perfil Genérico**
- Insere registro em `user_profiles` com `user_type: 'aluno'`
- Usa o mesmo ID do usuário criado no Auth

**5.4. Criação do Registro de Aluno**
- Insere registro completo na tabela `alunos`:
  - ID do usuário
  - Vínculo com `personal_trainer_id` do convite
  - Dados pessoais (nome, email)
  - Configuração de avatar (letra e cor)
  - Status inicial: `ativo`, `onboarding_completo: false`

**5.5. Invalidação do Convite**
- Marca convite como `status: 'aceito'`
- Define `aceito_em` com timestamp atual

**5.6. Rollback em Caso de Falha**
- Se qualquer etapa falhar, reverte todas as anteriores:
  - Remove usuário do Auth
  - Remove registro de `user_profiles`
  - Mantém convite válido para nova tentativa

#### 6. Finalização
- Usuário recebe mensagem de sucesso
- É redirecionado para tela de login
- Pode fazer login imediatamente (email já confirmado)

### Fluxo por Código (Legado)

- O aluno se cadastra informando nome, e-mail, senha, telefone (opcional) e obrigatoriamente o código do personal trainer.
- O código do PT é validado em tempo real: só é possível cadastrar se o código for válido.
- Após criar o usuário no Supabase Auth, é criado um perfil genérico (`user_profiles`) e um registro em `alunos` com vínculo ao `personal_trainer_id` obtido pelo código.
- O aluno só pode se cadastrar se já existir um personal trainer com código válido.

## Edge Functions Utilizadas

### `enviar-convite`
- Cria registro de convite na tabela `convites`
- Gera token único com expiração
- Envia e-mail com link personalizado

### `validate-invite`
- Valida token de convite
- Verifica expiração
- Retorna dados do convite se válido

### `register-student`
- Executa cadastro completo do aluno
- Usa service role para bypass de RLS
- Implementa rollback automático em caso de falha
- Invalida convite após uso bem-sucedido

## Necessidade do Vínculo PT-Aluno

- Todo aluno deve estar vinculado a um personal trainer existente.
- A vinculação é feita através do processo de convite ou código do PT.
- O vínculo é obrigatório e validado antes da criação do registro.

## Políticas de Segurança

- Edge Functions executam com service role para evitar problemas de RLS
- Tokens de convite têm expiração definida (7 dias)
- Validações múltiplas em cada etapa do processo
- E-mails são confirmados automaticamente para alunos via trigger
- Rollback automático em caso de falha em qualquer etapa

---

Este fluxo garante que todos os alunos estejam sempre vinculados a um personal trainer ativo na plataforma, com processo seguro e confiável via Edge Functions.