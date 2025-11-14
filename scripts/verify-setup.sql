-- Script de verificação rápida após configuração manual
-- Execute este script no SQL Editor para confirmar que está tudo OK

-- 1. Verifica pg_net
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN '✅ pg_net INSTALADA'
    ELSE '❌ pg_net NÃO INSTALADA'
  END as status_pg_net;

-- 2. Verifica trigger
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_new_message_push_notification')
    THEN '✅ Trigger EXISTE'
    ELSE '❌ Trigger NÃO EXISTE'
  END as status_trigger;

-- 3. Verifica função
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_new_message')
    THEN '✅ Função EXISTE'
    ELSE '❌ Função NÃO EXISTE'
  END as status_funcao;

-- 4. Verifica service_role_key configurada
DO $$
DECLARE
  key_value TEXT;
BEGIN
  BEGIN
    key_value := current_setting('app.settings.service_role_key', true);

    IF key_value IS NULL OR key_value = '' THEN
      RAISE NOTICE '❌ Service Role Key NÃO CONFIGURADA';
      RAISE NOTICE '   Execute: ALTER DATABASE postgres SET app.settings.service_role_key = ''sua_key_aqui'';';
    ELSE
      RAISE NOTICE '✅ Service Role Key CONFIGURADA';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Erro ao verificar: %', SQLERRM;
  END;
END $$;

-- 5. Conta subscriptions
SELECT
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT user_id) as usuarios_unicos
FROM push_subscriptions;

-- 6. Mostra últimas mensagens (para testar trigger depois)
SELECT
  id,
  remetente_id,
  conversa_id,
  LEFT(conteudo, 30) as mensagem_preview,
  created_at
FROM mensagens
ORDER BY created_at DESC
LIMIT 3;
