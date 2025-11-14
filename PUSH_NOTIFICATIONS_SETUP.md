# 🔔 Guia de Configuração - Push Notifications

Este documento contém os passos finais necessários para ativar as notificações push no aplicativo.

## ✅ O que já está implementado

Todos os componentes de código estão prontos:
- ✅ Hook `useNotificationPermission`
- ✅ Componente `NotificationPermissionPrompt`
- ✅ Service Worker com handlers de push
- ✅ Configuração do Vite PWA
- ✅ Edge Function `send-push-notification`
- ✅ Migration com trigger do banco de dados
- ✅ Tabela `push_subscriptions` com RLS policies

## 📋 Passos para Ativar

### 1. Gerar VAPID Keys

Execute no terminal:
```bash
npx web-push generate-vapid-keys
```

Você receberá algo assim:
```
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
UUxI4O8-FbRouAevSmBQ6o8eDy6VeghJLNT5WCwdBz4
```

### 2. Configurar Variáveis de Ambiente

#### No arquivo `.env` (frontend)
Adicione a Public Key:
```bash
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
```

⚠️ **IMPORTANTE**: Nunca commite a Private Key no repositório!

#### No Supabase Dashboard
1. Acesse: Project Settings > Edge Functions > Environment Variables
2. Adicione as seguintes variáveis:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `VAPID_PRIVATE_KEY` | Sua Private Key | Chave privada VAPID (nunca exponha publicamente) |
| `VAPID_PUBLIC_KEY` | Sua Public Key | Mesma que VITE_VAPID_PUBLIC_KEY |
| `VAPID_SUBJECT` | mailto:seu_email@dominio.com | Email de contato (ex: mailto:contato@titans.fitness) |

### 3. Configurar Database Settings (para o trigger)

O trigger de mensagens precisa acessar a Edge Function. Configure no Supabase Dashboard:

1. Vá em: Project Settings > Database > Settings
2. Role até "Custom Postgres Configuration"
3. Adicione:
```
app.settings.supabase_url = 'https://seu-projeto.supabase.co'
app.settings.service_role_key = 'sua-service-role-key'
```

**Como encontrar esses valores:**
- `supabase_url`: Project Settings > API > Project URL
- `service_role_key`: Project Settings > API > service_role (secret key)

### 4. Instalar extensão pg_net (se necessário)

A extensão `pg_net` permite que o PostgreSQL faça chamadas HTTP (necessário para o trigger).

No SQL Editor do Supabase, execute:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 5. Deploy da Edge Function

Execute no terminal:
```bash
supabase functions deploy send-push-notification
```

Se você não tem o Supabase CLI instalado:
```bash
npm install -g supabase
supabase login
supabase link --project-ref seu-projeto-ref
supabase functions deploy send-push-notification
```

### 6. Executar a Migration

Execute a migration do trigger:
```bash
supabase db push
```

Ou aplique manualmente no SQL Editor do Supabase copiando o conteúdo de:
`supabase/migrations/20251114113837_create_message_push_trigger.sql`

### 7. Build e Deploy

```bash
npm run build
```

Em seguida, faça deploy na Vercel ou plataforma de sua escolha.

## 🧪 Como Testar

### Teste Local (Requer HTTPS)

Push notifications só funcionam com HTTPS. Para testar localmente:

1. Build da aplicação:
```bash
npm run build
npm run preview
```

2. Use ngrok para HTTPS:
```bash
ngrok http 4173
```

3. Acesse a URL do ngrok no navegador
4. Aguarde 30 segundos para o prompt aparecer
5. Aceite as notificações
6. Em outra aba/dispositivo, envie uma mensagem
7. Verifique se a notificação aparece

### Teste em Produção

1. Faça deploy da aplicação
2. Acesse o app em produção
3. Aguarde 30s após login
4. Aceite as notificações quando solicitado
5. Envie uma mensagem de teste de outro dispositivo/conta
6. Verifique se a notificação aparece

## 🐛 Troubleshooting

### Notificação não aparece

**Verifique:**
1. Permissão foi concedida pelo usuário?
   ```javascript
   // No console do navegador
   console.log(Notification.permission) // deve ser "granted"
   ```

2. Service Worker está registrado?
   ```javascript
   navigator.serviceWorker.getRegistrations().then(console.log)
   ```

3. Subscription foi salva?
   ```javascript
   navigator.serviceWorker.ready.then(reg => {
     reg.pushManager.getSubscription().then(console.log)
   })
   ```

4. Verifique os logs da Edge Function:
   ```bash
   supabase functions logs send-push-notification
   ```

5. Verifique se a subscription existe no banco:
   - Acesse: Table Editor > push_subscriptions
   - Procure por registros do seu user_id

### Edge Function falha

**Verifique:**
1. Variáveis de ambiente estão configuradas?
   - Project Settings > Edge Functions > Environment Variables
   - Deve ter: VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT

2. Logs da função:
   ```bash
   supabase functions logs send-push-notification --tail
   ```

### Trigger não dispara

**Verifique:**
1. Extensão pg_net está instalada?
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

2. Configurações do database estão corretas?
   ```sql
   SELECT name, setting FROM pg_settings
   WHERE name LIKE 'app.settings.%';
   ```

3. Função e trigger existem?
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_new_message_push_notification';
   SELECT * FROM pg_proc WHERE proname = 'notify_new_message';
   ```

## 📊 Monitoramento

### Ver todas as subscriptions ativas
```sql
SELECT
  user_id,
  endpoint,
  created_at
FROM push_subscriptions
ORDER BY created_at DESC;
```

### Ver contagem de subscriptions por usuário
```sql
SELECT
  user_id,
  COUNT(*) as num_devices
FROM push_subscriptions
GROUP BY user_id;
```

### Testar Edge Function manualmente
```bash
curl -X POST 'https://seu-projeto.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "recipientId": "uuid-do-usuario",
    "payload": {
      "title": "Teste",
      "body": "Mensagem de teste",
      "icon": "/pwa-192x192.png"
    }
  }'
```

## 🔐 Segurança

- ✅ VAPID Private Key nunca exposta no frontend
- ✅ RLS policies protegem subscriptions
- ✅ Apenas usuários podem gerenciar suas próprias subscriptions
- ✅ Service Role Key protegida no database config
- ✅ Trigger com SECURITY DEFINER para operações privilegiadas

## 📚 Documentação Adicional

- [src/docs/push-notifications.md](src/docs/push-notifications.md) - Arquitetura completa
- [src/docs/push-notifications-implementation-guide.md](src/docs/push-notifications-implementation-guide.md) - Guia detalhado de implementação

## ✅ Checklist Final

- [ ] VAPID Keys geradas
- [ ] VITE_VAPID_PUBLIC_KEY no .env
- [ ] VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT no Supabase
- [ ] app.settings.supabase_url configurado no database
- [ ] app.settings.service_role_key configurado no database
- [ ] pg_net extension instalada
- [ ] Edge Function deployed
- [ ] Migration aplicada
- [ ] Build realizado
- [ ] Deploy em HTTPS
- [ ] Testado em produção

---

Após completar todos os passos, as notificações push estarão totalmente funcionais! 🎉
