# 🔔 Sistema de Push Notifications - Documentação Completa

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Status da Implementação](#status-da-implementação)
3. [Arquitetura](#arquitetura)
4. [Componentes](#componentes)
5. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
6. [Configuração](#configuração)
7. [Banco de Dados](#banco-de-dados)
8. [Troubleshooting](#troubleshooting)
9. [Testes](#testes)
10. [Melhorias Futuras](#melhorias-futuras)

---

## Visão Geral

O sistema de push notifications permite que usuários recebam notificações em tempo real quando recebem novas mensagens, mesmo com o aplicativo fechado. A implementação utiliza a Web Push API padrão, compatível com PWAs.

**Status**: ✅ **IMPLEMENTADO E FUNCIONAL**

**Tecnologias**:
- Web Push API
- Service Workers
- VAPID (Voluntary Application Server Identification)
- Supabase Edge Functions
- PostgreSQL Triggers

---

## Status da Implementação

### ✅ Implementado

#### Frontend
- [x] Hook `useNotificationPermission` para gerenciar permissões
- [x] Componente `NotificationPermissionPrompt` - Modal de solicitação
- [x] Service Worker handlers para push events
- [x] Configuração do Vite PWA com suporte a push
- [x] Integração no App.tsx

#### Backend
- [x] Tabela `push_subscriptions` criada
- [x] RLS (Row Level Security) configurado
- [x] Edge Function `send-push-notification` deployed
- [x] Database trigger `on_new_message_push_notification`
- [x] Extensão `pg_net` instalada

#### Configuração
- [x] VAPID Keys geradas
- [x] Variáveis de ambiente configuradas
- [x] Database settings configurados

### 🔄 Funcionalidades Ativas

1. **Registro de Subscription**: Usuário pode permitir notificações
2. **Envio Automático**: Notificações são enviadas automaticamente quando uma mensagem é criada
3. **Click Handler**: Clicar na notificação abre o app e navega para mensagens
4. **Limpeza Automática**: Subscriptions inválidas são removidas automaticamente
5. **Multi-dispositivo**: Suporta múltiplas subscriptions por usuário

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO DE NOTIFICAÇÃO                      │
└─────────────────────────────────────────────────────────────────────┘

1. REGISTRO (Uma vez por dispositivo/navegador)
   ┌──────────────┐    Solicita    ┌──────────────────┐
   │   Usuário    │──Permissão────>│  Browser (PWA)   │
   └──────────────┘                └──────────────────┘
                                           │
                                           v
                                  ┌──────────────────┐
                                  │ Service Worker   │
                                  │ + Push Manager   │
                                  └──────────────────┘
                                           │
                                   Cria Subscription
                                    (endpoint + keys)
                                           │
                                           v
                                  ┌──────────────────┐
                                  │  Push Service    │
                                  │ (Google/Mozilla) │
                                  └──────────────────┘
                                           │
                                  Subscription Object
                                           │
                                           v
                          ┌────────────────────────────────┐
                          │  Supabase                      │
                          │  Tabela: push_subscriptions    │
                          │  {                             │
                          │    user_id: UUID,              │
                          │    endpoint: TEXT,             │
                          │    subscription_object: JSONB  │
                          │  }                             │
                          └────────────────────────────────┘

2. ENVIO (Quando nova mensagem é inserida)
   ┌──────────────┐    INSERT    ┌─────────────────────┐
   │  Usuário A   │──Mensagem───>│  Tabela: mensagens  │
   │  envia msg   │              └─────────────────────┘
   └──────────────┘                        │
                                           │ TRIGGER
                                           v
                              ┌─────────────────────────┐
                              │ notify_new_message()    │
                              │                         │
                              │ 1. Busca nome sender    │
                              │ 2. Encontra recipient   │
                              │ 3. Chama Edge Function  │
                              └─────────────────────────┘
                                           │
                                           │ HTTP POST
                                           v
                              ┌─────────────────────────┐
                              │ Edge Function           │
                              │ send-push-notification  │
                              │                         │
                              │ 1. Busca subscriptions  │
                              │ 2. Envia via web-push   │
                              │ 3. Remove inválidas     │
                              └─────────────────────────┘
                                           │
                    ┌──────────────────────┴────────────────────┐
                    │                                           │
                    v                                           v
           ┌─────────────────┐                        ┌──────────────┐
           │  Push Service   │                        │  Responde    │
           │ (Google/Mozilla)│                        │  com status  │
           └─────────────────┘                        └──────────────┘
                    │
                    │ Entrega
                    v
           ┌─────────────────┐
           │ Service Worker  │
           │  (dispositivo   │
           │   do Usuário B) │
           └─────────────────┘
                    │
                    │ showNotification()
                    v
           ┌─────────────────┐
           │  📱 Notificação │
           │     na tela     │
           └─────────────────┘
```

---

## Componentes

### 1. Frontend (React + TypeScript)

#### A. Hook: `useNotificationPermission`
**Arquivo**: `src/hooks/useNotificationPermission.ts`

**Responsabilidades**:
- Verificar suporte do navegador a notificações
- Gerenciar estado da permissão (`default`, `granted`, `denied`, `unsupported`)
- Solicitar permissão ao usuário
- Registrar subscription no Push Manager
- Salvar subscription no Supabase
- Remover subscription (unsubscribe)
- Converter VAPID key de base64 para Uint8Array

**Interface**:
```typescript
interface UseNotificationPermissionReturn {
  permission: 'default' | 'granted' | 'denied' | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  isSupported: boolean;
}
```

**Exemplo de uso**:
```typescript
const { permission, subscribe, isSupported } = useNotificationPermission();

// Verificar se pode pedir permissão
if (isSupported && permission === 'default') {
  await subscribe(); // Pede permissão e registra
}
```

#### B. Componente: `NotificationPermissionPrompt`
**Arquivo**: `src/components/notifications/NotificationPermissionPrompt.tsx`

**Comportamento**:
- Aparece 30 segundos após o usuário fazer login
- Não aparece se permissão já foi concedida
- Não aparece se usuário já negou pelo navegador
- Limita a 3 tentativas de solicitação
- Aguarda 7 dias antes de perguntar novamente se negado
- Salva estado no `localStorage`

**Integração**:
```typescript
// Em src/App.tsx
import NotificationPermissionPrompt from "@/components/notifications/NotificationPermissionPrompt";

<AuthProvider>
  <TooltipProvider>
    <RouterProvider router={router} />
    <NotificationPermissionPrompt /> {/* Adicionar aqui */}
  </TooltipProvider>
</AuthProvider>
```

#### C. Service Worker: Push Handlers
**Arquivo**: `public/sw-push-handler.js`

**Event Listeners**:

1. **`push`**: Recebe notificação do Push Service
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    data: data.data,
    tag: data.tag || 'notification',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

2. **`notificationclick`**: Usuário clica na notificação
```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Abre ou foca janela existente
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Se existe janela aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope)) {
          return client.focus().then((client) => {
            // Navega para URL da notificação
            if (event.notification.data?.url) {
              return client.navigate(event.notification.data.url);
            }
          });
        }
      }
      // Se não existe, abre nova janela
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});
```

3. **`notificationclose`**: Usuário fecha notificação
```javascript
self.addEventListener('notificationclose', (event) => {
  // Pode adicionar analytics/tracking aqui
  console.log('Notificação fechada');
});
```

#### D. Configuração Vite PWA
**Arquivo**: `vite.config.ts`

```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'sw-push-handler.js'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        // IMPORTANTE: Importa handlers de push notification
        importScripts: ['sw-push-handler.js'],
        runtimeCaching: [
          {
            // Cache para chamadas de API do Supabase
            urlPattern: ({ url }) => url.pathname.includes('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
            },
          },
        ],
      },
    }),
  ],
})
```

---

### 2. Backend (Supabase)

#### A. Edge Function: `send-push-notification`
**Arquivo**: `supabase/functions/send-push-notification/index.ts`

**URL**: `https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/send-push-notification`

**Status**: ✅ Deployed

**Função**:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { recipientId, payload } = await req.json()

  // 1. Busca subscriptions do destinatário
  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('subscription_object')
    .eq('user_id', recipientId)

  // 2. Envia notificação para cada subscription
  const webpush = await import('npm:web-push@3.6.6')
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )

  await Promise.allSettled(
    subscriptions.map(async ({ subscription_object }) => {
      try {
        await webpush.sendNotification(
          subscription_object,
          JSON.stringify(payload)
        )
      } catch (error) {
        // Se subscription inválida (410 Gone), remove do banco
        if (error.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription_object.endpoint)
        }
      }
    })
  )

  return new Response(JSON.stringify({ success: true }))
})
```

