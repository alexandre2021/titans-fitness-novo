// Service Worker - Push Notification Handlers
// Este arquivo contém os handlers para eventos de push notification

// Handler para receber notificações push
self.addEventListener('push', (event) => {
  console.log('Push notification recebida:', event);

  if (!event.data) {
    console.log('Push sem dados');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Dados da notificação:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/pwa-512x512.png', // Ícone grande e colorido (notificação expandida)
      badge: data.badge || '/notification-badge.svg', // Badge monocromático para barra superior
      image: data.image, // Imagem grande (opcional)
      data: data.data || {},
      tag: data.tag || 'message-notification',
      renotify: true, // Re-notifica se já existe uma com a mesma tag
      requireInteraction: false,
      vibrate: [200, 100, 200, 100, 200], // Padrão de vibração personalizado
      silent: false,
      actions: data.actions || [],
      // Propriedades visuais adicionais
      dir: 'auto',
      lang: 'pt-BR',
      timestamp: Date.now(),
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Erro ao processar push notification:', error);
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

      // Se não existe janela aberta, abre uma nova na home
      if (clients.openWindow) {
        // Abre na rota principal (index-professor ou index-aluno)
        // O MessageDrawer pode ser aberto depois via postMessage
        return clients.openWindow(self.registration.scope);
      }
    })
  );
});

// Handler para fechar notificações
self.addEventListener('notificationclose', (event) => {
  console.log('Notificação fechada:', event);
  // Aqui você pode adicionar lógica para rastrear notificações fechadas
});
