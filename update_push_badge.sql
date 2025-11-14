-- Atualização rápida: Corrige o badge da notificação push
-- Execute este script no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  supabase_url TEXT := 'https://prvfvlyzfyprjliqniki.supabase.co';
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydmZ2bHl6ZnlwcmpsaXFuaWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA2OTkyNSwiZXhwIjoyMDY0NjQ1OTI1fQ.h1Sipm17IMkBWSLUtrnRejlvLWjQgt3duxCpy1RmnD0';
BEGIN
  -- Busca o nome do remetente
  SELECT nome_completo INTO sender_name FROM professores WHERE id = NEW.remetente_id;
  IF sender_name IS NULL THEN
    SELECT nome_completo INTO sender_name FROM alunos WHERE id = NEW.remetente_id;
  END IF;
  IF sender_name IS NULL THEN
    sender_name := 'Usuário';
  END IF;

  -- Encontra o destinatário
  SELECT user_id INTO recipient_id
  FROM participantes_conversa
  WHERE conversa_id = NEW.conversa_id AND user_id != NEW.remetente_id
  LIMIT 1;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Envia push notification com badge correto
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
          'icon', '/pwa-512x512.png',
          'badge', '/pwa-192x192.png',
          'tag', 'message-' || NEW.conversa_id,
          'data', jsonb_build_object(
            'url', '/mensagens-pt',
            'messageId', NEW.id,
            'senderId', NEW.remetente_id,
            'conversaId', NEW.conversa_id
          )
        )
      )
    );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[PUSH] Erro: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
