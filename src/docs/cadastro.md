# Cadastro

## Cadastro do Personal Trainer

- O personal trainer se cadastra informando nome, e-mail, senha e aceita os termos.
- Após criar o usuário no Supabase Auth, é criado um perfil genérico (`user_profiles`) e um registro específico em `personal_trainers` com o campo `onboarding_completo: false` e plano inicial gratuito.
- O campo `codigo_pt` é gerado e associado ao personal trainer (função/trigger no banco, não manual).
- O código do PT é essencial para vincular alunos.

## Cadastro do Aluno

- O aluno se cadastra informando nome, e-mail, senha, telefone (opcional) e obrigatoriamente o código do personal trainer.
- O código do PT é validado em tempo real: só é possível cadastrar se o código for válido.
- Após criar o usuário no Supabase Auth, é criado um perfil genérico (`user_profiles`) e um registro em `alunos` com vínculo ao `personal_trainer_id` obtido pelo código.
- O aluno só pode se cadastrar se já existir um personal trainer com código válido.

## Processo de Convite de Aluno

- O personal trainer pode convidar um aluno informando nome e e-mail.
- O convite é enviado via função edge (`enviar-convite`), incluindo o nome do PT e seu código.
- O aluno recebe o convite por e-mail e, ao se cadastrar, precisa informar o código do PT para vinculação.

## Necessidade do Código do Personal Trainer

- O código do PT é obrigatório para o cadastro do aluno, garantindo que todo aluno esteja vinculado a um personal trainer existente.
- O código é gerado automaticamente para cada PT e pode ser compartilhado via convite ou manualmente.

---

Este fluxo garante que todos os alunos estejam sempre vinculados a um personal trainer ativo na plataforma.