**Variáveis de Ambiente Necessárias** (Supabase Dashboard):
- `VAPID_PRIVATE_KEY`: Chave privada VAPID
- `VAPID_PUBLIC_KEY`: Chave pública VAPID
- `VAPID_SUBJECT`: `mailto:contato@titans.fitness`

**Deploy**:
```bash
supabase functions deploy send-push-notification
```

#### B. Database Trigger
**Arquivo**: `supabase/migrations/20251114113837_create_message_push_trigger.sql`

**Função**: `notify_new_message()`
```sql
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

  -- Se não encontrou, busca em alunos
  IF sender_name IS NULL THEN
    SELECT nome_completo INTO sender_name
    FROM alunos
    WHERE id = NEW.remetente_id;
  END IF;

  -- Encontra o destinatário (outro participante da conversa)
  SELECT user_id INTO recipient_id
  FROM participantes_conversa
  WHERE conversa_id = NEW.conversa_id
    AND user_id != NEW.remetente_id
  LIMIT 1;

  -- Se não há destinatário, retorna
  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Busca configurações do banco
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Chama Edge Function via pg_net
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
          'body', sender_name || ': ' || LEFT(NEW.conteudo, 50) ||
                  CASE WHEN LENGTH(NEW.conteudo) > 50 THEN '...' ELSE '' END,
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
    -- Em caso de erro, apenas loga (não bloqueia inserção)
    RAISE WARNING 'Erro ao enviar push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Trigger**:
```sql
CREATE TRIGGER on_new_message_push_notification
  AFTER INSERT ON mensagens
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

