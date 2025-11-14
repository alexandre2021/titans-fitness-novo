-- Migration: Corrigir trigger de push notifications para usar variáveis corretas
-- Created: 2025-11-14
-- Este script corrige o problema de configuração das variáveis de ambiente

-- Primeiro, configura as variáveis necessárias no banco
-- IMPORTANTE: Execute isso no SQL Editor do Supabase Dashboard primeiro:
--
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://prvfvlyzfyprjliqniki.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'SUA_SERVICE_ROLE_KEY_AQUI';
--
-- OU use o método alternativo abaixo que busca do Vault

-- Função atualizada que busca as credenciais corretamente
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  supabase_url TEXT := 'https://prvfvlyzfyprjliqniki.supabase.co';
  service_role_key TEXT;
BEGIN
  -- Log para debug
  RAISE NOTICE '[PUSH] Nova mensagem detectada: % (conversa: %)', NEW.id, NEW.conversa_id;

  -- Busca o nome do remetente em professores
  SELECT nome_completo INTO sender_name
  FROM professores
  WHERE id = NEW.remetente_id;

  -- Se não encontrou em professores, busca em alunos
  IF sender_name IS NULL THEN
    SELECT nome_completo INTO sender_name
    FROM alunos
    WHERE id = NEW.remetente_id;
  END IF;

  -- Se ainda não encontrou, usa "Usuário"
  IF sender_name IS NULL THEN
    sender_name := 'Usuário';
  END IF;

  RAISE NOTICE '[PUSH] Remetente: %', sender_name;

  -- Encontra o outro participante da conversa (o destinatário)
  SELECT user_id INTO recipient_id
  FROM participantes_conversa
  WHERE conversa_id = NEW.conversa_id
    AND user_id != NEW.remetente_id
  LIMIT 1;

  -- Se não encontrou destinatário, não faz nada
  IF recipient_id IS NULL THEN
    RAISE NOTICE '[PUSH] Nenhum destinatário encontrado';
    RETURN NEW;
  END IF;

  RAISE NOTICE '[PUSH] Destinatário: %', recipient_id;

  -- Tenta buscar service role key das configurações
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '[PUSH] Não foi possível buscar service_role_key das configurações. Configure com: ALTER DATABASE postgres SET app.settings.service_role_key = ''sua_key''';
      RETURN NEW;
  END;

  -- Verifica se a key foi encontrada
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING '[PUSH] Service role key não configurada. Configure com: ALTER DATABASE postgres SET app.settings.service_role_key = ''sua_key''';
    RETURN NEW;
  END IF;

  RAISE NOTICE '[PUSH] Enviando requisição para Edge Function...';

  -- Chama a Edge Function para enviar push notification
  PERFORM
    net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'recipientId', recipient_id,
        'payload', jsonb_build_object(
          'title', 'Nova mensagem',
          'body', sender_name || ': ' || LEFT(NEW.conteudo, 50) || CASE WHEN LENGTH(NEW.conteudo) > 50 THEN '...' ELSE '' END,
          'icon', '/pwa-192x192.png',
          'badge', '/pwa-192x192.png',
          'data', jsonb_build_object(
            'url', '/mensagens-pt',
            'messageId', NEW.id,
            'senderId', NEW.remetente_id,
            'conversaId', NEW.conversa_id
          )
        )
      )
    );

  RAISE NOTICE '[PUSH] Requisição enviada com sucesso';

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, apenas loga e continua (não bloqueia a inserção da mensagem)
    RAISE WARNING '[PUSH] Erro ao enviar push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria o trigger
DROP TRIGGER IF EXISTS on_new_message_push_notification ON mensagens;
CREATE TRIGGER on_new_message_push_notification
  AFTER INSERT ON mensagens
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Comentários para documentação
COMMENT ON FUNCTION notify_new_message() IS 'Envia push notification quando uma nova mensagem é criada (v2 - com logs)';
