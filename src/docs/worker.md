Vendo seu package.json, você já utiliza o vite-plugin-pwa, que gera e gerencia esse Service Worker para você.

    "vite-plugin-pwa": "^1.0.3"

O Service Worker, por padrão, já verifica se há uma nova versão em determinados momentos (como na navegação ou ao iniciar).


1. O Service Worker (seja por verificação periódica ou no início da navegação) detecta uma nova versão e a instala em segundo plano.
2. O Service Worker emite um evento para a sua aplicação, informando que uma atualização está pronta para ser ativada.
3. Sua aplicação React recebe esse evento e exibe um componente visual para o usuário, como um "toast" ou um banner, com uma mensagem do tipo: "Uma nova versão está disponível!" e um botão "Atualizar agora".
4. Apenas quando o usuário clica nesse botão, você executa o comando para que o novo Service Worker assuma o controle e recarregue a página.

O vite-plugin-pwa já cria o worker preciso só configurar a estratégia de atualização para que o plugin emita os eventos de nova versão e um componente no react que escutará esses eventos e exibirá o toast

O vite-plugin-pwa no vite.config.ts gera o arquivo Service Worker 'sw.js' no build, em vite.config.ts já tenho a linha registerType: 'prompt' é a instrução fundamental que diz ao Service Worker gerado: "Quando você encontrar uma nova versão, não atualize automaticamente. Em vez disso, avise a aplicação (o React) para que ela possa perguntar (prompt) ao usuário o que fazer". No react crio um componente 'PwaUpdateNotification.tsx' e coloco no topo da árvore de componentes que é o App.tsx. O vite-plugin-pwa gera um módulo virtual que é importado no 'PwaUpdateNotification.tsx', ele dá um hook customizado chamado userRegisterSW, ele faz a ponte entre o worker e o react. 

O seu componente PwaUpdateNotification.tsx é quem tem a responsabilidade de, ativamente, verificar se há atualizações. Ele pede para o Worker ver no servidor se existe uma nova versão do código. Se o worker encontra alguma mudança ele baixa e instala a nova versão do PWA em segundo plano. O hook 'useRegisterSW' (uma função dentro do pacote vite-plugin-pwa) fica sempre ouvindo se existe uma atualização no segundo plano pela configuração registerType: 'prompt', o hook não recarrega a página. Em vez disso, ele atualiza seu próprio estado interno, mudando o valor de needRefresh para true. O PwaUpdateNotification.tsx fica houvindo se needRefresh mudou para true e se sim exibe o toast


'O vite-plugin-pwa cria de um lado o worker e do lado react essa função useRegisterSW então na verdade o plugin que organiza tudo entre esses dois mundos'


O cache do sw.js é o inimigo número um das atualizações de PWA. A solução é garantir que ele seja servido com o header Cache-Control: no-cache, algo que você pode e deve verificar no ambiente de produção.

Foi adicionado a configuração de headers ao seu vercel.json existente:

      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ]
}