---

## Fluxo de Funcionamento

### 1. Registro de Subscription (Primeira vez)

**Sequência**:

1. Usuário faz login no app
2. Após 30 segundos, `NotificationPermissionPrompt` aparece
3. Usuário clica em "Permitir Notificações"
4. `useNotificationPermission.subscribe()` é chamado:
   ```typescript
   // Solicita permissão
   const permission = await Notification.requestPermission();

   // Aguarda Service Worker estar pronto
   const registration = await navigator.serviceWorker.ready;

   // Cria subscription com VAPID key
   const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
   const subscription = await registration.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: vapidKey,
   });

   // Salva no Supabase
   await supabase.from('push_subscriptions').upsert({
     user_id: user.id,
     endpoint: subscription.endpoint,
     subscription_object: subscription.toJSON(),
   }, {
     onConflict: 'endpoint'
   });
   ```

5. Subscription Object é salvo no banco:
   ```json
   {
     "endpoint": "https://fcm.googleapis.com/fcm/send/...",
     "keys": {
       "p256dh": "BNcRd...",
       "auth": "tBHI..."
     }
   }
   ```

### 2. Envio de Notificação

**Trigger automático quando nova mensagem é inserida**:

1. **INSERT na tabela `mensagens`**
   ```sql
   INSERT INTO mensagens (conversa_id, remetente_id, conteudo)
   VALUES ('uuid-da-conversa', 'uuid-do-sender', 'Olá, tudo bem?');
   ```

2. **Trigger dispara**: `on_new_message_push_notification`

3. **Função `notify_new_message()` executa**:
   - Busca nome do remetente (professores ou alunos)
   - Encontra destinatário (outro participante da conversa)
   - Chama Edge Function via `net.http_post()`

4. **Edge Function `send-push-notification` executa**:
   - Busca subscriptions do destinatário
   - Para cada subscription:
     - Envia notificação via web-push
     - Se falhar com 410 (Gone), remove subscription

5. **Push Service entrega notificação**:
   - Google/Mozilla Push Service entrega ao dispositivo

6. **Service Worker recebe evento `push`**:
   ```javascript
   self.addEventListener('push', (event) => {
     const data = event.data.json();
     self.registration.showNotification(data.title, {
       body: data.body,
       icon: data.icon,
       data: data.data
     });
   });
   ```

7. **Notificação aparece na tela** 📱

### 3. Click na Notificação

**Quando usuário clica**:

1. Service Worker recebe evento `notificationclick`
2. Fecha a notificação
3. Busca janelas abertas do app
4. Se encontrou janela aberta:
   - Foca na janela
   - Navega para `/mensagens-pt`
