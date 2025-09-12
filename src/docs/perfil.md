# 👤 Sistema de Perfil de Usuário

Este documento descreve a arquitetura e as principais funcionalidades do sistema de perfil de usuário, que é compartilhado entre Alunos e Personal Trainers.

---

## 📂 Arquitetura de Arquivos

A funcionalidade de perfil é modular e reutiliza componentes para garantir consistência.

```
src/
├── pages/
│   ├── PerfilAluno.tsx                # Página principal do perfil do Aluno
│   └── PerfilPT.tsx                   # Página principal do perfil do PT
│
├── components/
│   └── perfil/
│       ├── AvatarSection.tsx          # 🖼️ Componente da foto e nome (reutilizado)
│       ├── PerfilTabs.tsx             # 📑 Abas de informações do PT
│       ├── AlunoPerfilTabs.tsx        # 📑 Abas de informações do Aluno
│       ├── EditPessoalModal.tsx       # ✏️ Modal de edição (pessoal)
│       ├── EditProfissionalModal.tsx  # ✏️ Modal de edição (profissional)
│       ├── EditRedesSociaisModal.tsx  # ✏️ Modal de edição (redes sociais)
│       ├── EditAlunoModal.tsx         # ✏️ Modal de edição (aluno)
│       └── PasswordChangeSection.tsx  # 🔑 Seção para troca de senha
│
├── hooks/
│   ├── useAlunoProfile.ts             # 🎣 Hook para dados do perfil do Aluno
│   └── usePTProfile.ts                # 🎣 Hook para dados do perfil do PT
│
└── types/
    └── ...                            # Tipos de dados (Aluno, PersonalTrainer)
```

---

## ✨ Funcionalidade Principal: Edição de Perfil com Modais Responsivos

A edição de perfil foi projetada para oferecer a melhor experiência em qualquer dispositivo, utilizando um padrão de modal responsivo.

**Onde é implementado:**
-   `src/components/perfil/AvatarSection.tsx` (aciona o modal)
-   `src/components/perfil/PerfilTabs.tsx` (aciona os modais)
-   `src/components/perfil/Edit...Modal.tsx` (todos os modais de edição)

### Como Funciona:

O sistema detecta o tamanho da tela e adapta a interface de edição:

📱 **Mobile (< 768px):**
-   Ao clicar em "Editar", um **Drawer** desliza da parte inferior da tela.
-   Ocupa a maior parte do espaço vertical (`max-h-[90vh]`), ideal para uso com o polegar.
-   A navegação é intuitiva e otimizada para telas de toque.

💻 **Desktop (≥ 768px):**
-   Ao clicar em "Editar", um **Dialog** (modal) tradicional aparece no centro da tela.
-   Um overlay escuro foca a atenção do usuário no formulário de edição.
-   A experiência é familiar e produtiva para usuários de mouse e teclado.

### Implementação:

O padrão é implementado através de um componente `ResponsiveModal` que encapsula a lógica de renderização condicional.

```typescriptreact
// Exemplo de uso em um componente de edição
const EditPessoalModal = ({ open, onOpenChange, ... }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {/* Conteúdo do formulário para mobile */}
      </Drawer>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Conteúdo do formulário para desktop */}
    </Dialog>
  );
};
```

### 🚀 Vantagens:

-   **UX Otimizada:** A interface se adapta perfeitamente ao dispositivo do usuário.
-   **Código Reutilizável:** A mesma lógica de formulário e validação é usada em ambas as versões.
-   **Consistência Visual:** Mantém a identidade visual da plataforma em todos os cenários.

---

## 🧠 Gerenciamento de Estado com Hooks

A busca e atualização dos dados de perfil são centralizadas em hooks customizados para cada tipo de usuário.

-   **`usePTProfile.ts`**:
    -   Busca os dados do Personal Trainer logado na tabela `personal_trainers`.
    -   Fornece funções para atualizar as informações (pessoais, profissionais, redes sociais).
    -   Gerencia os estados de `loading` e `error`.

-   **`useAlunoProfile.ts`**:
    -   Busca os dados do Aluno logado na tabela `alunos`.
    -   Fornece funções para atualizar as informações básicas.
    -   Gerencia os estados de `loading` e `error`.

Este desacoplamento da lógica de dados da UI torna os componentes mais limpos e focados em sua responsabilidade de renderização.