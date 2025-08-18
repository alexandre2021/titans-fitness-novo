
O tamanho para título de página é text-3xl no Tailwind CSS corresponde a um tamanho de fonte de 1.875rem, que é equivalente a 30px. Negrito

O tamanho para títulos nos cardas é text-xl do Tailwind CSS equivale a 1.25rem, que normalmente corresponde a 20 pixels (px)

🎯 Estamos usando botão CUSTOMIZADO para Editar!
🎯 src\components\perfil\PerfilTabs.tsx
🎯 src\components\perfil\AvatarSection.tsx

🚫 Por que NÃO funcionava antes:

shadcn/ui Button component tem CSS interno que sobrescreve:

css/* CSS interno do Button */
.button-icon {
  height: 1rem; /* força h-4 */
  width: 1rem;  /* força w-4 */
}

CSS Specificity - o CSS do componente tinha prioridade maior que nossas classes Tailwind
Design system constraints - shadcn/ui limita tamanhos para consistência

✅ Por que funciona AGORA:

Botão HTML nativo (<button>) - sem CSS interno limitante
Tailwind direto - nossas classes têm prioridade total
Controle completo - podemos definir qualquer tamanho

🔧 Diferença técnica:
jsx// ANTES - CSS interno limitava
<Button size="icon">
  <Edit className="h-6 w-6" /> {/* Ignorado pelo CSS interno */}
</Button>

// AGORA - Controle total
<button className="...">
  <Edit className="h-6 w-6" /> {/* Funciona perfeitamente */}
</button>
💡 Lição aprendida:
Quando componentes de design system limitam customização, criar um componente customizado dá total controle!
Por isso a solução responsiva funcionou - fugimos das limitações do shadcn/ui! 


🎯 Drawer + Modal responsiva
🎯 src\components\perfil\PerfilTabs.tsx
🎯 src\components\perfil\AvatarSection.tsx

📱 Mobile (< 768px):

✅ Drawer que desliza de baixo para cima
✅ Ocupa quase toda tela (max-h-[90vh])
✅ Melhor UX para touch/mobile

💻 Desktop (≥ 768px):

✅ Modal tradicional no centro
✅ Overlay escuro de fundo
✅ UX familiar para desktop

🔧 Implementação:
jsxconst ResponsiveModal = ({ open, onOpenChange, title, children }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <Drawer>...</Drawer>; // Mobile
  }
  
  return <Dialog>...</Dialog>; // Desktop
};
🚀 Vantagens:

Automaticamente responsivo - detecta tamanho da tela
UX otimizada para cada dispositivo
Código reutilizável - mesmo componente para ambos