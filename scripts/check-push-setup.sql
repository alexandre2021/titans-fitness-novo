-- Script para verificar a configuração de Push Notifications
-- Execute este script no Supabase SQL Editor

-- 1. Verifica se o trigger existe
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_new_message_push_notification';

-- 2. Verifica se a função existe
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'notify_new_message';

-- 3. Verifica se há subscriptions cadastradas
SELECT
  user_id,
  endpoint,
  created_at,
  LEFT(subscription_object::text, 100) as subscription_preview
FROM push_subscriptions
ORDER BY created_at DESC;

-- 4. Verifica se a extensão pg_net está ativada (necessária para http_post)
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 5. Tenta buscar as configurações (app.settings)
-- Nota: Se der erro, significa que as variáveis não estão configuradas
DO $$
DECLARE
  url TEXT;
  key TEXT;
BEGIN
  BEGIN
    url := current_setting('app.settings.supabase_url', true);
    key := current_setting('app.settings.service_role_key', true);

    RAISE NOTICE 'Supabase URL configurada: %', COALESCE(url, 'NÃO CONFIGURADA');
    RAISE NOTICE 'Service Role Key configurada: %', CASE WHEN key IS NOT NULL THEN 'SIM' ELSE 'NÃO' END;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao buscar configurações: %', SQLERRM;
  END;
END $$;
