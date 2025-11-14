# Guia de Implementação - Push Notifications

## ✅ O que já foi implementado

### 1. Hook `useNotificationPermission` ✅
**Arquivo**: `src/hooks/useNotificationPermission.ts`

Funcionalidades implementadas:
- ✅ Verifica suporte do navegador
- ✅ Gerencia estado de permissão
- ✅ Solicita permissão ao usuário
- ✅ Registra subscription no Push Manager
- ✅ Salva subscription no Supabase
- ✅ Remove subscription (unsubscribe)
- ✅ Converte VAPID key de base64 para Uint8Array

### 2. Componente `NotificationPermissionPrompt` ✅
**Arquivo**: `src/components/notifications/NotificationPermissionPrompt.tsx`

Funcionalidades implementadas:
- ✅ Modal que solicita permissão após 30s de uso
- ✅ Não aparece se permissão já concedida
- ✅ Não aparece se usuário já negou recentemente
- ✅ Limita número de vezes que pergunta (máx 3x)
- ✅ Aguarda 7 dias antes de perguntar novamente se negado
- ✅ Interface amigável explicando benefícios

### 3. Documentação ✅
**Arquivos**:
- `src/docs/push-notifications.md` - Arquitetura completa
- `src/docs/push-notifications-implementation-guide.md` - Este guia

---

## 🔲 O que falta implementar

### 1. Service Worker (Configuração no vite.config.ts)

**Arquivo a modificar**: `vite.config.ts`

