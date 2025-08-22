Mover a cron job para a Vercel:

Resolve o Problema: Ignora completamente o pg_net, que é a nossa fonte de problemas.
Usa Ferramentas Padrão: Utiliza a funcionalidade de Cron Jobs da Vercel, que é feita exatamente para isso e é mais integrada ao ecossistema do seu frontend.
Simplifica a Depuração: É muito mais fácil testar e depurar uma API route da Vercel (que você pode chamar pelo navegador ou Postman) do que a combinação pg_cron + pg_net.

no github:

https://github.com/alexandre2021/titans-fitness-novo/actions

para criar:
New workflow
set up a workflow yourself
cron-check-users.yml

name: Verificador de Usuários Inativos

on:
  # Permite acionar este workflow manualmente pela aba Actions
  workflow_dispatch:

  # Aciona o workflow todo dia à meia-noite (UTC)
  schedule:
    - cron: '0 0 * * *'

jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - name: Chamar a API para verificar usuários inativos
        run: |
          curl --request POST \
          --url 'https://titans-fitness-novo.vercel.app/api/cron/check-inactive-users' \
          --header 'Authorization: Bearer ${{ secrets.CRON_SECRET }}'


Secrets:
CRON_SECRET
chave:
4e2b8a9c-1b7c-4d3a-8e0f-7a2b1c9d8e4f

src\pages\api\cron\check-inactive-users.ts




Edge Function: check-inactive-users

Deploy via cli:

supabase functions deploy check-inactive-users --no-verify-jwt


Inicializa um cliente Supabase com a SERVICE_ROLE_KEY (passada no cabeçalho da requisição).
Obtém outras chaves de API (como a do Brevo) de variáveis de ambiente.
Identifica Usuários Inativos:

Calcula as datas de 60 e 90 dias atrás.
Busca a lista de todos os usuários em auth.users e seus perfis em public.alunos.
Itera sobre cada usuário, verificando a data do último login (last_sign_in_at).
Ações Baseadas na Inatividade:

Para 60 dias de inatividade: Envia um e-mail de alerta ao usuário, avisando que a conta será excluída em 30 dias se não houver novo acesso.
90 dias ou mais de inatividade:
Deleta o usuário de auth.users (usando supabase.auth.admin.deleteUser(user.id)). Esta ação é crucial, pois ela aciona a exclusão em cascata no banco de dados, removendo os registros do aluno em public.alunos, avaliacoes_fisicas, rotinas, rotinas_arquivadas, etc.
(Opcionalmente) Envia um e-mail de confirmação de exclusão.
Registro de URLs (Planejado):

Antes de deletar o usuário (para aqueles com 90+ dias de inatividade), a função será modificada para:
Buscar todas as URLs de imagens de avaliações e PDFs de rotinas arquivadas associadas a esse usuário.
Salvar essas URLs em uma nova tabela de log (public.deleted_user_files_log).
Tratamento de Erros: Lida com erros durante o processo e retorna respostas HTTP apropriadas.