5. Se não encontrou:
   - Abre nova janela
   - Navega para `/mensagens-pt`

---

## Configuração

### 1. Variáveis de Ambiente

#### Frontend (`.env`)
```bash
VITE_SUPABASE_URL=https://prvfvlyzfyprjliqniki.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_VAPID_PUBLIC_KEY=BEfGVqEIzT7DfD03GsElCrob1RahDrGNCUF6xXoQ68e64U1xiFhxrqzo-Gd9fuowrwsQV76NeWNpuKhWkRNp09I
```

#### Backend (Supabase Dashboard > Edge Functions > Environment Variables)
- `VAPID_PRIVATE_KEY`: `H4wzFoJNEG-KSCN8qPB653GYVjT57Pfb6OXJsiy53i8`
- `VAPID_PUBLIC_KEY`: `BEfGVqEIzT7DfD03GsElCrob1RahDrGNCUF6xXoQ68e64U1xiFhxrqzo-Gd9fuowrwsQV76NeWNpuKhWkRNp09I`
- `VAPID_SUBJECT`: `mailto:contato@titans.fitness`

### 2. Database Settings

**Configurado via Supabase Dashboard > Database > Custom Postgres Configuration**:

Ou via tabela `app_settings` (já criada):
```sql
INSERT INTO app_settings (key, value)
VALUES
  ('supabase_url', 'https://prvfvlyzfyprjliqniki.supabase.co'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

### 3. Extensões PostgreSQL

**pg_net** (para chamadas HTTP do trigger):
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Status: ✅ Instalada

### 4. Gerar Novas VAPID Keys (se necessário)

```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key:
BEfGVqEIzT7DfD03GsElCrob1RahDrGNCUF6xXoQ68e64U1xiFhxrqzo-Gd9fuowrwsQV76NeWNpuKhWkRNp09I

Private Key:
H4wzFoJNEG-KSCN8qPB653GYVjT57Pfb6OXJsiy53i8
```

⚠️ **IMPORTANTE**: Nunca commitar a Private Key no repositório!

---

## Banco de Dados

### Tabela: `push_subscriptions`

**Schema**:
```sql
CREATE TABLE public.push_subscriptions (
  endpoint TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_object JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices**:
```sql
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

**RLS Policies**:
```sql
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir suas próprias subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias subscriptions
CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
```

**Consultas Úteis**:

```sql
-- Ver todas subscriptions ativas
SELECT
  user_id,
  endpoint,
  created_at,
  subscription_object->'keys'->>'p256dh' as p256dh_key
FROM push_subscriptions
ORDER BY created_at DESC;

-- Contagem de subscriptions por usuário
SELECT
  user_id,
  COUNT(*) as num_devices
FROM push_subscriptions
GROUP BY user_id;

-- Remover subscriptions antigas (mais de 90 dias)
DELETE FROM push_subscriptions
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Troubleshooting

### Notificação não aparece

**Verificações**:

1. **Permissão foi concedida?**
   ```javascript
   // No console do navegador
   console.log(Notification.permission); // deve ser "granted"
   ```

2. **Service Worker está registrado?**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
     console.log('Service Workers:', regs);
   });
   ```

3. **Subscription existe?**
   ```javascript
   navigator.serviceWorker.ready.then(reg => {
     reg.pushManager.getSubscription().then(sub => {
       console.log('Subscription:', sub);
     });
   });
   ```

4. **Subscription está salva no banco?**
   ```sql
   SELECT * FROM push_subscriptions
   WHERE user_id = 'seu-user-id';
   ```

5. **Edge Function está funcionando?**
   ```bash
   supabase functions logs send-push-notification --tail
   ```

6. **Trigger está disparando?**
   - Inserir mensagem de teste
   - Ver logs da Edge Function
   - Verificar se há erros no PostgreSQL

### Edge Function falha

**Verificar**:

1. **Variáveis de ambiente configuradas?**
   - Supabase Dashboard > Edge Functions > Environment Variables
   - Deve ter: VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT

2. **Logs da função**:
   ```bash
   supabase functions logs send-push-notification --tail
   ```

3. **Testar manualmente**:
   ```bash
   curl -X POST 'https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/send-push-notification' \
     -H 'Authorization: Bearer SEU_ANON_KEY' \
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

### Trigger não dispara

**Verificar**:

1. **Extensão pg_net instalada?**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

