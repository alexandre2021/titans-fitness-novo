-- Migration: Adicionar trigger para enviar push notifications quando uma nova mensagem é criada
-- Created: 2025-11-14

-- Função que será chamada quando uma nova mensagem for criada
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
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

  -- Encontra o outro participante da conversa (o destinatário)
  -- Pega todos os participantes exceto o remetente
  SELECT user_id INTO recipient_id
  FROM participantes_conversa
  WHERE conversa_id = NEW.conversa_id
    AND user_id != NEW.remetente_id
  LIMIT 1;

  -- Se não encontrou destinatário, não faz nada
  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Busca as variáveis de ambiente (configuradas no Supabase Dashboard)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Se as variáveis não estão configuradas, tenta valores padrão do Supabase
  IF supabase_url IS NULL THEN
    supabase_url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;

  -- Chama a Edge Function para enviar push notification
  -- Nota: Requer extensão pg_net instalada
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

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, apenas loga e continua (não bloqueia a inserção da mensagem)
    RAISE WARNING 'Erro ao enviar push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria o trigger que dispara a função
DROP TRIGGER IF EXISTS on_new_message_push_notification ON mensagens;
CREATE TRIGGER on_new_message_push_notification
  AFTER INSERT ON mensagens
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Comentários para documentação
COMMENT ON FUNCTION notify_new_message() IS 'Envia push notification quando uma nova mensagem é criada';
COMMENT ON TRIGGER on_new_message_push_notification ON mensagens IS 'Dispara push notification para o destinatário de uma nova mensagem';
