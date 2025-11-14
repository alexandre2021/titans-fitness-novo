# 🚀 Guia de Configuração: Push Notifications

Este guia vai te ajudar a configurar e testar as notificações push que não estão funcionando.

## 📋 **Problema Identificado**

As notificações push não estão sendo enviadas porque o **trigger do banco de dados** não consegue chamar a Edge Function. Motivo: as variáveis de ambiente não estão configuradas no PostgreSQL.

---

## ✅ **Passo 1: Verificar o Setup Atual**

### 1.1. Abrir SQL Editor no Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/prvfvlyzfyprjliqniki/sql/new
2. Cole e execute o script: `scripts/check-push-setup.sql`
3. Verifique os resultados:
   - ✅ Trigger existe?
   - ✅ Função existe?
   - ✅ Há subscriptions cadastradas?
   - ✅ Extensão `pg_net` está ativada?
   - ❌ Variáveis `app.settings` configuradas?

---

## 🔧 **Passo 2: Configurar Variáveis no PostgreSQL**

### 2.1. Configurar Service Role Key

No **SQL Editor do Supabase**, execute:

```sql
-- Configura a Service Role Key no banco de dados
ALTER DATABASE postgres
SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydmZ2bHl6ZnlwcmpsaXFuaWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA2OTkyNSwiZXhwIjoyMDY0NjQ1OTI1fQ.h1Sipm17IMkBWSLUtrnRejlvLWjQgt3duxCpy1RmnD0';
```

⚠️ **IMPORTANTE**: Essa chave é sensível! Não compartilhe publicamente.

### 2.2. Aplicar a Migration Corrigida

Ainda no **SQL Editor**, execute o conteúdo completo do arquivo:
```
supabase/migrations/20251114_fix_push_trigger_config.sql
```

Isso vai:
- Atualizar a função `notify_new_message()` com logs
- Recriar o trigger
- Usar a URL do seu projeto Supabase hardcoded

---

## 🧪 **Passo 3: Testar o Sistema**

### 3.1. Verificar Subscription Salva

No SQL Editor, execute:

```sql
SELECT
  user_id,
  endpoint,
  created_at,
  subscription_object->>'endpoint' as subscription_endpoint
FROM push_subscriptions
ORDER BY created_at DESC
LIMIT 5;
```

