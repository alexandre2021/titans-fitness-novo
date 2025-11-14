-- Migration: Trigger de push notifications (VERSÃO FINAL - sem dependência de configurações)
-- Created: 2025-11-14
-- Esta versão não depende de app.settings e usa valores hardcoded

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  supabase_url TEXT := 'https://prvfvlyzfyprjliqniki.supabase.co';
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydmZ2bHl6ZnlwcmpsaXFuaWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA2OTkyNSwiZXhwIjoyMDY0NjQ1OTI1fQ.h1Sipm17IMkBWSLUtrnRejlvLWjQgt3duxCpy1RmnD0';
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
COMMENT ON FUNCTION notify_new_message() IS 'Envia push notification quando uma nova mensagem é criada (v3 - service_role_key hardcoded)';