**O que adicionar**:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        // ADICIONAR: Runtime caching para APIs
        runtimeCaching: [
          {
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
      devOptions: {
        enabled: false,
        type: 'module',
      },
      manifest: {
        name: 'Titans Fitness',
        short_name: 'Titans',
        description: 'Aplicativo de gestão de treinos para professores e alunos.',
        theme_color: '#AA1808',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      // ADICIONAR: Injetar código customizado no service worker
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
```

**Depois, criar arquivo**: `public/sw-push-handler.js`

```javascript
// Handler para eventos push
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    data: data.data,
    tag: data.tag || 'notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handler para cliques em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já existe uma janela aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus().then((client) => {
            // Navega para a URL da notificação se disponível
            if (event.notification.data && event.notification.data.url) {
              return client.navigate(event.notification.data.url);
            }
          });
        }
      }

      // Se não existe janela aberta, abre uma nova
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return clients.openWindow(self.registration.scope + url);
      }
    })
  );
});
```

### 2. Tabela no Supabase ✅ JÁ EXISTE

**Tabela atual:**

```sql
CREATE TABLE public.push_subscriptions (
  endpoint TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_object JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Campos:**
- `endpoint` (TEXT, PK) - O endpoint único da subscription
- `user_id` (UUID, FK) - ID do usuário
- `subscription_object` (JSONB) - Objeto completo da subscription com keys
- `created_at` (TIMESTAMPTZ) - Data de criação

**RLS Policies necessárias** (verificar se existem):

```sql
-- Habilitar RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias subscriptions
CREATE POLICY IF NOT EXISTS "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir suas próprias subscriptions
CREATE POLICY IF NOT EXISTS "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias subscriptions
CREATE POLICY IF NOT EXISTS "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias subscriptions
CREATE POLICY IF NOT EXISTS "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. Edge Function para enviar notificações

**Criar pasta e arquivo**: `supabase/functions/send-push-notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@titans.fitness'

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

serve(async (req) => {
  try {
    const { recipientId, payload }: { recipientId: string; payload: PushPayload } = await req.json()

    // Cria cliente Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca subscriptions do destinatário
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription_object')
      .eq('user_id', recipientId)

    if (error) {
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found for user' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Envia notificação para cada subscription
    const results = await Promise.allSettled(
      subscriptions.map(async ({ subscription_object }) => {
        const sub = subscription_object as PushSubscription

        // Prepara o payload
        const message = JSON.stringify(payload)

        // Importa web-push (necessário instalar como dependência do Deno)
        const webpush = await import('npm:web-push@3.6.6')

        webpush.setVapidDetails(
          VAPID_SUBJECT,
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY
        )

        try {
          await webpush.sendNotification(sub, message)
          return { success: true, endpoint: sub.endpoint }
        } catch (error: any) {
          // Se a subscription é inválida (410 Gone), remove do banco
          if (error.statusCode === 410) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('user_id', recipientId)
              .eq('endpoint', sub.endpoint)
          }
          throw error
        }
      })
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent',
        succeeded,
        failed,
        total: subscriptions.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### 4. Database Trigger para mensagens

**Adicionar à migration**: `supabase/migrations/YYYYMMDDHHMMSS_create_message_push_trigger.sql`

```sql
-- Função que será chamada quando uma nova mensagem for criada
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
BEGIN
  -- Busca o nome do remetente
  SELECT nome_completo INTO sender_name
  FROM professores
  WHERE id = NEW.sender_id;

  -- Se não encontrou em professores, busca em alunos
  IF sender_name IS NULL THEN
    SELECT nome_completo INTO sender_name
    FROM alunos
    WHERE id = NEW.sender_id;
  END IF;

  -- Determina o ID do destinatário
  IF NEW.sender_id = NEW.professor_id THEN
    recipient_id := NEW.aluno_id;
  ELSE
    recipient_id := NEW.professor_id;
  END IF;

  -- Chama a Edge Function para enviar push notification
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'recipientId', recipient_id,
        'payload', jsonb_build_object(
          'title', 'Nova mensagem',
          'body', sender_name || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
          'icon', '/pwa-192x192.png',
          'badge', '/pwa-192x192.png',
          'data', jsonb_build_object(
            'url', '/mensagens-pt',
            'messageId', NEW.id,
            'senderId', NEW.sender_id
          )
        )
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que dispara a função
CREATE TRIGGER on_new_message_push_notification
  AFTER INSERT ON mensagens
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

### 5. Variáveis de Ambiente

**Adicionar ao arquivo `.env`**:

```bash
# Gerar com: npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

**Adicionar no Supabase (Project Settings > Edge Functions > Environment Variables)**:

```
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_SUBJECT=mailto:contato@titans.fitness
```

### 6. Integração no App

**Arquivo a modificar**: `src/App.tsx`

**Adicionar importação**:
```typescript
import NotificationPermissionPrompt from "@/components/notifications/NotificationPermissionPrompt";
```

**Adicionar no JSX** (dentro do AuthProvider):
```typescript
<AuthProvider>
  <TooltipProvider>
    <Sonner position="top-center" richColors theme="light" />
    <RouterProvider router={router} />
    <PwaUpdateNotification />
    <PwaInstallPrompt />
    {/* ADICIONAR AQUI */}
    <NotificationPermissionPrompt />
  </TooltipProvider>
</AuthProvider>
```

---

## 📝 Passos para Finalizar a Implementação

1. **Gerar VAPID Keys**
   ```bash
   npx web-push generate-vapid-keys
   ```
   - Copiar Public Key para `.env` (`VITE_VAPID_PUBLIC_KEY`)
   - Copiar Private Key para Supabase Edge Functions env vars

2. **Modificar vite.config.ts**
   - Adicionar configuração de service worker conforme acima

3. **Criar arquivo sw-push-handler.js**
   - Criar em `public/sw-push-handler.js`
   - Copiar código acima

4. **Criar migrations no Supabase**
   - Criar tabela push_subscriptions
   - Criar trigger para mensagens

5. **Criar Edge Function**
   - Criar pasta `supabase/functions/send-push-notification`
   - Adicionar código da function
   - Deploy: `supabase functions deploy send-push-notification`

6. **Adicionar componente no App.tsx**
   - Importar NotificationPermissionPrompt
   - Adicionar no JSX

7. **Testar**
   - Build da aplicação: `npm run build`
   - Deploy em ambiente HTTPS
   - Testar permissão
   - Enviar mensagem de teste
   - Verificar recebimento de notificação

---

## 🧪 Como Testar

### Teste Local (Requer HTTPS)

1. Build da aplicação
   ```bash
   npm run build
   npm run preview
   ```

2. Usar ngrok ou similar para HTTPS
   ```bash
   ngrok http 4173
   ```

3. Abrir URL do ngrok no navegador

### Teste em Produção

1. Deploy na Vercel
2. Abrir aplicação
3. Aguardar 30s para prompt aparecer
4. Aceitar permissão
5. Enviar mensagem de teste
6. Verificar notificação

---

## 🐛 Troubleshooting

### Notificação não aparece

**Possíveis causas**:
- Service worker não registrado
- VAPID keys incorretas
- Subscription não salva no banco
- Edge function com erro
- Permissão negada pelo usuário

**Como debugar**:
```javascript
// No console do navegador
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub)
  })
})
```

### Subscription não salva

**Verificar**:
- Usuário está logado
- VAPID_PUBLIC_KEY está configurada
- Tabela existe no Supabase
- RLS policies estão corretas

### Edge Function falha

**Verificar logs**:
```bash
supabase functions logs send-push-notification
```

**Verificar env vars**:
- VAPID_PRIVATE_KEY
- VAPID_PUBLIC_KEY
- VAPID_SUBJECT

---

## 📚 Recursos Adicionais

- [Web Push Protocol](https://web.dev/push-notifications/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID](https://blog.mozilla.org/services/2016/08/23/sending-vapid-identified-webpush-notifications-via-mozillas-push-service/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