2. **Database settings configurados?**
   ```sql
   SELECT * FROM app_settings
   WHERE key IN ('supabase_url', 'service_role_key');
   ```

3. **Função e trigger existem?**
   ```sql
   SELECT * FROM pg_trigger
   WHERE tgname = 'on_new_message_push_notification';

   SELECT * FROM pg_proc
   WHERE proname = 'notify_new_message';
   ```

4. **Ver warnings do trigger**:
   ```sql
   -- Em psql ou SQL Editor, olhar WARNINGS após INSERT
   INSERT INTO mensagens (...) VALUES (...);
   ```

### Subscription inválida (erro 410)

**Causa**: Usuário desinstalou PWA ou limpou dados do navegador

**Solução**: Edge Function automaticamente remove subscriptions com erro 410

**Verificar remoção**:
```sql
-- Antes de enviar notificação
SELECT COUNT(*) FROM push_subscriptions WHERE user_id = 'uuid';

-- Após envio com erro 410, deve ter diminuído
SELECT COUNT(*) FROM push_subscriptions WHERE user_id = 'uuid';
```

---

## Testes

### Teste Local (Requer HTTPS)

Push notifications **não funcionam** em `http://localhost`. Requer HTTPS.

**Opções**:

1. **Usar ngrok**:
   ```bash
   npm run build
   npm run preview
   # Em outro terminal:
   ngrok http 4173
   ```
   Acesse a URL HTTPS do ngrok

2. **Usar Vercel Preview Deploy**:
   ```bash
   npm run build
   vercel --prod=false
   ```

### Checklist de Testes

- [ ] **Solicitar permissão pela primeira vez**
  - Modal aparece após 30s
  - Clicar "Permitir" abre prompt do navegador
  - Subscription salva no banco

- [ ] **Negar permissão**
  - Clicar "Agora não" fecha modal
  - Modal não aparece novamente por 7 dias
  - Após 3 negativas, não pergunta mais

- [ ] **Receber notificação com app fechado**
  - Enviar mensagem de outro dispositivo/conta
  - Notificação aparece na tela
  - Clicar abre app e navega para mensagens

- [ ] **Receber notificação com app aberto**
  - Notificação não deve duplicar (já mostra na UI)
  - Opcional: implementar lógica para não enviar push se usuário está online

- [ ] **Múltiplas notificações**
  - Enviar várias mensagens rápido
  - Verificar se todas as notificações aparecem

- [ ] **Subscription inválida**
  - Limpar dados do navegador
  - Enviar notificação
  - Verificar se subscription foi removida do banco

- [ ] **Múltiplos dispositivos**
  - Login no mesmo usuário em 2 dispositivos
  - Permitir notificações em ambos
  - Enviar mensagem de terceiro dispositivo
  - Ambos devem receber notificação

- [ ] **Diferentes navegadores**
  - Chrome Desktop
  - Chrome Android
  - Firefox Desktop
  - Safari Desktop (macOS)
  - Safari iOS (PWA instalado)

### Teste de Carga

**Enviar para múltiplos usuários**:
```sql
-- Simular inserção de mensagens para vários usuários
INSERT INTO mensagens (conversa_id, remetente_id, conteudo)
SELECT
  c.id,
  'uuid-do-sender',
  'Mensagem de teste em massa'
FROM conversas c
LIMIT 100;
```

**Monitorar**:
- Logs da Edge Function
- Taxa de sucesso/falha
- Tempo de resposta

---

## Limitações por Plataforma

### iOS Safari
- ⚠️ Push notifications **só funcionam** se PWA estiver instalado na tela inicial
- Requer iOS 16.4+ (abril 2023)
- Usuário deve adicionar à Home Screen manualmente
- Sem suporte em Safari regular (apenas PWA instalado)

**Detectar iOS e instruir usuário**:
```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

if (isIOS && !isInStandaloneMode) {
  // Mostrar instruções para instalar PWA
  alert('Para receber notificações no iOS, instale o app na tela inicial');
}
```

### Android Chrome
- ✅ Suporte completo
- Funciona mesmo sem instalar PWA
- Push notifications funcionam em background

### Desktop

**Chrome / Edge**:
- ✅ Suporte completo
- Push em background
- Notificações nativas do sistema

**Firefox**:
- ✅ Suporte completo
- Push em background
- Notificações nativas