**Você deve ver:**
- Seu `user_id` do celular
- Um `endpoint` válido (começa com https://fcm.googleapis.com ou similar)
- Data de criação recente

### 3.2. Testar Edge Function Manualmente

No terminal (ou Git Bash no Windows), execute:

```bash
curl -X POST \
  'https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/send-push-notification' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydmZ2bHl6ZnlwcmpsaXFuaWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA2OTkyNSwiZXhwIjoyMDY0NjQ1OTI1fQ.h1Sipm17IMkBWSLUtrnRejlvLWjQgt3duxCpy1RmnD0' \
  -d '{
    "recipientId": "SEU_USER_ID_AQUI",
    "payload": {
      "title": "Teste de Notificação",
      "body": "Se você está vendo isso, funcionou!",
      "icon": "/pwa-192x192.png"
    }
  }'
```

**Substitua** `SEU_USER_ID_AQUI` pelo seu UUID do celular (busque na query acima).

**Resultado esperado:**
- ✅ Status 200
- ✅ JSON: `{ "message": "Push notifications sent", "succeeded": 1, ... }`
- ✅ **Notificação aparece no celular** 🎉

### 3.3. Verificar Logs da Edge Function

1. Acesse: https://supabase.com/dashboard/project/prvfvlyzfyprjliqniki/functions/send-push-notification/logs
2. Procure por:
   - ✅ Requests recebidas
   - ❌ Erros (VAPID keys, subscriptions inválidas, etc.)

### 3.4. Verificar Logs do Trigger

No SQL Editor, depois de enviar uma mensagem, execute:

```sql
-- Mostra os últimos logs/warnings do PostgreSQL
SELECT * FROM pg_stat_statements
WHERE query LIKE '%notify_new_message%'
ORDER BY calls DESC
LIMIT 10;
```

Ou verifique os logs no Dashboard do Supabase:
https://supabase.com/dashboard/project/prvfvlyzfyprjliqniki/logs/postgres-logs

Procure por:
- `[PUSH] Nova mensagem detectada`
- `[PUSH] Remetente: ...`
- `[PUSH] Destinatário: ...`
- `[PUSH] Enviando requisição...`
- `[PUSH] Requisição enviada com sucesso`

---

## 🐛 **Passo 4: Troubleshooting**

### Problema: "No subscriptions found for user"

**Causa**: Você não aceitou as notificações no celular ou a subscription não foi salva.

**Solução:**
1. Abra o app no celular
2. Aguarde o modal de notificações aparecer (30 segundos após login)
3. Clique em "Permitir Notificações"
4. Verifique no console do navegador mobile (Chrome DevTools remoto):
   - `🔔 Subscription salva com sucesso`

### Problema: "Service role key não configurada"

**Causa**: O comando `ALTER DATABASE` não foi executado.

**Solução:** Execute o comando SQL do **Passo 2.1** novamente.

### Problema: "Invalid VAPID keys"

**Causa**: As chaves VAPID configuradas na Edge Function estão erradas.

**Solução:**
1. Verifique que a `VAPID_PRIVATE_KEY` e `VAPID_PUBLIC_KEY` estão configuradas no Supabase Dashboard
2. Acesse: https://supabase.com/dashboard/project/prvfvlyzfyprjliqniki/functions/send-push-notification/secrets
3. Devem estar:
   - `VAPID_PUBLIC_KEY`: `BEfGVqEIzT7DfD03GsElCrob1RahDrGNCUF6xXoQ68e64U1xiFhxrqzo-Gd9fuowrwsQV76NeWNpuKhWkRNp09I`
   - `VAPID_PRIVATE_KEY`: A chave privada gerada com `npx web-push generate-vapid-keys`

### Problema: Notificação não aparece no Android mesmo com sucesso

**Causas possíveis:**
1. **App não está instalado como PWA**: Alguns navegadores exigem instalação
2. **Permissão bloqueada nas configurações do Android**: Verifique Configurações > Apps > Chrome > Notificações
3. **Modo "Não perturbe" ativado**: Desative temporariamente
4. **Service Worker não registrado**: Verifique no DevTools > Application > Service Workers

---

## 📊 **Passo 5: Checklist Final**

Antes de testar novamente, confirme:

- [ ] Executou o script `check-push-setup.sql` e tudo está OK
- [ ] Configurou `app.settings.service_role_key` no banco
- [ ] Aplicou a migration `20251114_fix_push_trigger_config.sql`
- [ ] Há pelo menos 1 subscription na tabela `push_subscriptions`
- [ ] Testou a Edge Function manualmente com curl (sucesso)
- [ ] VAPID keys estão configuradas nos secrets da Edge Function
- [ ] Extensão `pg_net` está instalada no PostgreSQL

---

## 🎯 **Teste Final: End-to-End**

1. **No celular**: Faça logout e feche o app completamente
2. **No celular**: Abra o app, faça login, aceite as notificações
3. **No desktop**: Faça login com outro usuário
4. **No desktop**: Envie uma mensagem para o usuário do celular
5. **No celular**: ✅ **Deve aparecer a notificação push do Android!**

---

## 📝 **Próximos Passos (se ainda não funcionar)**

Se após seguir TODOS os passos ainda não funcionar, me informe:

1. **Resultado do script** `check-push-setup.sql`
2. **Logs da Edge Function** (copie os últimos 10)
3. **Logs do PostgreSQL** (procure por `[PUSH]`)
4. **Resultado do teste manual** com curl
5. **Screenshot do console** do navegador mobile mostrando os logs de subscription

Com essas informações conseguirei identificar exatamente onde está o problema! 🔍
