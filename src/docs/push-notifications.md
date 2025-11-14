# Implementação de Push Notifications para Mensagens

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUXO DE NOTIFICAÇÃO                       │
└─────────────────────────────────────────────────────────────────┘

1. REGISTRO (Uma vez por dispositivo)
   ┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
   │   Browser   │─────>│Service Worker│─────>│  Push Service   │
   │             │      │              │      │ (Google/Apple)  │
   └─────────────┘      └──────────────┘      └─────────────────┘
         │                                             │
         │         Subscription Object                 │
         │          (endpoint + keys)                  │
         └──────────────────┬───────────────────────────┘
                            │
                            v
                    ┌───────────────┐
                    │   Supabase    │
                    │ push_         │
                    │ subscriptions │
                    └───────────────┘

2. ENVIO (Quando nova mensagem é criada)
   ┌──────────────┐    Trigger    ┌────────────────────┐
   │   Mensagem   │──────────────>│  Database Trigger  │
   │   Nova       │               │  (on_new_message)  │
   └──────────────┘               └────────────────────┘
                                           │
                                           v
                                  ┌────────────────────┐
                                  │   Edge Function    │
                                  │  send-push-        │
                                  │  notification      │
                                  └────────────────────┘
                                           │
                    ┌──────────────────────┴───────────────────┐
                    │                                          │
                    v                                          v
            ┌───────────────┐                         ┌──────────────┐
            │ Push Service  │                         │   Supabase   │
            │ (Google/Apple)│                         │  (buscar     │
            └───────────────┘                         │  subscription)│
                    │                                 └──────────────┘
                    v
           ┌─────────────────┐
           │ Service Worker  │
           │  (no dispositivo│
           │   do usuário)   │
           └─────────────────┘
                    │
                    v
           ┌─────────────────┐
           │   Notificação   │
           │    na tela      │
           └─────────────────┘
```

## Componentes da Implementação

### 1. Frontend (React)

#### A. Hook `useNotificationPermission`
**Localização**: `src/hooks/useNotificationPermission.ts`

Responsável por:
- Verificar suporte a notificações no navegador
- Solicitar permissão do usuário
- Registrar/desregistrar subscription no Push Service
- Salvar subscription no Supabase
- Gerenciar estado da permissão

#### B. Componente `NotificationPermissionPrompt`
**Localização**: `src/components/notifications/NotificationPermissionPrompt.tsx`

Responsável por:
- Exibir modal solicitando permissão
- Explicar benefícios das notificações
- Disparar o processo de registro

### 2. Service Worker

#### Modificações no `vite.config.ts`
Adicionar suporte a:
- Event listener para `push` events
- Exibição de notificações
- Click handler para notificações

### 3. Backend (Supabase)

#### A. Tabela `push_subscriptions`
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription->>'endpoint')
);
```

#### B. Edge Function `send-push-notification`
**Localização**: `supabase/functions/send-push-notification/index.ts`

Responsável por:
- Receber dados da mensagem
- Buscar subscriptions do destinatário
- Enviar notificação push via Web Push API
- Remover subscriptions inválidas

#### C. Database Trigger
Trigger que dispara a Edge Function quando uma nova mensagem é criada.

## Fluxo Detalhado

### Registro de Subscription (Primeira vez)

1. Usuário entra no app
2. `NotificationPermissionPrompt` verifica se já tem permissão
3. Se não, exibe modal explicativo
4. Usuário clica "Permitir"
5. `useNotificationPermission` executa:
   ```typescript
   // Solicita permissão
   const permission = await Notification.requestPermission()

   // Registra service worker (se ainda não estiver)
   const registration = await navigator.serviceWorker.ready

   // Cria subscription
   const subscription = await registration.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: VAPID_PUBLIC_KEY
   })

   // Salva no Supabase
   await supabase.from('push_subscriptions').insert({
     user_id: user.id,
     subscription: subscription.toJSON()
   })
   ```

### Envio de Notificação

1. Usuário A envia mensagem para Usuário B
2. Mensagem é inserida na tabela `mensagens`
3. Database trigger dispara
4. Edge Function é chamada com dados da mensagem
5. Edge Function:
   - Busca subscription do Usuário B
   - Verifica se B está online (opcional)
   - Se offline, envia push notification:
   ```typescript
   await webpush.sendNotification(
     subscription,
     JSON.stringify({
       title: 'Nova mensagem',
       body: `${sender.name}: ${message.content}`,
       icon: '/pwa-192x192.png',
       badge: '/pwa-192x192.png',
       data: {
         url: '/mensagens-pt',
         messageId: message.id
       }
     })
   )
   ```
6. Push Service entrega para o dispositivo
7. Service Worker recebe e exibe notificação

### Quando usuário clica na notificação

1. Service Worker intercepta o click event
2. Abre/foca a janela do app
3. Navega para a página de mensagens
4. Marca notificação como lida

## VAPID Keys

VAPID (Voluntary Application Server Identification) é necessário para autenticar o servidor.

**Geração**:
```bash
npx web-push generate-vapid-keys
```

**Armazenamento**:
- Public Key: Variável de ambiente no frontend
- Private Key: Variável de ambiente no Supabase (Edge Function)

## Considerações Importantes

### 1. Permissões
- Usuário DEVE conceder permissão explicitamente
- Permissão pode ser revogada a qualquer momento
- Respeitar escolha do usuário (não insistir demais)

### 2. Limpeza de Subscriptions
- Subscriptions podem expirar
- Device pode trocar de navegador
- Implementar limpeza de subscriptions inválidas

### 3. Bateria e Performance
- Não enviar notificações em excesso
- Agrupar notificações quando possível
- Respeitar configurações de Do Not Disturb

### 4. Privacidade
- Não incluir conteúdo sensível no corpo da notificação
- Apenas informar que há uma nova mensagem
- Conteúdo completo apenas quando abrir o app

### 5. Fallback
- Se notificações não suportadas, manter polling
- Se permissão negada, respeitar e não perguntar novamente
- Oferecer alternativas (email, SMS)

## Teste

### Ambiente de Desenvolvimento
- Push notifications não funcionam em `localhost` HTTP
- Usar HTTPS (pode ser com ngrok ou similar)
- Ou testar em build de produção

### Checklist de Testes
- [ ] Solicitar permissão primeira vez
- [ ] Negar permissão
- [ ] Aceitar permissão
- [ ] Receber notificação com app fechado
- [ ] Receber notificação com app aberto (não deve duplicar)
- [ ] Clicar na notificação abre app
- [ ] Múltiplas notificações agrupadas
- [ ] Limpar subscriptions inválidas
- [ ] Funciona em diferentes navegadores
- [ ] Funciona em mobile (iOS Safari, Chrome Android)

## Limitações por Plataforma

### iOS Safari
- Suporte limitado a PWAs
- Push notifications só funcionam se app instalado na tela inicial
- Requer iOS 16.4+

### Android Chrome
- Suporte completo
- Funciona mesmo sem instalar PWA

### Desktop
- Chrome, Edge, Firefox: Suporte completo
- Safari: Suporte a partir do macOS Big Sur

## Próximos Passos

1. Implementar componentes básicos
2. Configurar Supabase (tabela + trigger + edge function)
3. Gerar VAPID keys
4. Testar em ambiente de desenvolvimento
5. Deploy e teste em produção
6. Monitorar métricas de entrega