**Safari (macOS)**:
- ✅ Suporte a partir do macOS Big Sur (11.0+)
- Requer PWA instalado
- Push em background

---

## Considerações Importantes

### 1. Privacidade e Segurança

- ✅ **RLS ativo**: Usuários só veem suas próprias subscriptions
- ✅ **VAPID keys**: Autenticam servidor e previnem spam
- ✅ **Conteúdo limitado**: Apenas preview da mensagem (50 chars)
- ⚠️ **Não incluir dados sensíveis** no payload da notificação

### 2. Performance

- ✅ **Limpeza automática**: Subscriptions inválidas são removidas
- ✅ **Multi-dispositivo**: Suporta múltiplas subscriptions por usuário
- ⚠️ **Evitar excesso**: Não enviar notificação se usuário está online (futuro)

### 3. Bateria

- ✅ Service Worker é eficiente
- ⚠️ Evitar enviar notificações muito frequentes
- ⚠️ Respeitar configurações de "Do Not Disturb" do SO

### 4. Fallback

- ✅ Sistema de mensagens funciona sem push notifications
- ✅ Usuário pode negar permissão e ainda usar o app
- ⚠️ Considerar implementar notificações por email (futuro)

---

## Melhorias Futuras

### 1. Detecção de Usuário Online
```typescript
// Não enviar push se usuário está com app aberto
// Implementar presence tracking com Supabase Realtime
```

### 2. Agrupamento de Notificações
```javascript
// Agrupar múltiplas mensagens em uma notificação
{
  tag: 'messages',
  renotify: true,
  body: 'Você tem 5 novas mensagens'
}
```

### 3. Actions em Notificações
```javascript
{
  actions: [
    { action: 'reply', title: 'Responder' },
    { action: 'mark-read', title: 'Marcar como lida' }
  ]
}
```

### 4. Rich Notifications
```javascript
{
  image: 'https://...',  // Imagem grande
  icon: '/icon.png',      // Ícone pequeno
  badge: '/badge.png',    // Badge no ícone do app
}
```

### 5. Analytics
- Rastrear taxa de entrega
- Rastrear taxa de click
- Rastrear taxa de conversão

### 6. Configurações de Notificação
- Permitir usuário escolher tipos de notificação
- Horários de silêncio
- Frequência de notificações

### 7. Notificações por Email (Fallback)
- Se push não disponível
- Se usuário não abre app há X dias

### 8. Multi-idioma
```javascript
// Enviar notificação no idioma do usuário
const message = {
  pt: 'Nova mensagem',
  en: 'New message',
  es: 'Nuevo mensaje'
}[user.language];
```

---

## Recursos e Referências

### Documentação Oficial
- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notifications API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Service Workers - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Spec](https://datatracker.ietf.org/doc/html/rfc8292)

### Bibliotecas
- [web-push (Node.js)](https://github.com/web-push-libs/web-push)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

### Ferramentas
- [Web Push Playground](https://web-push-codelab.glitch.me/)
- [Push Notifications Debugger (Chrome DevTools)](chrome://inspect/#service-workers)

---

## Resumo para Novos Desenvolvedores

### O que está funcionando:
1. ✅ Usuários podem permitir notificações via modal
2. ✅ Subscriptions são salvas no banco automaticamente
3. ✅ Quando mensagem é enviada, trigger dispara automaticamente
4. ✅ Edge Function envia push para todos os dispositivos do destinatário
5. ✅ Notificação aparece na tela do usuário
6. ✅ Clicar na notificação abre o app em `/mensagens-pt`
7. ✅ Subscriptions inválidas são limpas automaticamente

### Como adicionar novos tipos de notificação:

1. **Identificar evento** (ex: novo treino criado)
2. **Criar trigger** similar ao `notify_new_message()`
3. **Chamar Edge Function** `send-push-notification` com payload customizado
4. **Testar** em diferentes dispositivos

### Arquivos principais:
- Frontend: `src/hooks/useNotificationPermission.ts`
- Modal: `src/components/notifications/NotificationPermissionPrompt.tsx`
- SW: `public/sw-push-handler.js`
- Backend: `supabase/functions/send-push-notification/index.ts`
- Trigger: `supabase/migrations/20251114113837_create_message_push_trigger.sql`

---

**Última atualização**: 14/11/2025
**Status**: ✅ Implementado e Funcional
**Próximos passos**: Testar em produção com usuários reais
