# 🧹 Como Limpar Cache do PWA no Android

## **Método 1: Limpar cache do navegador (RECOMENDADO)**

### Chrome/Edge no Android:

1. **Abra o navegador** onde o PWA está instalado
2. Vá em **Configurações** (⋮)
3. **Privacidade e segurança** > **Limpar dados de navegação**
4. Selecione:
   - ✅ Imagens e arquivos em cache
   - ✅ Dados de sites
5. Período: **Última hora** ou **Todos os períodos**
6. Clique em **Limpar dados**

---

## **Método 2: Limpar dados do app PWA (MAIS EFETIVO)**

Se o PWA foi "Instalado" (aparece como app na home):

1. Vá em **Configurações do Android**
2. **Apps** > Encontre o app **"Titans Fitness"**
3. **Armazenamento**
4. Clique em **Limpar cache**
5. Clique em **Limpar dados** (⚠️ vai deslogar)

---

## **Método 3: Desinstalar e reinstalar (GARANTIDO)**

1. **Desinstale o PWA**:
   - Pressione e segure o ícone do app
   - Arraste para "Desinstalar" ou clique em "Remover"

2. **Limpe o cache do navegador** (Método 1)

3. **Reinstale o PWA**:
   - Abra o site no navegador
   - Menu (⋮) > **Instalar app** ou **Adicionar à tela inicial**

---

## **Método 4: Forçar atualização do Service Worker (VIA DEVTOOLS)**

Se tiver acesso ao DevTools remoto:

1. No **desktop**, abra Chrome
2. Digite: `chrome://inspect#devices`
3. Conecte o celular via USB (com depuração ativada)
4. Clique em **inspect** no app
5. Vá em **Application** > **Service Workers**
6. Clique em **Unregister**
7. Recarregue a página

---

## **Verificar se o cache foi limpo:**

Após limpar, envie uma nova notificação de teste e veja se o ícone mudou.

Se **ainda** aparecer o quadrado branco depois de tudo isso, o problema pode ser:
- O Android está gerando o badge automaticamente do ícone colorido
- Precisamos criar um badge PNG monocromático específico

---

## **Próximos passos se não resolver:**

Me avise e eu vou criar um badge PNG adequado usando o HTML que preparei.
