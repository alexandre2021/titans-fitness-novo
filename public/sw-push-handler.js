// Service Worker - Push Notification Handlers
// Este arquivo contém os handlers para eventos de push notification

// Handler para receber notificações push
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification recebida:', event);

  if (!event.data) {
    console.log('❌ Push sem dados');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📦 Dados completos da notificação:', JSON.stringify(data, null, 2));
    console.log('🎯 Badge path:', data.badge);
    console.log('🖼️ Icon path:', data.icon);

    const options = {
      body: data.body,
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/notification-badge.png',
      image: data.image,
      data: data.data || {},
      tag: data.tag || 'message-notification',
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200, 100, 200],
      silent: false,
      actions: data.actions || [],
      dir: 'auto',
      lang: 'pt-BR',
      timestamp: Date.now(),
    };

    console.log('✨ Options da notificação:', JSON.stringify(options, null, 2));

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('❌ Erro ao processar push notification:', error);
  }
});

// Handler para cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada:', event);

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já existe uma janela aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            // Envia mensagem para o cliente abrir o drawer de mensagens
            focusedClient.postMessage({
              type: 'OPEN_MESSAGES_DRAWER',
              data: event.notification.data
            });
            return focusedClient;
          });
        }
      }

      // Se não existe janela aberta, abre uma nova com parâmetro especial
      if (clients.openWindow) {
        // Adiciona parâmetro para indicar que veio de notificação
        const url = new URL(self.registration.scope);
        url.searchParams.set('openMessages', 'true');
        return clients.openWindow(url.toString());
      }
    })
  );
});

// Handler para fechar notificações
self.addEventListener('notificationclose', (event) => {
  console.log('Notificação fechada:', event);
  // Aqui você pode adicionar lógica para rastrear notificações fechadas
});
