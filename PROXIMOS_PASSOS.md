# 🔔 Próximos Passos - Configuração no Supabase

## ✅ Feito
- [x] VAPID Keys geradas
- [x] `VITE_VAPID_PUBLIC_KEY` adicionada no `.env`

---

## 📝 Configurações Necessárias no Supabase Dashboard

### 1. Configurar Environment Variables da Edge Function

**Onde:** [Project Settings > Edge Functions > Environment Variables](https://supabase.com/dashboard/project/prvfvlyzfyprjliqniki/settings/functions)

**Adicionar 3 variáveis:**

| Nome da Variável | Valor |
|-----------------|-------|
| `VAPID_PRIVATE_KEY` | `H4wzFoJNEG-KSCN8qPB653GYVjT57Pfb6OXJsiy53i8` |
| `VAPID_PUBLIC_KEY` | `BEfGVqEIzT7DfD03GsElCrob1RahDrGNCUF6xXoQ68e64U1xiFhxrqzo-Gd9fuowrwsQV76NeWNpuKhWkRNp09I` |
| `VAPID_SUBJECT` | `mailto:contato@titans.fitness` |

⚠️ **IMPORTANTE:** Após adicionar, clique em "Save" para cada variável.

---

### 2. Configurar Database Settings (para o trigger)

**Onde:** [Project Settings > Database > Configuration](https://supabase.com/dashboard/project/prvfvlyzfyprjliqniki/settings/database)

**Ir até:** "Custom Postgres Configuration"

**Adicionar:**
```
app.settings.supabase_url = 'https://prvfvlyzfyprjliqniki.supabase.co'
app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydmZ2bHl6ZnlwcmpsaXFuaWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA2OTkyNSwiZXhwIjoyMDY0NjQ1OTI1fQ.h1Sipm17IMkBWSLUtrnRejlvLWjQgt3duxCpy1RmnD0'
```

⚠️ **NOTA:** Clique em "Save" após adicionar.

---

### 3. Instalar Extensão pg_net

**Onde:** [SQL Editor](https://supabase.com/dashboard/project/prvfvlyzfyprjliqniki/sql/new)

**Executar:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Clique em "Run" para executar.

---

### 4. Aplicar Migration (Trigger)

**Onde:** [SQL Editor](https://supabase.com/dashboard/project/prvfvlyzfyprjliqniki/sql/new)

**Copiar e executar o conteúdo do arquivo:**
`supabase/migrations/20251114113837_create_message_push_trigger.sql`

Ou executar via CLI:
```bash
supabase db push
```

---

### 5. Deploy da Edge Function

**No terminal, executar:**

```bash
# Se não tem Supabase CLI instalado, instalar:
npm install -g supabase

# Login (se necessário)
supabase login

# Link com o projeto (se necessário)
supabase link --project-ref prvfvlyzfyprjliqniki

# Deploy da função
supabase functions deploy send-push-notification
```

**Alternativa (Deploy manual):**
1. Ir em: [Edge Functions](https://supabase.com/dashboard/project/prvfvlyzfyprjliqniki/functions)
2. Clicar em "Deploy new function"
3. Nome: `send-push-notification`
4. Copiar o conteúdo de: `supabase/functions/send-push-notification/index.ts`
5. Clicar em "Deploy"

---

## 🧪 Testar após Configuração

### Verificar se tudo está configurado:

1. **Environment Variables:**
   - Ir em: Project Settings > Edge Functions > Environment Variables
   - Confirmar que as 3 variáveis VAPID estão salvas

2. **Database Settings:**
   - Ir em: Project Settings > Database > Configuration
   - Verificar se as configurações app.settings aparecem

3. **Extensão pg_net:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```
   Deve retornar 1 linha.

4. **Trigger instalado:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_new_message_push_notification';
   ```
   Deve retornar 1 linha.

5. **Edge Function deployed:**
   - Ir em: Edge Functions
   - Verificar se `send-push-notification` aparece na lista

---

## 🚀 Após Configuração, fazer Build e Deploy

```bash
npm run build
```

Depois fazer deploy na Vercel ou plataforma de sua preferência.

---

## 📊 Como Testar Push Notifications

1. Acesse o app em produção (HTTPS obrigatório)
2. Faça login
3. Aguarde 30 segundos - modal de permissão deve aparecer
4. Clique em "Permitir Notificações"
5. Em outro dispositivo/conta, envie uma mensagem
6. Verifique se a notificação push aparece

---

## 🐛 Troubleshooting

Se as notificações não funcionarem, verificar:

1. **Logs da Edge Function:**
   ```bash
   supabase functions logs send-push-notification --tail
   ```

2. **Subscription salva no banco:**
   ```sql
   SELECT * FROM push_subscriptions ORDER BY created_at DESC LIMIT 10;
   ```

3. **Permissão concedida:**
   - No console do navegador: `console.log(Notification.permission)`
   - Deve retornar: `"granted"`

4. **Service Worker registrado:**
   - No console: `navigator.serviceWorker.getRegistrations().then(console.log)`

---

## ✅ Checklist Final

- [ ] VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT configurados no Supabase
- [ ] app.settings.supabase_url e app.settings.service_role_key no Database
- [ ] Extensão pg_net instalada
- [ ] Migration (trigger) aplicada
- [ ] Edge Function deployed
- [ ] Build realizado
- [ ] Deploy em HTTPS
- [ ] Testado com mensagem real

---

**Documentação completa:** [PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md)
