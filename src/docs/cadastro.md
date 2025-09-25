# Cadastro

## Cadastro de Personal Trainer

- O personal trainer se cadastra informando nome, e-mail, senha e aceita os termos.
- Após criar o usuário no Supabase Auth, é criado um perfil genérico (`user_profiles`) e um registro específico em `professores` com o campo `onboarding_completo: false` e plano inicial gratuito.

## Cadastro de Aluno

### Fluxo por Convite via Email

#### 1. Personal Trainer Envia Convite
- O personal trainer acessa a página de "Convidar Aluno"
- Informa o e-mail do futuro aluno
- O sistema chama a Edge Function `enviar-convite` que:
  - Verifica se o aluno já existe no sistema.
  - **Se o aluno não existe**: Cria um convite do tipo `cadastro` e envia um email com link para a página de cadastro (`/cadastro/aluno?token=...`).
  - **Se o aluno já existe**: Cria um convite do tipo `vinculo` e envia um email com um link para a Edge Function `aceitar-convite`, que cria o vínculo de "seguir" diretamente.

### Fluxo por Convite Presencial (QR Code)

#### 1. Personal Trainer Gera o QR Code
- O personal trainer acessa a página de "Convidar Aluno".
- O sistema chama a Edge Function `gerar-convite-link` que:
  - Cria um registro na tabela `convites` com `tipo_convite: 'cadastro'`, sem email associado.
  - Retorna uma URL de cadastro com um token único.
- O frontend renderiza essa URL como um QR Code.

#### 2. Aluno Escaneia o QR Code
- O aluno escaneia o QR Code com seu dispositivo.
- É direcionado para a página de cadastro (`/cadastro/aluno?token=xxx`).
- O fluxo a partir daqui é o mesmo do convite por email para um novo aluno.

### Etapas Comuns do Cadastro (via Token)

#### 2. Aluno Recebe e Acessa Convite
- Aluno recebe e-mail com convite do personal trainer
- Clica no link que contém o token na URL
- É direcionado para página de cadastro (`/cadastro/aluno?token=xxx`)

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

**5.4. Criação do Registro de Aluno e Vínculo**
- Insere registro na tabela `alunos` com os dados pessoais (nome, email, etc), mas **sem** o `professor_id`.
- **Cria o relacionamento na tabela `alunos_professores`**, vinculando o `aluno_id` (novo usuário) ao `professor_id` (do convite).
- Configura o avatar inicial (letra e cor).
- Define o status inicial como `ativo` e `onboarding_completo: false`.

**5.5. Invalidação do Convite**
- Marca o convite na tabela `convites` como `status: 'aceito'`.
- Define `aceito_em` com o timestamp atual.

**5.6. Rollback em Caso de Falha**
- Se qualquer etapa falhar, reverte todas as anteriores:
  - Remove usuário do Auth
  - Remove registro de `user_profiles`
  - Mantém convite válido para nova tentativa

#### 6. Finalização
- Usuário recebe mensagem de sucesso
- É redirecionado para tela de login
- Pode fazer login imediatamente (email já confirmado)

## Edge Functions Utilizadas

### `enviar-convite`
- Cria registro de convite na tabela `convites`
- Gera token único com expiração
- Envia e-mail com link personalizado
- Distingue entre convite de `cadastro` (novo aluno) e `vinculo` (aluno existente).

### `validate-invite`
- Valida token de convite
- Verifica expiração
- Retorna dados do convite se válido

### `register-student`
- Executa cadastro completo do aluno
- Usa service role para bypass de RLS
- Implementa rollback automático em caso de falha
- Invalida convite após uso bem-sucedido

### `gerar-convite-link`
- Cria um convite do tipo `cadastro` sem e-mail associado.
- Retorna uma URL com token para ser usada em um QR Code.

### `aceitar-convite`
- Chamada quando um aluno **já cadastrado** aceita um convite de vínculo.
- Cria o relacionamento na tabela `alunos_professores`.
- Atualiza o status do convite para `aceito`.

---

## Modelo de Relacionamento
- O cadastro de um aluno via convite (email ou QR Code) cria automaticamente um relacionamento de "seguir" entre o aluno e o professor que o convidou.
- Um aluno pode seguir múltiplos professores, e um professor pode ser seguido por múltiplos alunos (relação N:N gerenciada pela tabela `alunos_professores`).

## Políticas de Segurança

- Edge Functions executam com service role para evitar problemas de RLS
- Tokens de convite têm expiração definida (7 dias)
- Validações múltiplas em cada etapa do processo
- E-mails são confirmados automaticamente para alunos via trigger
- Rollback automático em caso de falha em qualquer etapa

---

## Próximos Passos (Fase 2)

### Cadastro de Aluno Sem Convite (Aberto)

- **Objetivo:** Permitir que um aluno se cadastre na plataforma sem a necessidade de um convite (token) de um professor, criando um funil de entrada orgânico.
- **Nova Página:** Será criada a página `src\pages\CadastroAlunoSemToken.tsx` para este fluxo.
- **Fluxo do Aluno:**
    1. O aluno acessa a nova página de cadastro aberto.
    2. Preenche seus dados (nome, email, senha) e cria sua conta.
    3. Após o login, o aluno é direcionado para uma área onde pode pesquisar por professores.
    4. **Busca de Professores:** A busca permitirá filtros por geolocalização, especialidades, nome, etc.
    5. **Solicitação de Vínculo:** O aluno poderá enviar uma solicitação para seguir um professor. O professor receberá uma notificação para aceitar ou recusar o pedido de seguimento.

---

O fluxo de cadastro via convite garante que o aluno já inicie a jornada seguindo um professor. O fluxo de cadastro aberto (Fase 2) dará autonomia ao aluno para encontrar e se conectar com profissionais após o registro.